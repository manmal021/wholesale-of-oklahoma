/**
 * emailService.ts
 *
 * Transactional Email Dispatcher for Wholesale of Oklahoma.
 * Sends notifications, confirmation emails, single-use activation links,
 * and password reset emails.
 *
 * Features:
 *  - Native REST integration with Resend / SendGrid / custom webhook providers
 *  - Persistent delivery audit logging in storage/email_outbox.log
 *  - High-resilience: email failures never break database transactions
 *  - Beautiful, responsive B2B HTML email layouts
 */

import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import {
  DEFAULT_FULFILLMENT_CONFIG,
  type WholesaleApplicationRecord,
  type OrderRecord,
  type OrderItemRecord,
} from './databaseStore.js';
import { applicationPdfService } from './applicationPdfService.js';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const EMAIL_LOG_FILE = path.join(STORAGE_DIR, 'email_outbox.log');

export const ADMIN_EMAIL =
  process.env.APPLICATION_NOTIFICATION_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  'order2wholesaleofoklahoma@gmail.com';

function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (!isProd && process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.APP_URL && !process.env.APP_URL.includes('localhost')) return process.env.APP_URL.replace(/\/$/, '');
  return 'https://www.wholesaleofoklahoma.com';
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  subject: string;
  provider?: string;
  error?: string;
  queuedOutbox?: boolean;
}

class EmailService {
  private logEmailDelivery(data: {
    to: string;
    subject: string;
    status: 'DELIVERED_EXTERNAL' | 'QUEUED_OUTBOX' | 'FAILED';
    provider?: string;
    error?: string;
    actionUrl?: string;
    attachments?: string[];
    body?: string;
    text?: string;
    html?: string;
  }): void {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const entry = {
        timestamp: new Date().toISOString(),
        ...data,
      };
      fs.appendFileSync(EMAIL_LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err: any) {
      console.warn('[EmailService] Could not append to outbox log:', err.message);
    }
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    actionUrl?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<EmailDispatchResult> {
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      'Wholesale of Oklahoma <applications@wholesaleofoklahoma.com>';

    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;

    const attachmentNames = options.attachments?.map((a) => a.filename);

    // 1. Send via official Resend SDK if key is present
    if (resendApiKey && resendApiKey.startsWith('re_')) {
      try {
        console.log(`[EmailService] 📤 Dispatching email to ${options.to} via Resend SDK...`);
        const resend = new Resend(resendApiKey);

        const emailPayload: any = {
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        };

        if (options.attachments && options.attachments.length > 0) {
          emailPayload.attachments = options.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content, 'base64'),
          }));
        }

        const { data, error } = await resend.emails.send(emailPayload);

        if (!error && data?.id) {
          this.logEmailDelivery({
            to: options.to,
            subject: options.subject,
            status: 'DELIVERED_EXTERNAL',
            provider: 'resend',
            actionUrl: options.actionUrl,
            attachments: attachmentNames,
          });
          console.log(`[EmailService] ✅ Delivered email to ${options.to} via Resend (ID: ${data.id})`);
          return {
            success: true,
            messageId: data.id,
            recipient: options.to,
            subject: options.subject,
            provider: 'resend',
          };
        } else {
          const errMsg = error?.message || 'Resend API returned failure';
          console.error(`[EmailService] ❌ Resend API rejected dispatch to ${options.to}:`, errMsg);
          this.logEmailDelivery({
            to: options.to,
            subject: options.subject,
            status: 'FAILED',
            provider: 'resend',
            error: errMsg,
            actionUrl: options.actionUrl,
            attachments: attachmentNames,
          });
          return {
            success: false,
            error: errMsg,
            recipient: options.to,
            subject: options.subject,
            provider: 'resend',
          };
        }
      } catch (err: any) {
        console.error(`[EmailService] ❌ Resend dispatch network error (${err.message})`);
        this.logEmailDelivery({
          to: options.to,
          subject: options.subject,
          status: 'FAILED',
          provider: 'resend',
          error: err.message,
          actionUrl: options.actionUrl,
          attachments: attachmentNames,
        });
        return {
          success: false,
          error: err.message,
          recipient: options.to,
          subject: options.subject,
          provider: 'resend',
        };
      }
    }

    // 2. Send via SendGrid REST API if key is present
    if (sendgridApiKey && sendgridApiKey.startsWith('SG.')) {
      try {
        console.log(`[EmailService] 📤 Dispatching email to ${options.to} via SendGrid...`);
        const fromEmailMatch = fromAddress.match(/<([^>]+)>/) || [null, fromAddress];
        const senderEmail = fromEmailMatch[1] || fromAddress;
        const senderName = fromAddress.includes('<') ? fromAddress.split('<')[0].trim() : 'Wholesale of Oklahoma';

        const payload: Record<string, any> = {
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: senderEmail, name: senderName },
          subject: options.subject,
          content: [
            { type: 'text/plain', value: options.text },
            { type: 'text/html', value: options.html },
          ],
        };

        if (options.attachments && options.attachments.length > 0) {
          payload.attachments = options.attachments.map((att) => ({
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
            filename: att.filename,
            type: att.contentType || 'application/pdf',
            disposition: 'attachment',
          }));
        }

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 202) {
          const msgId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
          this.logEmailDelivery({
            to: options.to,
            subject: options.subject,
            status: 'DELIVERED_EXTERNAL',
            provider: 'sendgrid',
            actionUrl: options.actionUrl,
            attachments: attachmentNames,
          });
          console.log(`[EmailService] ✅ Delivered email to ${options.to} via SendGrid (ID: ${msgId})`);
          return { success: true, messageId: msgId, recipient: options.to, subject: options.subject, provider: 'sendgrid' };
        } else {
          const errText = await response.text();
          console.error(`[EmailService] ❌ SendGrid API rejected dispatch to ${options.to}:`, errText);
          this.logEmailDelivery({
            to: options.to,
            subject: options.subject,
            status: 'FAILED',
            provider: 'sendgrid',
            error: errText,
            actionUrl: options.actionUrl,
            attachments: attachmentNames,
          });
          return { success: false, error: errText, recipient: options.to, subject: options.subject, provider: 'sendgrid' };
        }
      } catch (err: any) {
        console.error(`[EmailService] ❌ SendGrid dispatch network error (${err.message})`);
        this.logEmailDelivery({
          to: options.to,
          subject: options.subject,
          status: 'FAILED',
          provider: 'sendgrid',
          error: err.message,
          actionUrl: options.actionUrl,
          attachments: attachmentNames,
        });
        return { success: false, error: err.message, recipient: options.to, subject: options.subject, provider: 'sendgrid' };
      }
    }

    // 3. Send via SMTP / Gmail App Password if configured
    if (smtpHost || (smtpUser && smtpPass)) {
      try {
        console.log(`[EmailService] 📤 Dispatching email to ${options.to} via SMTP...`);
        let transporter: any;

        if (smtpUser && (smtpUser.endsWith('@gmail.com') || process.env.GMAIL_USER || process.env.GMAIL_APP_PASSWORD)) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
        } else {
          transporter = nodemailer.createTransport({
            host: smtpHost || 'localhost',
            port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
          });
        }

        const mailOpts: Record<string, any> = {
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        };

        if (options.attachments && options.attachments.length > 0) {
          mailOpts.attachments = options.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/pdf',
          }));
        }

        const info = await transporter.sendMail(mailOpts);

        this.logEmailDelivery({
          to: options.to,
          subject: options.subject,
          status: 'DELIVERED_EXTERNAL',
          provider: 'smtp',
          actionUrl: options.actionUrl,
          attachments: attachmentNames,
        });
        console.log(`[EmailService] ✅ Delivered email to ${options.to} via SMTP (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId, recipient: options.to, subject: options.subject, provider: 'smtp' };
      } catch (err: any) {
        console.error(`[EmailService] ❌ SMTP dispatch error (${err.message})`);
        this.logEmailDelivery({
          to: options.to,
          subject: options.subject,
          status: 'FAILED',
          provider: 'smtp',
          error: err.message,
          actionUrl: options.actionUrl,
          attachments: attachmentNames,
        });
        return { success: false, error: err.message, recipient: options.to, subject: options.subject, provider: 'smtp' };
      }
    }

    // 4. Fallback / Default Outbox Logging (Dev, CI, and seed environments only)
    if (options.attachments && options.attachments.length > 0) {
      try {
        const outboxAttachDir = path.join(STORAGE_DIR, 'outbox_attachments');
        if (!fs.existsSync(outboxAttachDir)) {
          fs.mkdirSync(outboxAttachDir, { recursive: true });
        }
        for (const att of options.attachments) {
          const buf = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content, 'base64');
          fs.writeFileSync(path.join(outboxAttachDir, att.filename), buf);
          console.log(`[EmailService] 📎 Outbox attachment stored: ${att.filename} (${buf.length} bytes)`);
        }
      } catch (err: any) {
        console.warn('[EmailService] Could not write outbox attachment:', err.message);
      }
    }

    this.logEmailDelivery({
      to: options.to,
      subject: options.subject,
      status: isVercel ? 'FAILED' : 'QUEUED_OUTBOX',
      provider: 'local_outbox',
      actionUrl: options.actionUrl,
      attachments: attachmentNames,
      body: options.text,
      text: options.text,
      html: options.html,
    });

    // ── CRITICAL: On Vercel (production serverless), the local outbox is ephemeral
    // and never delivers real email. Always return failure so callers can mark the
    // email status as 'failed' and the administrator knows action is required.
    if (isVercel) {
      const noProviderError =
        'No email provider configured. Set RESEND_API_KEY in Vercel Environment Variables to enable email delivery. ' +
        '(SENDGRID_API_KEY or SMTP/GMAIL credentials are also accepted as alternatives.)';
      console.error(
        `[EmailService] ❌ NO EMAIL PROVIDER: Email to ${options.to} was NOT delivered.\n` +
        `  Subject : "${options.subject}"\n` +
        `  Fix     : Add RESEND_API_KEY to Vercel → Project → Settings → Environment Variables.\n` +
        `  Sign up : https://resend.com (free tier supports up to 3,000 emails/month)`
      );
      return {
        success: false,
        error: noProviderError,
        recipient: options.to,
        subject: options.subject,
        provider: 'none',
      };
    }

    // Local development / CI: outbox log is the expected behaviour
    console.log(`[EmailService] ✉ [DEV] Outbox entry created for ${options.to}: "${options.subject}"`);
    if (attachmentNames && attachmentNames.length > 0) {
      console.log(`[EmailService] 📎 Attached files (${attachmentNames.length}): ${attachmentNames.join(', ')}`);
    }
    if (options.actionUrl) {
      console.log(`[EmailService] 🔗 Secure Action Link: ${options.actionUrl}`);
    }

    return {
      success: true,
      recipient: options.to,
      subject: options.subject,
      messageId: `local_${Date.now()}`,
      queuedOutbox: true,
    };
  }

  // ── Email Templates ───────────────────────────────────────────────────────

  /**
   * 1. Notification to Business Owner when a customer application is submitted.
   * Sends clean summary of all customer details and attaches the generated application PDF.
   */
  public async sendAdminNewApplicationNotification(
    app: WholesaleApplicationRecord,
    pdfAttachment?: { buffer: Buffer; filename: string } | null
  ): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const reviewUrl = `${siteUrl}/admin/customer-applications/${app.id}`;
    const applicantName = (
      app.contactName ||
      `${app.contactFirstName || ''} ${app.contactLastName || ''}`.trim() ||
      'Applicant'
    ).trim();

    // Subject format: New Customer Application - [Business Name] - [Application ID] (Task 2)
    const subject = `New Customer Application - ${app.businessName} - ${app.id}`;

    // Auto-generate application PDF if not already provided
    let attachmentPayload = pdfAttachment;
    if (!attachmentPayload) {
      try {
        attachmentPayload = await applicationPdfService.generateApplicationPdf(app);
      } catch (pdfErr: any) {
        console.warn(`[EmailService] Could not auto-generate PDF for email attachment: ${pdfErr.message}`);
      }
    }

    const businessPhone = app.businessPhone || app.phone;
    const physStreet = app.address?.street || 'Not provided';
    const physCity = app.address?.city || '';
    const physState = app.address?.state || 'OK';
    const physZip = app.address?.zip || '';

    const billingStr = app.billingAddress
      ? `${app.billingAddress.street}, ${app.billingAddress.city}, ${app.billingAddress.state} ${app.billingAddress.zip}`
      : `${physStreet}, ${physCity}, ${physState} ${physZip} (Same as Business Address)`;

    const shippingStr = app.shippingAddress
      ? `${app.shippingAddress.street}, ${app.shippingAddress.city}, ${app.shippingAddress.state} ${app.shippingAddress.zip}`
      : `${physStreet}, ${physCity}, ${physState} ${physZip} (Same as Business Address)`;

    const businessTypeFormatted = (app.businessType || 'other').replace(/_/g, ' ').toUpperCase();
    const businessEntityFormatted = app.businessEntity || 'Commercial Entity';
    const taxPermitFormatted = app.licenseNumber || app.salesTaxPermitNumber || 'Not provided';

    const documentsList = app.documents && app.documents.length > 0
      ? app.documents.map((d) => `• ${d.filename} [${(d.documentType || 'Document').replace(/_/g, ' ').toUpperCase()}]`).join('\n')
      : 'None attached';

    // Plain text summary (strict adherence to clean summary fields)
    const text = `
NEW WHOLESALE CUSTOMER APPLICATION
Applicant Name: ${applicantName}
Business Name: ${app.businessName}
Email: ${app.email}
Phone: ${app.phone}
Business Phone: ${businessPhone}
Business Address: ${physStreet}
City: ${physCity}
State: ${physState}
ZIP: ${physZip}
Billing Address: ${billingStr}
Shipping Address: ${shippingStr}
Business Type: ${businessTypeFormatted}
Business Entity: ${businessEntityFormatted}
Tax ID / EIN: ${app.fein}
Sales Tax Permit Number: ${taxPermitFormatted}

--- ADDITIONAL APPLICATION QUESTIONS & DETAILS ---
DBA / Storefront Name: ${app.dba || 'None'}
Website: ${app.website || 'None'}
Application ID: ${app.id}
Submission Date: ${new Date(app.submittedAt).toLocaleString()}
Current Status: ${app.status || 'PENDING'}
21+ Age Certification: ${app.ageCertified ? 'Yes (Certified 21+ and authorized by commercial entity)' : 'No'}
Tax-Exempt Resale Certification: ${app.taxExemptCertified ? 'Yes (Commercial resale under OK Tax Commission)' : 'Standard Resale'}
Customer Notes / Brand Inquiries: ${app.notes || 'None'}

UPLOADED COMPLIANCE DOCUMENTS:
${documentsList}
${attachmentPayload ? `Generated PDF Attached: ${attachmentPayload.filename}` : ''}

Review this application in the admin portal:
${reviewUrl}
`;

    // Rich responsive HTML summary table
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(255, 107, 0, 0.15); color: #FF6B00; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; }
    .body { padding: 32px 24px; }
    h2 { font-size: 20px; margin-top: 0; color: #F7F7F5; }
    .subhead { color: #B8BDC5; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; color: #FF6B00; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 8px 0; border-bottom: 1px solid #2A3038; padding-bottom: 4px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px 0; font-size: 13.5px; }
    .info-table td { padding: 8px 10px; border-bottom: 1px solid #222831; }
    .info-table td.label { color: #858C96; width: 38%; font-weight: 600; }
    .info-table td.val { color: #F7F7F5; font-weight: 500; }
    .attachment-box { background: rgba(255, 107, 0, 0.08); border: 1px solid rgba(255, 107, 0, 0.3); border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #F7F7F5; }
    .btn-container { text-align: center; margin-top: 28px; }
    .btn { display: inline-block; background: #FF6B00; color: #FFFFFF !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; }
    .footer { padding: 20px 24px; background: #101317; font-size: 11.5px; color: #626871; text-align: center; border-top: 1px solid #2A3038; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
      <div class="badge">NEW WHOLESALE CUSTOMER APPLICATION</div>
    </div>
    <div class="body">
      <h2>New Wholesale Customer Application Submitted</h2>
      <p class="subhead">
        A new retail business has submitted an application for an authorized B2B wholesale purchasing account. Complete details and attached PDF copy below:
      </p>

      <div class="section-title">Primary Application Summary</div>
      <table class="info-table">
        <tr><td class="label">Applicant Name:</td><td class="val"><strong>${applicantName}</strong></td></tr>
        <tr><td class="label">Business Name:</td><td class="val"><strong>${app.businessName}</strong></td></tr>
        ${app.dba ? `<tr><td class="label">DBA / Storefront:</td><td class="val">${app.dba}</td></tr>` : ''}
        <tr><td class="label">Email:</td><td class="val"><a href="mailto:${app.email}" style="color:#FF6B00;">${app.email}</a></td></tr>
        <tr><td class="label">Phone:</td><td class="val">${app.phone}</td></tr>
        <tr><td class="label">Business Phone:</td><td class="val">${businessPhone}</td></tr>
        <tr><td class="label">Business Address:</td><td class="val">${physStreet}</td></tr>
        <tr><td class="label">City:</td><td class="val">${physCity}</td></tr>
        <tr><td class="label">State:</td><td class="val">${physState}</td></tr>
        <tr><td class="label">ZIP:</td><td class="val">${physZip}</td></tr>
        <tr><td class="label">Billing Address:</td><td class="val">${billingStr}</td></tr>
        <tr><td class="label">Shipping Address:</td><td class="val">${shippingStr}</td></tr>
        <tr><td class="label">Business Type:</td><td class="val">${businessTypeFormatted}</td></tr>
        <tr><td class="label">Business Entity:</td><td class="val">${businessEntityFormatted}</td></tr>
        <tr><td class="label">Tax ID / EIN:</td><td class="val"><code>${app.fein}</code></td></tr>
        <tr><td class="label">Sales Tax Permit Number:</td><td class="val"><code>${taxPermitFormatted}</code></td></tr>
      </table>

      <div class="section-title">Additional Questions & Details</div>
      <table class="info-table">
        ${app.website ? `<tr><td class="label">Website:</td><td class="val"><a href="${app.website}" style="color:#FF6B00;" target="_blank">${app.website}</a></td></tr>` : ''}
        <tr><td class="label">Application ID:</td><td class="val"><code>${app.id}</code></td></tr>
        <tr><td class="label">Submission Timestamp:</td><td class="val">${new Date(app.submittedAt).toLocaleString()}</td></tr>
        <tr><td class="label">Current Status:</td><td class="val"><span style="color:#F59E0B;font-weight:700;">${app.status || 'PENDING'}</span></td></tr>
        <tr><td class="label">21+ Age Certification:</td><td class="val">${app.ageCertified ? '✅ Certified (21+ Authorized)' : '❌ Not Certified'}</td></tr>
        <tr><td class="label">Tax-Exempt Resale:</td><td class="val">${app.taxExemptCertified ? '✅ Certified (Commercial Resale)' : 'Standard Resale'}</td></tr>
        ${app.notes ? `<tr><td class="label">Customer Inquiries / Notes:</td><td class="val">${app.notes}</td></tr>` : ''}
      </table>

      ${
        attachmentPayload
          ? `
      <div class="attachment-box">
        <strong>📎 Attached PDF:</strong> <code>${attachmentPayload.filename}</code><br>
        <span style="color:#A0AEC0;font-size:12px;">Complete application record with embedded identification and permit documents has been attached to this email.</span>
      </div>`
          : ''
      }

      <div class="btn-container">
        <a href="${reviewUrl}" class="btn">REVIEW APPLICATION IN PORTAL</a>
      </div>
    </div>
    <div class="footer">
      Wholesale of Oklahoma Dispatch · Licensed OK B2B Master Distributor<br>
      Automated business notification dispatched to <code>${ADMIN_EMAIL}</code>.<br>
      Confidential trade information. Do not forward.
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: ADMIN_EMAIL,
      subject,
      html,
      text,
      actionUrl: reviewUrl,
      attachments: attachmentPayload
        ? [
            {
              filename: attachmentPayload.filename,
              content: attachmentPayload.buffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });
  }

  /**
   * 2. Customer Application Received Confirmation.
   */
  public async sendCustomerApplicationReceived(app: WholesaleApplicationRecord): Promise<EmailDispatchResult> {
    const subject = 'Wholesale of Oklahoma Application Received';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; }
    .body { padding: 32px 24px; }
    h2 { font-size: 20px; color: #F7F7F5; margin-top: 0; }
    p { color: #B8BDC5; font-size: 14px; line-height: 1.6; }
    .notice-box { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin: 24px 0; color: #FCD34D; font-size: 13px; line-height: 1.5; }
    .footer { padding: 20px 24px; background: #101317; font-size: 12px; color: #626871; text-align: center; border-top: 1px solid #2A3038; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
    </div>
    <div class="body">
      <h2>Application Received — Under Review</h2>
      <p>Dear ${app.contactName},</p>
      <p>
        Thank you for applying for a wholesale purchasing account with <strong>Wholesale of Oklahoma</strong> on behalf of <strong>${app.businessName}</strong>.
      </p>
      <p>
        Your application reference number is <strong>${app.id}</strong>.
      </p>

      <div class="notice-box">
        <strong>Account Under Review:</strong><br>
        Your wholesale account application is currently being reviewed by our compliance team.
        <strong>You do not have wholesale shopping access yet.</strong>
        Once your tobacco license, resale permit, and business tax documents are verified, you will receive an email containing a secure link to activate your account and create your password.
      </div>

      <p>
        Please do not submit another application while your current application is under review.
      </p>

      <p style="margin-top: 28px;">
        Sincerely,<br>
        <strong>Wholesale of Oklahoma Compliance & Dispatch Team</strong><br>
        Oklahoma City, OK
      </p>
    </div>
    <div class="footer">
      Wholesale of Oklahoma · Central OKC Warehouse · Licensed Oklahoma B2B Distribution
    </div>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma Application Received

Dear ${app.contactName},

Thank you for applying for a wholesale purchasing account for ${app.businessName}.
Your application has been received and is currently under review (Reference ID: ${app.id}).

You do not have wholesale shopping access yet.

Our team will review your business credentials. If your application is approved, you will receive a separate email with a secure link to activate your account and create your password.

Please do not submit another application while your current application is under review.

Wholesale of Oklahoma
`;

    return this.sendMail({
      to: app.email,
      subject,
      html,
      text,
    });
  }

  /**
   * 3. Customer Account Approved with Assigned Password / Credentials.
   */
  public async sendCustomerAccountApproved(
    app: WholesaleApplicationRecord,
    assignedPassword?: string,
    activationToken?: string
  ): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const loginUrl = `${siteUrl}/account/login`;
    const activationUrl = activationToken ? `${siteUrl}/activate?token=${encodeURIComponent(activationToken)}` : loginUrl;
    const subject = 'Your Wholesale of Oklahoma Account Has Been Approved';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; }
    .body { padding: 32px 24px; }
    h2 { font-size: 22px; color: #10B981; margin-top: 0; }
    p { color: #B8BDC5; font-size: 14px; line-height: 1.6; }
    .cred-box { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .cred-row { margin: 8px 0; font-size: 14px; color: #E2E8F0; }
    .cred-label { color: #94A3B8; font-weight: 600; width: 120px; display: inline-block; }
    .cred-val { font-family: monospace; font-size: 16px; font-weight: 700; color: #38BDF8; background: #0F172A; padding: 4px 10px; border-radius: 6px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #FF6B00; color: #FFFFFF !important; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 10px; }
    .security-note { background: #101317; border: 1px solid #2A3038; border-radius: 10px; padding: 14px; font-size: 12px; color: #858C96; margin-top: 24px; }
    .footer { padding: 20px 24px; background: #101317; font-size: 12px; color: #626871; text-align: center; border-top: 1px solid #2A3038; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
    </div>
    <div class="body">
      <h2>🎉 Congratulations! Your Wholesale Account is Approved</h2>
      <p>Dear ${app.contactName},</p>
      <p>
        Your wholesale purchasing application for <strong>${app.businessName}</strong> has been officially verified and approved.
      </p>

      ${assignedPassword ? `
      <div class="cred-box">
        <h3 style="margin-top: 0; color: #F8FAFC; font-size: 15px;">Your Login Credentials:</h3>
        <div class="cred-row"><span class="cred-label">Username:</span> <span class="cred-val">${app.email}</span></div>
        <div class="cred-row"><span class="cred-label">Password:</span> <span class="cred-val">${assignedPassword}</span></div>
      </div>
      ` : ''}

      <div class="btn-container">
        <a href="${assignedPassword ? loginUrl : activationUrl}" class="btn">SIGN IN & START SHOPPING</a>
      </div>

      <div class="security-note">
        <strong>Wholesale Access Active:</strong><br>
        You now have access to verified wholesale pricing, volume-tiered discounts, and ordering. You can change your password at any time in your account settings.
      </div>

      <p style="margin-top: 24px;">
        If you have questions, please reach out to dispatch at (405) 768-2975.
      </p>

      <p style="margin-top: 28px;">
        Welcome aboard,<br>
        <strong>Wholesale of Oklahoma</strong>
      </p>
    </div>
    <div class="footer">
      Wholesale of Oklahoma · Licensed OK Master Wholesale Warehouse
    </div>
  </div>
</body>
</html>`;

    const text = `
Subject: Your Wholesale of Oklahoma Account Has Been Approved

Congratulations,

Your Wholesale of Oklahoma wholesale account for ${app.businessName} has been approved.

${assignedPassword ? `
Your Login Credentials:
Username: ${app.email}
Password: ${assignedPassword}

Sign in here: ${loginUrl}
` : `
Activate your account here: ${activationUrl}
`}

Wholesale of Oklahoma
`;

    return this.sendMail({
      to: app.email,
      subject,
      html,
      text,
      actionUrl: activationToken ? activationUrl : loginUrl,
    });
  }

  public async sendCustomerCredentialsEmail(
    email: string,
    businessName: string,
    password: string
  ): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const loginUrl = `${siteUrl}/account/login`;
    const subject = `Your Wholesale of Oklahoma Account Credentials – ${businessName}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; padding: 32px 24px;">
    <h2 style="color: #10B981; margin-top: 0;">Wholesale of Oklahoma Access Credentials</h2>
    <p style="color: #B8BDC5; font-size: 14px;">Here are the login credentials for <strong>${businessName}</strong>:</p>
    <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 6px 0; color: #E2E8F0; font-size: 14px;"><strong>Username (Email):</strong> <code style="font-size: 15px; color: #38BDF8;">${email}</code></p>
      <p style="margin: 6px 0; color: #E2E8F0; font-size: 14px;"><strong>Password:</strong> <code style="font-size: 16px; font-weight: bold; color: #38BDF8;">${password}</code></p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background: #FF6B00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; display: inline-block;">SIGN IN TO WHOLESALE PORTAL</a>
    </div>
    <p style="color: #64748B; font-size: 12px;">Contact dispatch at (405) 768-2975 if you need any assistance.</p>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma Access Credentials

Business: ${businessName}
Username: ${email}
Password: ${password}

Sign in here: ${loginUrl}
`;

    return this.sendMail({
      to: email,
      subject,
      html,
      text,
      actionUrl: loginUrl,
    });
  }

  /**
   * 4. Customer Application Rejected Notification.
   */
  public async sendCustomerAccountRejected(app: WholesaleApplicationRecord): Promise<EmailDispatchResult> {
    const subject = 'Wholesale of Oklahoma Application Status';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; }
    .body { padding: 32px 24px; }
    h2 { font-size: 20px; color: #F7F7F5; margin-top: 0; }
    p { color: #B8BDC5; font-size: 14px; line-height: 1.6; }
    .footer { padding: 20px 24px; background: #101317; font-size: 12px; color: #626871; text-align: center; border-top: 1px solid #2A3038; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
    </div>
    <div class="body">
      <h2>Wholesale Application Update</h2>
      <p>Dear ${app.contactName},</p>
      <p>
        Thank you for your interest in Wholesale of Oklahoma. After reviewing the information submitted for <strong>${app.businessName}</strong> (Application ID: ${app.id}), we are unable to approve your wholesale account at this time.
      </p>
      <p>
        This may be due to incomplete tobacco resale documentation, unverifiable tax identification, or operating outside our licensed distribution territory.
      </p>
      <p>
        If you believe this is in error or would like to provide updated documentation, please contact our compliance desk directly at <a href="mailto:${ADMIN_EMAIL}" style="color:#FF6B00;">${ADMIN_EMAIL}</a>.
      </p>
      <p style="margin-top: 28px;">
        Sincerely,<br>
        <strong>Wholesale of Oklahoma Compliance</strong>
      </p>
    </div>
    <div class="footer">
      Wholesale of Oklahoma · Central OKC Warehouse
    </div>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma Application Status

Dear ${app.contactName},

Thank you for your interest in Wholesale of Oklahoma.
After reviewing the information submitted for ${app.businessName} (ID: ${app.id}), we are unable to approve your wholesale account at this time.

If you believe this is in error or have updated documentation, please contact ${ADMIN_EMAIL}.

Wholesale of Oklahoma Compliance
`;

    return this.sendMail({
      to: app.email,
      subject,
      html,
      text,
    });
  }

  /**
   * 5. First-time Admin Setup / Activation Invitation.
   */
  public async sendAdminSetupInvite(adminEmail: string, activationToken: string): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const activationUrl = `${siteUrl}/admin/activate?token=${encodeURIComponent(activationToken)}`;
    const subject = 'Activate Your Wholesale of Oklahoma Administrator Account';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; }
    .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; }
    .body { padding: 32px 24px; }
    h2 { font-size: 22px; color: #F7F7F5; margin-top: 0; }
    p { color: #B8BDC5; font-size: 14px; line-height: 1.6; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #FF6B00; color: #FFFFFF !important; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 10px; }
    .security-note { background: #101317; border: 1px solid #2A3038; border-radius: 10px; padding: 14px; font-size: 12px; color: #858C96; margin-top: 24px; }
    .footer { padding: 20px 24px; background: #101317; font-size: 12px; color: #626871; text-align: center; border-top: 1px solid #2A3038; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
      <div class="badge">Administrative Security Notice</div>
    </div>
    <div class="body">
      <h2>Initial Administrator Setup</h2>
      <p>Hello,</p>
      <p>
        Your administrator account has been initialized for <strong>${adminEmail}</strong>.
      </p>
      <p>
        Click the secure button below to set your strong administrator password and unlock the Wholesale of Oklahoma administrative portal:
      </p>

      <div class="btn-container">
        <a href="${activationUrl}" class="btn">SET ADMIN PASSWORD</a>
      </div>

      <div class="security-note">
        <strong>Single-Use Security Link:</strong><br>
        This link is cryptographically generated and expires in 24 hours. After you create your password, this token will be permanently invalidated.
      </div>

      <p style="margin-top: 24px;">
        If you did not request this invitation, please inspect your server deployment immediately.
      </p>
    </div>
    <div class="footer">
      Wholesale of Oklahoma · Production Portal Security
    </div>
  </div>
</body>
</html>`;

    const text = `
Activate Your Wholesale of Oklahoma Administrator Account

Your administrator account has been initialized for ${adminEmail}.

Click the secure link below to set your administrator password:
${activationUrl}

This single-use activation link expires in 24 hours.

Wholesale of Oklahoma
`;

    return this.sendMail({
      to: adminEmail,
      subject,
      html,
      text,
      actionUrl: activationUrl,
    });
  }

  /**
   * 6. Password Reset Email for Customer or Admin.
   */
  public async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    isAdmin = false
  ): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const resetUrl = isAdmin
      ? `${siteUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}`
      : `${siteUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const subject = isAdmin
      ? 'Wholesale of Oklahoma Administrator Password Reset'
      : 'Wholesale of Oklahoma Password Reset Request';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F7F7F5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2027; padding: 24px; border-bottom: 1px solid #2A3038; text-align: center; }
    .logo { color: #FF6B00; font-size: 20px; font-weight: 800; }
    .body { padding: 32px 24px; }
    h2 { font-size: 20px; color: #F7F7F5; margin-top: 0; }
    p { color: #B8BDC5; font-size: 14px; line-height: 1.6; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #FF6B00; color: #FFFFFF !important; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 10px; }
    .security-note { background: #101317; border: 1px solid #2A3038; border-radius: 10px; padding: 14px; font-size: 12px; color: #858C96; margin-top: 24px; }
    .footer { padding: 20px 24px; background: #101317; font-size: 12px; color: #626871; text-align: center; border-top: 1px solid #2A3038; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WHOLESALE OF OKLAHOMA</div>
    </div>
    <div class="body">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>
        We received a request to reset the password associated with your Wholesale of Oklahoma account (${email}).
      </p>
      <p>
        Click the secure button below to choose a new password:
      </p>

      <div class="btn-container">
        <a href="${resetUrl}" class="btn">RESET MY PASSWORD</a>
      </div>

      <div class="security-note">
        <strong>Security Notice:</strong><br>
        This link is single-use and will expire in 2 hours. If you did not make this request, you can safely disregard this email.
      </div>
    </div>
    <div class="footer">
      Wholesale of Oklahoma · Licensed OK Wholesale Warehouse
    </div>
  </div>
</body>
</html>`;

    const text = `
Password Reset Request

We received a request to reset the password for ${email}.

Click the secure link below to set a new password:
${resetUrl}

This link expires in 2 hours and is single-use.

Wholesale of Oklahoma
`;

    return this.sendMail({
      to: email,
      subject,
      html,
      text,
      actionUrl: resetUrl,
    });
  }

  // ── Order Fulfillment Emails ──────────────────────────────────────────────

  public async sendOrderReceivedEmail(order: OrderRecord): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Wholesale of Oklahoma Order Received – #${order.orderNumber}`;

    const itemsHtml = order.lineItems
      .map(
        (i) => `
        <tr style="border-bottom: 1px solid #2A3038;">
          <td style="padding: 10px 0; color: #FFFFFF; font-size: 14px;">
            <strong>${i.name}</strong> ${i.flavor ? `<span style="color: #94A3B8;">(${i.flavor})</span>` : ''}
            <br><span style="color: #64748B; font-size: 12px;">SKU: ${i.sku || 'N/A'}</span>
          </td>
          <td style="padding: 10px 0; text-align: center; color: #E2E8F0; font-size: 14px;">${i.quantityOrdered}</td>
          <td style="padding: 10px 0; text-align: right; color: #E2E8F0; font-size: 14px;">$${i.pricePerUnit.toFixed(2)}</td>
          <td style="padding: 10px 0; text-align: right; color: #FF6B00; font-weight: bold; font-size: 14px;">$${i.totalPrice.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const fulfillmentDetailsHtml =
      order.fulfillmentMethod === 'PICKUP'
        ? `
        <div style="background: #11141A; border: 1px solid #2A3038; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <div style="color: #FF6B00; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">
            🏬 Official Pickup Location
          </div>
          <div style="color: #FFFFFF; font-weight: bold; font-size: 15px;">
            ${order.pickupInfo?.locationSnapshot.locationName || 'Wholesale of Oklahoma Warehouse'}
          </div>
          <div style="color: #CBD5E1; font-size: 13px; margin: 4px 0;">
            ${order.pickupInfo?.locationSnapshot.address.street}, ${order.pickupInfo?.locationSnapshot.address.city}, ${order.pickupInfo?.locationSnapshot.address.state} ${order.pickupInfo?.locationSnapshot.address.zip}
          </div>
          <div style="color: #94A3B8; font-size: 12px; margin-top: 8px;">
            <strong>Hours:</strong> ${order.pickupInfo?.locationSnapshot.hours || 'Mon–Sat: 9 AM – 8 PM'} · <strong>Phone:</strong> ${order.pickupInfo?.locationSnapshot.phone || '(405) 768-2975'}
          </div>
          <div style="background: rgba(255, 107, 0, 0.1); border-left: 3px solid #FF6B00; padding: 8px 12px; margin-top: 12px; color: #E2E8F0; font-size: 12px;">
            <strong>Important:</strong> You will be notified when your order is ready for pickup. Please do not come to the warehouse until you receive the "Ready for Pickup" notification.
          </div>
        </div>`
        : `
        <div style="background: #11141A; border: 1px solid #2A3038; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <div style="color: #FF6B00; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">
            🚚 Commercial Delivery Address
          </div>
          <div style="color: #FFFFFF; font-weight: bold; font-size: 15px;">
            ${order.deliveryInfo?.addressSnapshot.recipientName || order.businessName}
          </div>
          <div style="color: #CBD5E1; font-size: 13px; margin: 4px 0;">
            ${order.deliveryInfo?.addressSnapshot.street} ${order.deliveryInfo?.addressSnapshot.unit ? `#${order.deliveryInfo?.addressSnapshot.unit}` : ''}<br>
            ${order.deliveryInfo?.addressSnapshot.city}, ${order.deliveryInfo?.addressSnapshot.state} ${order.deliveryInfo?.addressSnapshot.zip}
          </div>
          <div style="color: #94A3B8; font-size: 12px; margin-top: 8px;">
            <strong>Recipient Phone:</strong> ${order.deliveryInfo?.addressSnapshot.phone}
          </div>
          <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3B82F6; padding: 8px 12px; margin-top: 12px; color: #E2E8F0; font-size: 12px;">
            You will receive live tracking updates as your order progresses through preparation and dispatch.
          </div>
        </div>`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px; }
    .card { background: #15191F; border: 1px solid #2A3038; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A3038; padding-bottom: 16px;">
      <h2 style="color: #FF6B00; margin: 0; font-size: 20px;">Wholesale of Oklahoma</h2>
      <span style="background: #1E293B; color: #38BDF8; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">ORDER #${order.orderNumber}</span>
    </div>

    <p style="color: #E2E8F0; font-size: 15px; margin-top: 18px;">
      Hello <strong>${order.customerName}</strong> (${order.businessName}),
    </p>
    <p style="color: #94A3B8; font-size: 14px;">
      Thank you for your order. We have registered your wholesale order and routed it to our Oklahoma City fulfillment center.
    </p>

    ${fulfillmentDetailsHtml}

    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="border-bottom: 1px solid #334155; text-align: left; color: #94A3B8; font-size: 12px; text-transform: uppercase;">
          <th style="padding-bottom: 8px;">Product</th>
          <th style="padding-bottom: 8px; text-align: center;">Qty</th>
          <th style="padding-bottom: 8px; text-align: right;">Rate</th>
          <th style="padding-bottom: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top: 16px; border-top: 1px solid #2A3038; padding-top: 12px;">
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 13px; margin-bottom: 4px;">
        <span>Subtotal:</span>
        <span>$${order.subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 13px; margin-bottom: 4px;">
        <span>Delivery Fee (${order.fulfillmentMethod}):</span>
        <span>${order.deliveryFee === 0 ? 'FREE' : `$${order.deliveryFee.toFixed(2)}`}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 13px; margin-bottom: 8px;">
        <span>Taxes (OTC Wholesale Exempt):</span>
        <span>$0.00</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #FFFFFF; font-size: 16px; font-weight: bold; border-top: 1px solid #334155; padding-top: 8px;">
        <span>Order Total:</span>
        <span style="color: #FF6B00;">$${order.total.toFixed(2)}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #FF6B00; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VIEW ORDER STATUS ONLINE
      </a>
    </div>

    <div style="color: #64748B; font-size: 11px; text-align: center; margin-top: 24px; border-top: 1px solid #2A3038; padding-top: 12px;">
      Wholesale of Oklahoma · 4500 S Bryant Ave, Oklahoma City, OK 73135 · (405) 768-2975
    </div>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma - Order Received #${order.orderNumber}

Hello ${order.customerName} (${order.businessName}),

Thank you for your order. We have registered your wholesale order #${order.orderNumber} for ${order.fulfillmentMethod}.

Order Total: $${order.total.toFixed(2)}
Fulfillment Method: ${order.fulfillmentMethod}

${
  order.fulfillmentMethod === 'PICKUP'
    ? `Pickup Location: ${order.pickupInfo?.locationSnapshot.address.street}, ${order.pickupInfo?.locationSnapshot.address.city}, OK ${order.pickupInfo?.locationSnapshot.address.zip}
Hours: ${order.pickupInfo?.locationSnapshot.hours}
You will be notified when your order is ready for pickup.`
    : `Delivery Address: ${order.deliveryInfo?.addressSnapshot.street}, ${order.deliveryInfo?.addressSnapshot.city}, OK ${order.deliveryInfo?.addressSnapshot.zip}
You will receive updates as your order progresses.`
}

Track your order online:
${orderUrl}

Wholesale of Oklahoma
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderReadyForPickupEmail(order: OrderRecord): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Your Wholesale of Oklahoma order #${order.orderNumber} is ready for pickup`;
    const location = order.pickupInfo?.locationSnapshot || DEFAULT_FULFILLMENT_CONFIG.pickupLocation;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #10B981; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
        ✓ READY FOR PICKUP
      </span>
      <h2 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px;">Your Order is Ready for Collection</h2>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">Order #${order.orderNumber} · ${order.businessName}</p>
    </div>

    <div style="background: #11141A; border: 1px solid #2A3038; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="color: #FF6B00; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">
        Pickup Location
      </div>
      <div style="color: #FFFFFF; font-weight: bold; font-size: 16px;">
        ${location.locationName}
      </div>
      <div style="color: #E2E8F0; font-size: 14px; margin: 6px 0;">
        ${location.address.street}<br>
        ${location.address.city}, ${location.address.state} ${location.address.zip}
      </div>
      <div style="color: #94A3B8; font-size: 13px; margin-top: 10px;">
        <strong>Hours Today:</strong> ${location.hours}<br>
        <strong>Warehouse Dispatch Phone:</strong> ${location.phone}
      </div>
      <div style="background: #1E293B; border-radius: 6px; padding: 12px; margin-top: 14px; color: #CBD5E1; font-size: 13px;">
        <strong>Pickup Instructions:</strong><br>
        ${location.instructions}
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #10B981; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VIEW ORDER DETAILS
      </a>
    </div>
  </div>
</body>
</html>`;

    const text = `
Your Wholesale of Oklahoma order #${order.orderNumber} is ready for pickup!

Location:
${location.locationName}
${location.address.street}
${location.address.city}, ${location.address.state} ${location.address.zip}

Hours: ${location.hours}
Phone: ${location.phone}

Instructions:
${location.instructions}

View details:
${orderUrl}
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderOutForDeliveryEmail(order: OrderRecord): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Your Wholesale of Oklahoma order #${order.orderNumber} is out for delivery`;
    const address = order.deliveryInfo?.addressSnapshot;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #3B82F6; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: rgba(59, 130, 246, 0.2); color: #38BDF8; border: 1px solid #38BDF8; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
        🚚 OUT FOR DELIVERY
      </span>
      <h2 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px;">Your Delivery Driver is En Route</h2>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">Order #${order.orderNumber} · ${order.businessName}</p>
    </div>

    <div style="background: #11141A; border: 1px solid #2A3038; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <div style="color: #38BDF8; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 6px;">
        Delivery Destination
      </div>
      <div style="color: #FFFFFF; font-weight: bold; font-size: 15px;">
        ${address?.recipientName || order.businessName}
      </div>
      <div style="color: #E2E8F0; font-size: 14px; margin: 4px 0;">
        ${address?.street} ${address?.unit ? `#${address.unit}` : ''}<br>
        ${address?.city}, ${address?.state} ${address?.zip}
      </div>
      ${address?.deliveryInstructions ? `<div style="color: #94A3B8; font-size: 12px; margin-top: 8px;"><em>Instructions: ${address.deliveryInstructions}</em></div>` : ''}
    </div>

    <p style="color: #94A3B8; font-size: 13px; text-align: center;">
      Please have an authorized store representative available to receive and verify the commercial shipment.
    </p>

    <div style="text-align: center; margin-top: 20px;">
      <a href="${orderUrl}" style="background: #3B82F6; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        TRACK ORDER
      </a>
    </div>
  </div>
</body>
</html>`;

    const text = `
Your Wholesale of Oklahoma order #${order.orderNumber} is out for delivery!

Destination:
${address?.recipientName}
${address?.street} ${address?.unit || ''}
${address?.city}, ${address?.state} ${address?.zip}

Please have an authorized store representative on hand to sign for delivery.

Track order:
${orderUrl}
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderDeliveredEmail(order: OrderRecord): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Your Wholesale of Oklahoma order #${order.orderNumber} has been delivered`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #10B981; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <div style="text-align: center;">
      <span style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
        ✓ DELIVERED
      </span>
      <h2 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px;">Order Delivered Successfully</h2>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">Order #${order.orderNumber} · Total: $${order.total.toFixed(2)}</p>
    </div>

    <p style="color: #CBD5E1; font-size: 14px; margin-top: 20px; text-align: center;">
      Your delivery has been successfully completed. Thank you for choosing Wholesale of Oklahoma.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #FF6B00; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VIEW ORDER INVOICE
      </a>
    </div>
  </div>
</body>
</html>`;

    const text = `
Your Wholesale of Oklahoma order #${order.orderNumber} has been delivered!
Total: $${order.total.toFixed(2)}

Thank you for your business.
View invoice: ${orderUrl}
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderPickedUpEmail(order: OrderRecord): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Your Wholesale of Oklahoma order #${order.orderNumber} has been picked up`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #10B981; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <div style="text-align: center;">
      <span style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
        ✓ PICKED UP
      </span>
      <h2 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px;">Order Picked Up Successfully</h2>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">Order #${order.orderNumber} · Total: $${order.total.toFixed(2)}</p>
    </div>

    <p style="color: #CBD5E1; font-size: 14px; margin-top: 20px; text-align: center;">
      Your order was picked up from our Oklahoma City warehouse counter. Thank you for your business.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #FF6B00; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VIEW ORDER INVOICE
      </a>
    </div>
  </div>
</body>
</html>`;

    const text = `
Your Wholesale of Oklahoma order #${order.orderNumber} has been picked up!
Total: $${order.total.toFixed(2)}

Thank you for your business.
View invoice: ${orderUrl}
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendInventoryIssueEmail(order: OrderRecord, issueItems: OrderItemRecord[]): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Wholesale of Oklahoma Order #${order.orderNumber} – Item Availability Update`;

    const itemsListHtml = issueItems
      .map(
        (i) => `
        <div style="background: #11141A; border: 1px solid #EF4444; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
          <div style="color: #FFFFFF; font-weight: bold; font-size: 15px;">${i.name} ${i.flavor ? `(${i.flavor})` : ''}</div>
          <div style="color: #94A3B8; font-size: 13px; margin: 4px 0;">SKU: ${i.sku || 'N/A'}</div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px;">
            <span style="color: #CBD5E1;">Quantity Ordered: <strong>${i.quantityOrdered}</strong></span>
            <span style="color: ${i.physicalQuantityAvailable > 0 ? '#FBBF24' : '#EF4444'}; font-weight: bold;">
              Available Now: ${i.physicalQuantityAvailable}
            </span>
          </div>
          <div style="color: #EF4444; font-size: 12px; font-weight: bold; margin-top: 6px; text-transform: uppercase;">
            Status: ${i.itemFulfillmentStatus.replace(/_/g, ' ')}
          </div>
        </div>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #EF4444; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
        ⚠️ INVENTORY AVAILABILITY UPDATE
      </span>
      <h2 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px;">Action Needed on Order #${order.orderNumber}</h2>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">${order.businessName}</p>
    </div>

    <p style="color: #E2E8F0; font-size: 14px; line-height: 1.6;">
      While preparing your order, our warehouse staff discovered an inventory count discrepancy on the following item(s).
      <strong>Your order is currently being held while this issue is resolved.</strong>
    </p>

    <div style="margin: 20px 0;">
      ${itemsListHtml}
    </div>

    <div style="background: #1E293B; border-radius: 8px; padding: 14px; margin: 20px 0; color: #CBD5E1; font-size: 13px;">
      <strong>Resolution Options:</strong><br>
      • Accept the currently available quantity<br>
      • Remove the unavailable item and proceed with remainder<br>
      • Wait for upcoming distributor restock<br>
      • Request an approved flavor/model substitute
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #EF4444; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        REVIEW & RESOLVE IN MY ACCOUNT
      </a>
    </div>

    <p style="color: #64748B; font-size: 12px; text-align: center; margin-top: 16px;">
      Or contact central dispatch directly at (405) 768-2975 or reply to this email.
    </p>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma Order #${order.orderNumber}
There is an availability issue with one or more items in your order.

Affected Items:
${issueItems.map((i) => `- ${i.name} (Ordered: ${i.quantityOrdered}, Available: ${i.physicalQuantityAvailable}, Status: ${i.itemFulfillmentStatus})`).join('\n')}

Your order is currently being held while this issue is resolved.

Review options and choose resolution online:
${orderUrl}

Wholesale of Oklahoma Dispatch: (405) 768-2975
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderAdjustedEmail(order: OrderRecord, adjustmentSummary: string): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Wholesale of Oklahoma Order #${order.orderNumber} – Order Adjusted`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #2A3038; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <h2 style="color: #FF6B00; margin-top: 0;">Order #${order.orderNumber} Has Been Adjusted</h2>
    <p style="color: #E2E8F0; font-size: 14px;">
      Hello <strong>${order.customerName}</strong>, per your agreement with dispatch, order #${order.orderNumber} has been updated.
    </p>
    <div style="background: #11141A; border: 1px solid #334155; border-radius: 6px; padding: 14px; margin: 16px 0; color: #E2E8F0; font-size: 13px;">
      ${adjustmentSummary}
    </div>
    <div style="color: #FFFFFF; font-size: 16px; font-weight: bold; margin-top: 14px;">
      New Order Total: <span style="color: #FF6B00;">$${order.total.toFixed(2)}</span>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${orderUrl}" style="background: #FF6B00; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VIEW UPDATED ORDER
      </a>
    </div>
  </div>
</body>
</html>`;

    const text = `
Wholesale of Oklahoma Order #${order.orderNumber} Adjusted

Adjustment:
${adjustmentSummary}

New Total: $${order.total.toFixed(2)}
View details: ${orderUrl}
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }

  public async sendOrderCancelledEmail(order: OrderRecord, reason?: string): Promise<EmailDispatchResult> {
    const siteUrl = getSiteUrl();
    const orderUrl = `${siteUrl}/account/orders`;
    const subject = `Wholesale of Oklahoma Order #${order.orderNumber} – Order Cancelled`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0D10; color: #F8FAFC; margin: 0; padding: 24px;">
  <div style="background: #15191F; border: 1px solid #EF4444; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 28px;">
    <h2 style="color: #EF4444; margin-top: 0;">Order #${order.orderNumber} Cancelled</h2>
    <p style="color: #E2E8F0; font-size: 14px;">
      Order #${order.orderNumber} for ${order.businessName} has been cancelled.
      ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
    </p>
    <p style="color: #94A3B8; font-size: 13px;">
      If you have any questions, please contact central dispatch at (405) 768-2975.
    </p>
  </div>
</body>
</html>`;

    const text = `
Order #${order.orderNumber} Cancelled
${reason ? `Reason: ${reason}` : ''}

Contact dispatch at (405) 768-2975 with any questions.
`;

    return this.sendMail({
      to: order.email,
      subject,
      html,
      text,
      actionUrl: orderUrl,
    });
  }
  /**
   * Sends a plain-text delivery test email to the admin notification address.
   * Called by the /api/admin/email-test endpoint.
   */
  public async sendTestEmail(): Promise<EmailDispatchResult> {
    return this.sendMail({
      to: ADMIN_EMAIL,
      subject: `[WOO Test] Email Delivery Verification — ${new Date().toISOString()}`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0B0D10; color: #F7F7F5; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background: #15191F; border: 1px solid #2A3038; border-radius: 12px; padding: 28px;">
    <h2 style="color: #10B981; margin-top: 0;">✅ Email Delivery Test</h2>
    <p style="color: #B8BDC5;">This is an automated verification email from the Wholesale of Oklahoma admin portal.</p>
    <p style="color: #B8BDC5;">Sent at: <strong>${new Date().toISOString()}</strong></p>
    <p style="color: #B8BDC5;">If you received this email, application notification emails are configured and working correctly.</p>
  </div>
</body>
</html>`,
      text: `Email Delivery Test — Wholesale of Oklahoma\n\nTimestamp: ${new Date().toISOString()}\n\nIf you received this, email delivery is working.\n\nAdmin email: ${ADMIN_EMAIL}`,
    });
  }

  /**
   * Returns the currently configured email provider and operational readiness status.
   * Used by the /api/admin/email-status diagnostic endpoint.
   * Does NOT expose any secret values.
   */
  public getProviderStatus(): {
    configured: boolean;
    provider: string;
    adminEmail: string;
    fromAddress: string;
    isVercel: boolean;
    warning?: string;
  } {
    const isV = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      'Wholesale of Oklahoma <applications@wholesaleofoklahoma.com>';

    if (resendApiKey && resendApiKey.startsWith('re_')) {
      return { configured: true, provider: 'resend', adminEmail: ADMIN_EMAIL, fromAddress, isVercel: isV };
    }
    if (sendgridApiKey && sendgridApiKey.startsWith('SG.')) {
      return { configured: true, provider: 'sendgrid', adminEmail: ADMIN_EMAIL, fromAddress, isVercel: isV };
    }
    if (smtpHost || (smtpUser && smtpPass)) {
      return { configured: true, provider: 'smtp', adminEmail: ADMIN_EMAIL, fromAddress, isVercel: isV };
    }

    return {
      configured: false,
      provider: 'none',
      adminEmail: ADMIN_EMAIL,
      fromAddress,
      isVercel: isV,
      warning: isV
        ? 'PRODUCTION: No email provider configured. Add RESEND_API_KEY to Vercel Environment Variables. Emails are NOT being delivered.'
        : 'LOCAL DEV: No email provider configured. Emails are logged to storage/email_outbox.log only.',
    };
  }
}

export const emailService = new EmailService();
