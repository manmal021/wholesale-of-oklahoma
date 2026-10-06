/**
 * applicationPdfService.ts
 *
 * Server-side PDF generation for Wholesale of Oklahoma customer applications.
 * Creates a comprehensive, professional multi-page document containing:
 *  1. Complete customer application fields (Applicant, Business, Contact, Addresses, Tax/Permits, Notes, Certifications)
 *  2. Embedded customer-uploaded documents (Driver License, Sales Tax Permit, Resale Certificate, Business License)
 *
 * Security:
 *  - 100% server-side execution.
 *  - Never includes passwords or authentication secrets.
 *  - Preserves aspect ratios of attached identification/license images.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import sharp from 'sharp';
import type { WholesaleApplicationRecord } from './databaseStore.js';
import { documentStore } from './documentStore.js';

const PAGE_WIDTH = 612; // 8.5 inches in points
const PAGE_HEIGHT = 792; // 11 inches in points
const MARGIN_LEFT = 44;
const MARGIN_RIGHT = 44;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 524 pt

// Color palette
const COLOR_BRAND_ORANGE = rgb(1.0, 0.42, 0.0); // #FF6B00
const COLOR_DARK_HEADER = rgb(0.08, 0.11, 0.15); // #151C26
const COLOR_TEXT_DARK = rgb(0.12, 0.16, 0.22); // #1F2937
const COLOR_TEXT_MUTED = rgb(0.40, 0.46, 0.54); // #66758A
const COLOR_LINE_LIGHT = rgb(0.88, 0.90, 0.93); // #E1E6ED
const COLOR_BG_LIGHT = rgb(0.96, 0.97, 0.98); // #F5F7FA
const COLOR_GREEN = rgb(0.06, 0.55, 0.35);

interface PaginatorContext {
  pdfDoc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  fontOblique: PDFFont;
  currentPage: PDFPage;
  currentY: number;
  pageCount: number;
  app: WholesaleApplicationRecord;
}

function sanitizeText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/•/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const rawWord of words) {
      const word = sanitizeText(rawWord);
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let testWidth = 0;
      try {
        testWidth = font.widthOfTextAtSize(testLine, fontSize);
      } catch {
        testWidth = font.widthOfTextAtSize(testLine.replace(/[^\x20-\x7E]/g, '?'), fontSize);
      }
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function drawPageHeader(ctx: PaginatorContext) {
  const { currentPage, fontBold, fontRegular, app } = ctx;
  const topY = PAGE_HEIGHT - MARGIN_TOP;

  // Brand Accent Top Bar
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: topY + 12,
    width: CONTENT_WIDTH,
    height: 4,
    color: COLOR_BRAND_ORANGE,
  });

  // Logo / Title
  currentPage.drawText('WHOLESALE OF OKLAHOMA', {
    x: MARGIN_LEFT,
    y: topY - 6,
    size: 15,
    font: fontBold,
    color: COLOR_BRAND_ORANGE,
  });

  currentPage.drawText('WHOLESALE CUSTOMER ACCOUNT APPLICATION', {
    x: MARGIN_LEFT,
    y: topY - 20,
    size: 9,
    font: fontBold,
    color: COLOR_DARK_HEADER,
  });

  currentPage.drawText('Licensed Oklahoma B2B Master Distributor • Compliance & Onboarding Desk', {
    x: MARGIN_LEFT,
    y: topY - 31,
    size: 7.5,
    font: fontRegular,
    color: COLOR_TEXT_MUTED,
  });

  // Top Right Metadata Pill
  const rightX = PAGE_WIDTH - MARGIN_RIGHT - 170;
  currentPage.drawRectangle({
    x: rightX,
    y: topY - 33,
    width: 170,
    height: 38,
    color: COLOR_BG_LIGHT,
    borderColor: COLOR_LINE_LIGHT,
    borderWidth: 1,
  });

  currentPage.drawText(`APP ID: ${app.id}`, {
    x: rightX + 8,
    y: topY - 11,
    size: 8,
    font: fontBold,
    color: COLOR_DARK_HEADER,
  });

  const dateStr = app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : new Date().toLocaleDateString();
  currentPage.drawText(`DATE: ${dateStr}`, {
    x: rightX + 8,
    y: topY - 21,
    size: 7.5,
    font: fontRegular,
    color: COLOR_TEXT_MUTED,
  });

  currentPage.drawText(`STATUS: ${app.status || 'PENDING'}`, {
    x: rightX + 8,
    y: topY - 30,
    size: 7.5,
    font: fontBold,
    color: COLOR_BRAND_ORANGE,
  });

  // Horizontal divider
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: topY - 42 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: topY - 42 },
    color: COLOR_LINE_LIGHT,
    thickness: 1,
  });
}

function checkPageBreak(ctx: PaginatorContext, neededHeight: number) {
  if (ctx.currentY - neededHeight < MARGIN_BOTTOM + 30) {
    ctx.currentPage = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pageCount++;
    drawPageHeader(ctx);
    ctx.currentY = PAGE_HEIGHT - MARGIN_TOP - 60;
  }
}

function drawSectionHeader(ctx: PaginatorContext, title: string) {
  checkPageBreak(ctx, 36);

  ctx.currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: ctx.currentY - 18,
    width: CONTENT_WIDTH,
    height: 20,
    color: COLOR_BG_LIGHT,
  });

  ctx.currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: ctx.currentY - 18,
    width: 4,
    height: 20,
    color: COLOR_BRAND_ORANGE,
  });

  ctx.currentPage.drawText(title, {
    x: MARGIN_LEFT + 12,
    y: ctx.currentY - 13,
    size: 9,
    font: ctx.fontBold,
    color: COLOR_DARK_HEADER,
  });

  ctx.currentY -= 26;
}

function drawKeyValueGrid(
  ctx: PaginatorContext,
  items: Array<{ label: string; value: string; fullWidth?: boolean }>
) {
  const colWidth = (CONTENT_WIDTH - 12) / 2;

  let i = 0;
  while (i < items.length) {
    const item = items[i];

    if (item.fullWidth) {
      checkPageBreak(ctx, 32);
      ctx.currentPage.drawText(sanitizeText(item.label).toUpperCase(), {
        x: MARGIN_LEFT,
        y: ctx.currentY,
        size: 7.5,
        font: ctx.fontBold,
        color: COLOR_TEXT_MUTED,
      });

      const lines = wrapText(item.value || 'Not provided', ctx.fontRegular, 8.5, CONTENT_WIDTH);
      ctx.currentY -= 11;
      for (const line of lines) {
        checkPageBreak(ctx, 14);
        ctx.currentPage.drawText(sanitizeText(line), {
          x: MARGIN_LEFT,
          y: ctx.currentY,
          size: 8.5,
          font: ctx.fontRegular,
          color: COLOR_TEXT_DARK,
        });
        ctx.currentY -= 11;
      }
      ctx.currentY -= 6;
      i++;
    } else {
      const item1 = items[i];
      const item2 = items[i + 1] && !items[i + 1].fullWidth ? items[i + 1] : null;

      checkPageBreak(ctx, 30);

      // Col 1
      ctx.currentPage.drawText(sanitizeText(item1.label).toUpperCase(), {
        x: MARGIN_LEFT,
        y: ctx.currentY,
        size: 7.5,
        font: ctx.fontBold,
        color: COLOR_TEXT_MUTED,
      });
      ctx.currentPage.drawText(sanitizeText(item1.value) || '-', {
        x: MARGIN_LEFT,
        y: ctx.currentY - 11,
        size: 8.5,
        font: ctx.fontRegular,
        color: COLOR_TEXT_DARK,
      });

      // Col 2
      if (item2) {
        const col2X = MARGIN_LEFT + colWidth + 12;
        ctx.currentPage.drawText(sanitizeText(item2.label).toUpperCase(), {
          x: col2X,
          y: ctx.currentY,
          size: 7.5,
          font: ctx.fontBold,
          color: COLOR_TEXT_MUTED,
        });
        ctx.currentPage.drawText(sanitizeText(item2.value) || '-', {
          x: col2X,
          y: ctx.currentY - 11,
          size: 8.5,
          font: ctx.fontRegular,
          color: COLOR_TEXT_DARK,
        });
        i += 2;
      } else {
        i += 1;
      }

      ctx.currentY -= 26;
    }
  }
}

export class ApplicationPdfService {
  /**
   * Generates a complete, professional application PDF with customer details
   * and attached documents.
   */
  public async generateApplicationPdf(
    app: WholesaleApplicationRecord
  ): Promise<{ buffer: Buffer; filename: string }> {
    const pdfDoc = await PDFDocument.create();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const firstPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const ctx: PaginatorContext = {
      pdfDoc,
      fontRegular,
      fontBold,
      fontOblique,
      currentPage: firstPage,
      currentY: PAGE_HEIGHT - MARGIN_TOP - 60,
      pageCount: 1,
      app,
    };

    drawPageHeader(ctx);

    // ── 1. APPLICANT INFORMATION ─────────────────────────────────────────────
    drawSectionHeader(ctx, '1. APPLICANT INFORMATION');
    drawKeyValueGrid(ctx, [
      { label: 'Applicant Name', value: app.contactName || `${app.contactFirstName || ''} ${app.contactLastName || ''}`.trim() },
      { label: 'Contact First Name', value: app.contactFirstName || '—' },
      { label: 'Contact Last Name', value: app.contactLastName || '—' },
      { label: 'Authority Status', value: app.ageCertified ? 'Authorized Signatory (21+ Certified)' : 'Pending Certification' },
    ]);

    // ── 2. BUSINESS INFORMATION ──────────────────────────────────────────────
    drawSectionHeader(ctx, '2. BUSINESS INFORMATION');
    const formattedBusinessType = (app.businessType || 'other').replace(/_/g, ' ').toUpperCase();
    drawKeyValueGrid(ctx, [
      { label: 'Legal Business Name', value: app.businessName },
      { label: 'DBA / Storefront Name', value: app.dba || 'None (Operates under legal name)' },
      { label: 'Business Type', value: formattedBusinessType },
      { label: 'Business Entity', value: app.businessEntity || 'Commercial Entity' },
      { label: 'Website', value: app.website || 'None provided' },
      { label: 'Commercial Territory', value: 'Oklahoma B2B Commercial Resale' },
    ]);

    // ── 3. CONTACT INFORMATION ───────────────────────────────────────────────
    drawSectionHeader(ctx, '3. CONTACT INFORMATION');
    drawKeyValueGrid(ctx, [
      { label: 'Email Address', value: app.email },
      { label: 'Primary Contact Phone', value: app.phone },
      { label: 'Business Phone', value: app.businessPhone || app.phone },
      { label: 'Dispatch Notification', value: 'Enabled (order2wholesaleofoklahoma@gmail.com)' },
    ]);

    // ── 4. BUSINESS ADDRESS (PHYSICAL) ───────────────────────────────────────
    drawSectionHeader(ctx, '4. BUSINESS ADDRESS (PHYSICAL)');
    const physStreet = app.address?.street || 'Not provided';
    const physCity = app.address?.city || '';
    const physState = app.address?.state || 'OK';
    const physZip = app.address?.zip || '';
    drawKeyValueGrid(ctx, [
      { label: 'Physical Street Address', value: physStreet, fullWidth: true },
      { label: 'City', value: physCity },
      { label: 'State', value: physState },
      { label: 'ZIP Code', value: physZip },
      { label: 'Delivery Receiving Territory', value: 'Oklahoma Warehouse Delivery Zone' },
    ]);

    // ── 5. BILLING & SHIPPING ADDRESSES ──────────────────────────────────────
    drawSectionHeader(ctx, '5. BILLING & SHIPPING ADDRESSES');
    const billingStr = app.billingAddress
      ? `${app.billingAddress.street}, ${app.billingAddress.city}, ${app.billingAddress.state} ${app.billingAddress.zip}`
      : `Same as Physical Business Address (${physStreet}, ${physCity}, ${physState} ${physZip})`;
    const shippingStr = app.shippingAddress
      ? `${app.shippingAddress.street}, ${app.shippingAddress.city}, ${app.shippingAddress.state} ${app.shippingAddress.zip}`
      : `Same as Physical Business Address (${physStreet}, ${physCity}, ${physState} ${physZip})`;

    drawKeyValueGrid(ctx, [
      { label: 'Billing Address', value: billingStr, fullWidth: true },
      { label: 'Shipping / Dock Address', value: shippingStr, fullWidth: true },
    ]);

    // ── 6. TAX IDENTIFICATION & PERMITS ──────────────────────────────────────
    drawSectionHeader(ctx, '6. TAX IDENTIFICATION & PERMITS');
    drawKeyValueGrid(ctx, [
      { label: 'Federal Employer ID (FEIN / EIN)', value: app.fein },
      { label: 'Oklahoma Sales Tax / Resale Permit Number', value: app.licenseNumber || app.salesTaxPermitNumber || 'Not provided' },
      { label: '21+ Age Certification', value: app.ageCertified ? 'CERTIFIED (Age 21+ and authorized by commercial entity)' : 'NOT CERTIFIED' },
      { label: 'Tax-Exempt Resale Certification', value: app.taxExemptCertified ? 'CERTIFIED (Items purchased strictly for commercial retail resale)' : 'Standard Wholesale Resale' },
    ]);

    // ── 7. APPLICATION QUESTIONS & ADDITIONAL INFORMATION ────────────────────
    drawSectionHeader(ctx, '7. APPLICATION QUESTIONS & ADDITIONAL INFORMATION');
    const notesContent = app.notes ? app.notes : 'No additional notes or custom brand requests specified.';
    drawKeyValueGrid(ctx, [
      { label: 'Customer Inquiries / Requested Brands / Notes', value: notesContent, fullWidth: true },
    ]);

    // If there are custom application answers:
    if (app.applicationAnswers && Object.keys(app.applicationAnswers).length > 0) {
      const customItems = Object.entries(app.applicationAnswers).map(([k, v]) => ({
        label: k.replace(/_/g, ' ').toUpperCase(),
        value: String(v),
        fullWidth: true,
      }));
      drawKeyValueGrid(ctx, customItems);
    }

    // ── 8. ATTACHED DOCUMENTS OVERVIEW ───────────────────────────────────────
    drawSectionHeader(ctx, '8. ATTACHED COMPLIANCE DOCUMENTS');
    const docList = app.documents && app.documents.length > 0
      ? app.documents.map((d) => `- ${d.filename} [${(d.documentType || 'document').replace(/_/g, ' ').toUpperCase()}]`).join('\n')
      : 'No attached documents registered on file.';
    drawKeyValueGrid(ctx, [
      { label: 'Submitted Document Manifest', value: docList, fullWidth: true },
    ]);

    // ── 9. EMBED UPLOADED DOCUMENTS AS SUBSEQUENT PAGES ──────────────────────
    if (app.documents && Array.isArray(app.documents) && app.documents.length > 0) {
      for (const doc of app.documents) {
        const docId = doc.documentId;
        if (!docId) continue;

        const docRecord = documentStore.getDocumentBuffer(docId);
        if (!docRecord || !docRecord.buffer) continue;

        const docTypeUpper = (doc.documentType || 'DOCUMENT')
          .replace(/_/g, ' ')
          .toUpperCase();

        const isPdf =
          docRecord.record.mimeType === 'application/pdf' ||
          (docRecord.buffer.length > 4 &&
            docRecord.buffer[0] === 0x25 &&
            docRecord.buffer[1] === 0x50 &&
            docRecord.buffer[2] === 0x44 &&
            docRecord.buffer[3] === 0x46);

        if (isPdf) {
          // Merge PDF pages directly into application PDF
          try {
            const externalPdf = await PDFDocument.load(docRecord.buffer);
            const externalPages = await pdfDoc.copyPages(externalPdf, externalPdf.getPageIndices());

            for (let idx = 0; idx < externalPages.length; idx++) {
              const copiedPage = externalPages[idx];
              pdfDoc.addPage(copiedPage);

              // Draw neat top banner label above imported page
              copiedPage.drawRectangle({
                x: 0,
                y: copiedPage.getHeight() - 24,
                width: copiedPage.getWidth(),
                height: 24,
                color: COLOR_DARK_HEADER,
              });

              copiedPage.drawText(
                sanitizeText(`ATTACHED DOCUMENT: ${docTypeUpper} - ${doc.filename} (Page ${idx + 1}/${externalPages.length})`),
                {
                  x: 20,
                  y: copiedPage.getHeight() - 16,
                  size: 8,
                  font: fontBold,
                  color: COLOR_BRAND_ORANGE,
                }
              );
            }
          } catch (pdfMergeErr: any) {
            console.warn(`[ApplicationPdfService] Could not embed external PDF ${doc.filename}:`, pdfMergeErr.message);
          }
        } else {
          // Image file (JPG, PNG, WebP, etc.)
          try {
            // Normalize image to PNG via sharp to ensure clean RGB color space and lossless quality
            const pngBuffer = await sharp(docRecord.buffer)
              .rotate() // Auto-orient according to EXIF
              .png()
              .toBuffer();

            const embeddedImg = await pdfDoc.embedPng(pngBuffer);
            const imgPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

            // Top Header Box for Document
            const topBoxY = PAGE_HEIGHT - MARGIN_TOP;

            imgPage.drawRectangle({
              x: MARGIN_LEFT,
              y: topBoxY + 12,
              width: CONTENT_WIDTH,
              height: 4,
              color: COLOR_BRAND_ORANGE,
            });

            imgPage.drawRectangle({
              x: MARGIN_LEFT,
              y: topBoxY - 40,
              width: CONTENT_WIDTH,
              height: 48,
              color: COLOR_BG_LIGHT,
              borderColor: COLOR_LINE_LIGHT,
              borderWidth: 1,
            });

            imgPage.drawText(sanitizeText(`ATTACHED DOCUMENT: ${docTypeUpper}`), {
              x: MARGIN_LEFT + 14,
              y: topBoxY - 14,
              size: 11,
              font: fontBold,
              color: COLOR_BRAND_ORANGE,
            });

            imgPage.drawText(sanitizeText(`File: ${doc.filename}  |  Reference ID: ${docId}`), {
              x: MARGIN_LEFT + 14,
              y: topBoxY - 28,
              size: 8,
              font: fontRegular,
              color: COLOR_TEXT_MUTED,
            });

            // Available bounding area for image
            const areaWidth = CONTENT_WIDTH;
            const areaHeight = topBoxY - 50 - (MARGIN_BOTTOM + 20); // Height available between header and footer

            const imgW = embeddedImg.width;
            const imgH = embeddedImg.height;

            const scale = Math.min(areaWidth / imgW, areaHeight / imgH, 1.0);
            const drawW = imgW * scale;
            const drawH = imgH * scale;

            // Center image within the bounding zone
            const drawX = MARGIN_LEFT + (areaWidth - drawW) / 2;
            const drawY = MARGIN_BOTTOM + 20 + (areaHeight - drawH) / 2;

            imgPage.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: drawW,
              height: drawH,
            });
          } catch (imgErr: any) {
            console.warn(`[ApplicationPdfService] Could not embed image ${doc.filename}:`, imgErr.message);
          }
        }
      }
    }

    // ── 10. STAMP FOOTERS ON ALL PAGES ───────────────────────────────────────
    const allPages = pdfDoc.getPages();
    const totalCount = allPages.length;

    for (let pIdx = 0; pIdx < totalCount; pIdx++) {
      const page = allPages[pIdx];
      const pWidth = page.getWidth();

      // Bottom footer line
      page.drawLine({
        start: { x: MARGIN_LEFT, y: MARGIN_BOTTOM },
        end: { x: pWidth - MARGIN_RIGHT, y: MARGIN_BOTTOM },
        color: COLOR_LINE_LIGHT,
        thickness: 0.75,
      });

      const footerText = sanitizeText(`Wholesale of Oklahoma  |  Central OKC Warehouse  |  Confidential B2B Wholesale Application`);
      page.drawText(footerText, {
        x: MARGIN_LEFT,
        y: MARGIN_BOTTOM - 12,
        size: 7,
        font: fontRegular,
        color: COLOR_TEXT_MUTED,
      });

      const pageNumText = `Page ${pIdx + 1} of ${totalCount}`;
      const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 7);
      page.drawText(pageNumText, {
        x: pWidth - MARGIN_RIGHT - pageNumWidth,
        y: MARGIN_BOTTOM - 12,
        size: 7,
        font: fontRegular,
        color: COLOR_TEXT_MUTED,
      });
    }

    const pdfBytes = await pdfDoc.save();

    const safeBusiness = (app.businessName || 'Business')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const safeApplicant = (app.contactName || `${app.contactFirstName || ''}_${app.contactLastName || ''}` || 'Applicant')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `Wholesale-Application-${safeBusiness}-${safeApplicant}-${app.id}.pdf`;

    return {
      buffer: Buffer.from(pdfBytes),
      filename,
    };
  }
}

export const applicationPdfService = new ApplicationPdfService();
