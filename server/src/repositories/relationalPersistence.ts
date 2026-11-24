import type { PoolClient } from 'pg';
import type {
  AuditLogRecord,
  CustomerAddressSnapshot,
  CustomerRecord,
  CustomerSavedAddress,
  DatabaseState,
  DeliveryAddressSnapshot,
  FulfillmentConfig,
  InventoryMismatchRecord,
  InventoryOverrideRecord,
  OrderRecord,
  ProductAdminOverrideRecord,
  SecurityTokenRecord,
  TaxSettingsConfig,
  WholesaleApplicationRecord,
} from './databaseStore.js';

type Row = Record<string, any>;
type RelationalValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

interface RelationalValueNode {
  path: string[];
  type: RelationalValueType;
  stringValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
}

const iso = (value: any): string | undefined => value == null ? undefined : new Date(value).toISOString();
const optional = (value: any): string | undefined => value == null ? undefined : String(value);
const num = (value: any): number => Number(value);
const bool = (value: any): boolean => Boolean(value);
const address = (row: Row, prefix: string): CustomerAddressSnapshot | undefined => {
  const street = row[`${prefix}_street`];
  if (!street) return undefined;
  return {
    street,
    city: row[`${prefix}_city`] || '',
    state: row[`${prefix}_state`] || '',
    zip: row[`${prefix}_zip`] || '',
  };
};

function flattenValue(value: unknown, path: string[] = [], ancestors = new WeakSet<object>()): RelationalValueNode[] {
  if (value === undefined || value === null) {
    return [{ path, type: 'null', stringValue: null, numberValue: null, booleanValue: null }];
  }
  if (value instanceof Date) return flattenValue(value.toJSON(), path, ancestors);
  if (typeof value === 'string') {
    return [{ path, type: 'string', stringValue: value, numberValue: null, booleanValue: null }];
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? [{ path, type: 'number', stringValue: null, numberValue: value, booleanValue: null }]
      : [{ path, type: 'null', stringValue: null, numberValue: null, booleanValue: null }];
  }
  if (typeof value === 'boolean') {
    return [{ path, type: 'boolean', stringValue: null, numberValue: null, booleanValue: value }];
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Unsupported relational value type: ${typeof value}`);
  }
  if (ancestors.has(value)) throw new TypeError('Cyclic values cannot be persisted relationally.');
  ancestors.add(value);
  const rows: RelationalValueNode[] = [{
    path, type: Array.isArray(value) ? 'array' : 'object',
    stringValue: null, numberValue: null, booleanValue: null,
  }];
  if (Array.isArray(value)) {
    value.forEach((item, index) => rows.push(...flattenValue(item, [...path, String(index)], ancestors)));
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) rows.push(...flattenValue(child, [...path, key], ancestors));
    }
  }
  ancestors.delete(value);
  return rows;
}

function decodeValueRows(rows: Row[], ownerColumn: string, keyColumn: string): Map<string, Record<string, unknown>> {
  const groups = new Map<string, { ownerId: string; key: string; rows: Row[] }>();
  for (const row of rows) {
    const ownerId = String(row[ownerColumn]);
    const key = String(row[keyColumn]);
    const groupId = JSON.stringify([ownerId, key]);
    const group = groups.get(groupId) || { ownerId, key, rows: [] };
    group.rows.push(row);
    groups.set(groupId, group);
  }

  const result = new Map<string, Record<string, unknown>>();
  for (const { ownerId, key, rows: nodes } of groups.values()) {
    nodes.sort((left, right) => left.value_path.length - right.value_path.length);
    const valuesByPath = new Map<string, unknown>();
    let root: unknown;
    let hasRoot = false;
    for (const row of nodes) {
      const path = row.value_path as string[];
      let value: unknown;
      switch (row.value_type as RelationalValueType) {
        case 'string': value = row.string_value; break;
        case 'number': value = Number(row.number_value); break;
        case 'boolean': value = row.boolean_value; break;
        case 'null': value = null; break;
        case 'object': value = {}; break;
        case 'array': value = []; break;
        default: throw new Error(`Unknown relational value type: ${row.value_type}`);
      }

      if (path.length === 0) {
        root = value;
        hasRoot = true;
      } else {
        const parent = valuesByPath.get(JSON.stringify(path.slice(0, -1)));
        const keyPart = path[path.length - 1];
        if (Array.isArray(parent)) {
          const index = Number(keyPart);
          if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid relational array index: ${keyPart}`);
          parent[index] = value;
        } else if (parent && typeof parent === 'object') {
          Object.defineProperty(parent, keyPart, { value, enumerable: true, configurable: true, writable: true });
        } else {
          throw new Error(`Missing parent for relational value path: ${path.join('/')}`);
        }
      }
      valuesByPath.set(JSON.stringify(path), value);
    }
    if (!hasRoot) throw new Error(`Missing root for relational value ${ownerId}/${key}`);
    const ownerValues = result.get(ownerId) || {};
    Object.defineProperty(ownerValues, key, { value: root, enumerable: true, configurable: true, writable: true });
    result.set(ownerId, ownerValues);
  }
  return result;
}

export async function loadRelationalState(client: PoolClient): Promise<DatabaseState> {
  const apps = await client.query('SELECT * FROM woo_applications ORDER BY submitted_at');
  const answers = await client.query('SELECT * FROM woo_application_answers ORDER BY application_id, answer_key');
  const documents = await client.query('SELECT * FROM woo_application_documents ORDER BY application_id, position');
  const customersResult = await client.query('SELECT * FROM woo_customers');
  const users = await client.query('SELECT * FROM woo_users');
  const tokens = await client.query('SELECT * FROM woo_security_tokens');
  const audit = await client.query('SELECT * FROM woo_audit_logs ORDER BY created_at');
  const auditDetails = await client.query('SELECT * FROM woo_audit_log_details ORDER BY audit_log_id, detail_key');
  const ordersResult = await client.query('SELECT * FROM woo_orders ORDER BY created_at');
  const items = await client.query('SELECT * FROM woo_order_line_items ORDER BY order_id, position');
  const notes = await client.query('SELECT * FROM woo_order_internal_notes ORDER BY order_id, created_at');
  const timeline = await client.query('SELECT * FROM woo_order_timeline ORDER BY order_id, position');
  const fulfillment = await client.query('SELECT * FROM woo_order_fulfillment');
  const inventory = await client.query('SELECT * FROM woo_inventory_overrides');
  const productOverrides = await client.query('SELECT * FROM woo_product_admin_overrides');
  const mismatches = await client.query('SELECT * FROM woo_inventory_mismatches');
  const savedAddresses = await client.query('SELECT * FROM woo_customer_addresses ORDER BY customer_id, created_at');
  const fulfillmentSettings = await client.query('SELECT * FROM woo_fulfillment_settings WHERE singleton');
  const eligible = await client.query('SELECT kind, value FROM woo_fulfillment_eligible_areas ORDER BY kind, value');
  const taxSettings = await client.query('SELECT * FROM woo_tax_settings WHERE singleton');

  const answersByApplication = decodeValueRows(answers.rows, 'application_id', 'answer_key');
  const docsByApplication = new Map<string, any[]>();
  for (const row of documents.rows) {
    const docs = docsByApplication.get(row.application_id) || [];
    docs.push({ documentId: row.document_id, documentType: row.document_type, filename: row.filename });
    docsByApplication.set(row.application_id, docs);
  }

  const applications: WholesaleApplicationRecord[] = apps.rows.map((r) => ({
    id: r.id, businessName: r.business_name, dba: optional(r.dba), businessEntity: optional(r.business_entity),
    contactFirstName: r.contact_first_name || '', contactLastName: r.contact_last_name || '',
    contactName: r.contact_name, email: r.email, phone: r.phone || '', businessPhone: optional(r.business_phone),
    fein: r.fein || '', licenseNumber: r.license_number || '', salesTaxPermitNumber: optional(r.sales_tax_permit_number),
    businessType: r.business_type || '', address: address(r, 'address') || { street: '', city: '', state: '', zip: '' },
    billingAddress: address(r, 'billing'), shippingAddress: address(r, 'shipping'),
    website: optional(r.website), notes: optional(r.notes), applicationAnswers: answersByApplication.get(r.id),
    documents: docsByApplication.get(r.id) || [], ageCertified: bool(r.age_certified),
    taxExemptCertified: bool(r.tax_exempt_certified), status: r.status, submittedAt: iso(r.submitted_at)!,
    reviewedAt: iso(r.reviewed_at), reviewedBy: optional(r.reviewed_by), reviewNotes: optional(r.review_notes),
    customerId: optional(r.customer_id), assignedPassword: optional(r.assigned_password),
    emailStatus: optional(r.email_status) as WholesaleApplicationRecord['emailStatus'],
    emailError: optional(r.email_error), emailSentAt: iso(r.email_sent_at), emailAttemptAt: iso(r.email_attempt_at),
    emailMessageId: optional(r.email_message_id), emailProvider: optional(r.email_provider),
    emailRetryCount: r.email_retry_count == null ? undefined : num(r.email_retry_count),
    generatedPdfFilename: optional(r.generated_pdf_filename), generatedPdfDocumentId: optional(r.generated_pdf_document_id),
  }));
  const customers: CustomerRecord[] = customersResult.rows.map((r) => ({
    id: r.id, applicationId: r.application_id, userId: optional(r.user_id), businessName: r.business_name,
    dba: optional(r.dba), contactName: r.contact_name || '', email: r.email, phone: r.phone || '',
    fein: r.fein || '', licenseNumber: r.license_number || '', businessType: r.business_type || '',
    address: address(r, 'address') || { street: '', city: '', state: '', zip: '' }, status: r.status,
    createdAt: iso(r.created_at) || '', approvedAt: iso(r.approved_at), approvedBy: optional(r.approved_by),
    activatedAt: iso(r.activated_at), temporaryPassword: optional(r.temporary_password),
    temporaryPasswordAssignedAt: iso(r.temporary_password_assigned_at), suspendedAt: iso(r.suspended_at),
    suspendedBy: optional(r.suspended_by), suspendedReason: optional(r.suspended_reason),
    reactivatedAt: iso(r.reactivated_at), reactivatedBy: optional(r.reactivated_by),
  }));
  const detailByAudit = decodeValueRows(auditDetails.rows, 'audit_log_id', 'detail_key');
  const auditLogs: AuditLogRecord[] = audit.rows.map((r) => ({
    id: r.id, event: r.event, targetId: optional(r.target_id), targetEmail: optional(r.target_email),
    adminId: optional(r.admin_id), adminEmail: optional(r.admin_email), ip: optional(r.ip),
    timestamp: iso(r.created_at)!, details: detailByAudit.get(r.id),
  }));
  const itemsByOrder = new Map<string, any[]>();
  for (const r of items.rows) {
    const list = itemsByOrder.get(r.order_id) || [];
    list.push({
      id: r.id, productId: r.product_id, sku: r.sku, name: r.name, flavor: optional(r.flavor),
      quantityOrdered: num(r.quantity_ordered), pricePerUnit: num(r.price_per_unit), totalPrice: num(r.total_price),
      zoho_item_id: optional(r.zoho_item_id), systemInventory: num(r.system_inventory),
      physicalQuantityAvailable: num(r.physical_quantity_available), unavailableQuantity: num(r.unavailable_quantity),
      itemFulfillmentStatus: r.fulfillment_status, substituteProductId: optional(r.substitute_product_id),
      substituteProductName: optional(r.substitute_product_name), substitutePrice: r.substitute_price == null ? undefined : num(r.substitute_price),
      resolutionNotes: optional(r.resolution_notes), customerResolutionChoice: optional(r.customer_resolution_choice),
    });
    itemsByOrder.set(r.order_id, list);
  }
  const notesByOrder = new Map<string, any[]>();
  for (const r of notes.rows) {
    const list = notesByOrder.get(r.order_id) || [];
    list.push({ id: r.id, note: r.note, authorId: r.author_id, authorName: r.author_name, timestamp: iso(r.created_at)! });
    notesByOrder.set(r.order_id, list);
  }
  const timelineByOrder = new Map<string, any[]>();
  for (const r of timeline.rows) {
    const list = timelineByOrder.get(r.order_id) || [];
    list.push({ status: r.status, timestamp: iso(r.occurred_at)!, note: optional(r.note), updatedBy: optional(r.updated_by) });
    timelineByOrder.set(r.order_id, list);
  }
  const fulfillmentByOrder = new Map(fulfillment.rows.map((r: Row) => [r.order_id, r]));
  const orders: OrderRecord[] = ordersResult.rows.map((r) => {
    const f = fulfillmentByOrder.get(r.id) as Row | undefined;
    const deliveryAddress: DeliveryAddressSnapshot | undefined = f?.delivery_street ? {
      recipientName: f.delivery_recipient_name || '', businessName: optional(f.delivery_business_name),
      street: f.delivery_street, unit: optional(f.delivery_unit), city: f.delivery_city || '',
      state: f.delivery_state || '', zip: f.delivery_zip || '', phone: f.delivery_phone || '',
      deliveryInstructions: optional(f.delivery_instructions),
    } : undefined;
    return {
      id: r.id, orderNumber: r.order_number, customerId: optional(r.customer_id),
      customerName: r.customer_name || '', businessName: r.business_name || '', email: r.email, phone: r.phone || '',
      customerAddress: address(r, 'customer_address'),
      identityDocument: r.identity_document_id ? {
        documentId: r.identity_document_id, documentType: r.identity_document_type, filename: r.identity_document_filename,
      } as OrderRecord['identityDocument'] : undefined,
      fulfillmentMethod: r.fulfillment_method, status: r.status, paymentStatus: r.payment_status || 'INVOICED',
      subtotal: num(r.subtotal), discount: num(r.discount), tax: num(r.tax), deliveryFee: num(r.delivery_fee),
      total: num(r.total), originalSubtotal: num(r.original_subtotal), originalTotal: num(r.original_total),
      createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at) || iso(r.created_at)!,
      pickupInfo: f?.pickup_location_id ? {
        locationId: f.pickup_location_id,
        locationSnapshot: {
          locationId: f.pickup_location_id, locationName: f.pickup_location_name || '',
          address: { street: f.pickup_street || '', city: f.pickup_city || '', state: f.pickup_state || '', zip: f.pickup_zip || '' },
          hours: f.pickup_hours || '', phone: f.pickup_phone || '', instructions: f.pickup_instructions || '',
        },
        requestedPickupDate: optional(f.requested_pickup_date), requestedPickupTime: optional(f.requested_pickup_time),
        pickupStatus: f.pickup_status, readyForPickupAt: iso(f.ready_for_pickup_at),
        pickedUpAt: iso(f.picked_up_at), pickedUpByStaff: optional(f.picked_up_by_staff),
      } : undefined,
      deliveryInfo: deliveryAddress ? {
        addressSnapshot: deliveryAddress, deliveryFee: num(r.delivery_fee), deliveryStatus: f!.delivery_status,
        outForDeliveryAt: iso(f!.out_for_delivery_at), deliveredAt: iso(f!.delivered_at),
        deliveredByStaff: optional(f!.delivered_by_staff),
      } : undefined,
      lineItems: itemsByOrder.get(r.id) || [], customerNotes: optional(r.customer_notes),
      internalNotes: notesByOrder.get(r.id) || [], hasInventoryIssue: bool(r.has_inventory_issue),
      customerActionRequired: bool(r.customer_action_required), actionRequiredReason: optional(r.action_required_reason),
      timeline: timelineByOrder.get(r.id) || [],
    };
  });
  const userRows = users.rows.map((r) => ({
    id: r.id, email: r.email, passwordHash: r.password_hash, salt: r.salt, role: r.role,
    businessName: r.business_name, contactName: r.contact_name, phone: r.phone,
    fein: optional(r.fein), licenseNumber: optional(r.license_number), assignedPassword: optional(r.assigned_password),
    createdAt: iso(r.created_at) || '', lastLoginAt: iso(r.last_login_at),
  }));

  const f = fulfillmentSettings.rows[0];
  const areaGroups = { city: eligible.rows.filter((r: Row) => r.kind === 'city').map((r: Row) => r.value),
    zip: eligible.rows.filter((r: Row) => r.kind === 'zip').map((r: Row) => r.value) };
  const fulfillmentConfig: FulfillmentConfig | undefined = f ? {
    pickupLocation: {
      locationId: f.location_id, locationName: f.location_name,
      address: { street: f.pickup_street, city: f.pickup_city, state: f.pickup_state, zip: f.pickup_zip },
      hours: f.pickup_hours, phone: f.pickup_phone, instructions: f.pickup_instructions,
    },
    delivery: {
      enabled: bool(f.delivery_enabled), eligibleZipCodes: areaGroups.zip, eligibleCities: areaGroups.city,
      deliveryFee: num(f.delivery_fee), freeDeliveryThreshold: num(f.free_delivery_threshold),
      minimumDeliveryOrder: num(f.minimum_delivery_order), deliveryRadiusMiles: f.delivery_radius_miles == null ? undefined : num(f.delivery_radius_miles),
      notes: optional(f.delivery_notes),
    },
  } : undefined;
  const tax = taxSettings.rows[0];
  const taxSettingsValue: TaxSettingsConfig | undefined = tax ? {
    stateTaxRate: num(tax.state_tax_rate), localTaxRate: num(tax.local_tax_rate), enabled: bool(tax.enabled),
  } : undefined;

  return {
    applications, customers,
    tokens: tokens.rows.map((r) => ({
      id: r.id, token: r.token, type: r.type, email: r.email, targetId: r.target_id,
      expiresAt: num(r.expires_at), createdAt: iso(r.created_at) || '', usedAt: iso(r.used_at), isRevoked: bool(r.is_revoked),
    } as SecurityTokenRecord)),
    auditLogs, orders, users: userRows, fulfillmentConfig, taxSettings: taxSettingsValue,
    inventoryOverrides: inventory.rows.map((r) => ({
      productId: r.product_id, sku: r.sku || '', name: r.name || '', isOutOfStockOnline: bool(r.is_out_of_stock_online),
      statusOverride: optional(r.status_override) as InventoryOverrideRecord['statusOverride'],
      reportedBy: r.reported_by || '', reportedAt: iso(r.reported_at) || '', reason: r.reason || '', active: bool(r.active),
    })),
    productAdminOverrides: productOverrides.rows.map((r) => ({
      productId: r.product_id, sku: r.sku || '', localStockQuantity: num(r.local_stock_quantity),
      wholesalePrice: num(r.wholesale_price), retailPrice: num(r.retail_price), updatedBy: r.updated_by || '',
      updatedAt: iso(r.updated_at) || '',
    } as ProductAdminOverrideRecord)),
    inventoryMismatches: mismatches.rows.map((r) => ({
      id: r.id, orderId: r.order_id, productId: r.product_id || '', sku: r.sku || '',
      productName: r.product_name || '', systemQuantity: num(r.system_quantity), physicalQuantity: num(r.physical_quantity),
      difference: num(r.difference), reportedBy: r.reported_by || '', reportedAt: iso(r.reported_at) || '',
      resolved: bool(r.resolved), resolvedBy: optional(r.resolved_by), resolvedAt: iso(r.resolved_at),
      resolutionNotes: optional(r.resolution_notes),
    } as InventoryMismatchRecord)),
    customerAddresses: savedAddresses.rows.map((r) => ({
      id: r.id, customerId: r.customer_id, type: r.address_type, isDefault: bool(r.is_default),
      recipientName: r.recipient_name || '', businessName: optional(r.business_name), street: r.street || '',
      unit: optional(r.unit), city: r.city || '', state: r.state || '', zip: r.zip || '', phone: r.phone || '',
      deliveryInstructions: optional(r.delivery_instructions), createdAt: iso(r.created_at) || '',
    } as CustomerSavedAddress)),
  };
}

async function replaceChildren(client: PoolClient, table: string, foreignKey: string, id: string): Promise<void> {
  await client.query(`DELETE FROM ${table} WHERE ${foreignKey} = $1`, [id]);
}

async function insert(client: PoolClient, table: string, row: Row): Promise<void> {
  const names = Object.keys(row);
  const values = Object.values(row);
  const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
  await client.query(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders})`, values);
}

async function insertValueNodes(
  client: PoolClient,
  table: string,
  ownerColumn: string,
  ownerId: string,
  keyColumn: string,
  key: string,
  value: unknown
): Promise<void> {
  for (const node of flattenValue(value)) {
    await insert(client, table, {
      [ownerColumn]: ownerId,
      [keyColumn]: key,
      value_path: node.path,
      value_type: node.type,
      string_value: node.stringValue,
      number_value: node.numberValue,
      boolean_value: node.booleanValue,
    });
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

async function syncCollection<T>(
  client: PoolClient,
  oldRows: T[],
  newRows: T[],
  idOf: (value: T) => string,
  table: string,
  keyColumn: string,
  save: (value: T) => Promise<void>
): Promise<void> {
  const oldMap = new Map(oldRows.map((row) => [idOf(row), row]));
  const newMap = new Map(newRows.map((row) => [idOf(row), row]));
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) await client.query(`DELETE FROM ${table} WHERE ${keyColumn} = $1`, [id]);
  }
  for (const [id, row] of newMap) {
    if (stable(oldMap.get(id)) !== stable(row)) await save(row);
  }
}

async function saveApplication(client: PoolClient, r: WholesaleApplicationRecord): Promise<void> {
  await client.query(`INSERT INTO woo_applications
    (id,email,status,submitted_at,business_name,dba,business_entity,contact_first_name,contact_last_name,contact_name,
     phone,business_phone,fein,license_number,sales_tax_permit_number,business_type,address_street,address_city,address_state,address_zip,
     billing_street,billing_city,billing_state,billing_zip,shipping_street,shipping_city,shipping_state,shipping_zip,
     website,notes,age_certified,tax_exempt_certified,reviewed_at,reviewed_by,review_notes,customer_id,assigned_password,
     email_status,email_error,email_sent_at,email_attempt_at,email_message_id,email_provider,email_retry_count,
     generated_pdf_filename,generated_pdf_document_id)
    VALUES (${Array.from({ length: 46 }, (_, i) => `$${i + 1}`).join(',')})`,
  [
    r.id,r.email.toLowerCase(),r.status,r.submittedAt,r.businessName,r.dba,r.businessEntity,r.contactFirstName,r.contactLastName,r.contactName,
    r.phone,r.businessPhone,r.fein,r.licenseNumber,r.salesTaxPermitNumber,r.businessType,r.address.street,r.address.city,r.address.state,r.address.zip,
    r.billingAddress?.street,r.billingAddress?.city,r.billingAddress?.state,r.billingAddress?.zip,
    r.shippingAddress?.street,r.shippingAddress?.city,r.shippingAddress?.state,r.shippingAddress?.zip,
    r.website,r.notes,r.ageCertified,r.taxExemptCertified,r.reviewedAt,r.reviewedBy,r.reviewNotes,r.customerId,r.assignedPassword,
    r.emailStatus,r.emailError,r.emailSentAt,r.emailAttemptAt,r.emailMessageId,r.emailProvider,r.emailRetryCount,
    r.generatedPdfFilename,r.generatedPdfDocumentId,
  ]);
  await replaceChildren(client, 'woo_application_answers', 'application_id', r.id);
  for (const [key, value] of Object.entries(r.applicationAnswers || {})) {
    await insertValueNodes(client, 'woo_application_answers', 'application_id', r.id, 'answer_key', key, value);
  }
  await replaceChildren(client, 'woo_application_documents', 'application_id', r.id);
  for (const [position, doc] of (r.documents || []).entries()) {
    await insert(client, 'woo_application_documents', {
      application_id: r.id, document_id: doc.documentId || (doc as any).id || '',
      document_type: doc.documentType || (doc as any).type || 'other',
      filename: doc.filename, position,
    });
  }
}

async function saveCustomer(client: PoolClient, r: CustomerRecord): Promise<void> {
  await insert(client, 'woo_customers', {
    id:r.id,email:r.email.toLowerCase(),status:r.status,application_id:r.applicationId,user_id:r.userId,
    business_name:r.businessName,dba:r.dba,contact_name:r.contactName,phone:r.phone,fein:r.fein,
    license_number:r.licenseNumber,business_type:r.businessType,address_street:r.address.street,
    address_city:r.address.city,address_state:r.address.state,address_zip:r.address.zip,created_at:r.createdAt,
    approved_at:r.approvedAt,approved_by:r.approvedBy,activated_at:r.activatedAt,temporary_password:r.temporaryPassword,
    temporary_password_assigned_at:r.temporaryPasswordAssignedAt,suspended_at:r.suspendedAt,suspended_by:r.suspendedBy,
    suspended_reason:r.suspendedReason,reactivated_at:r.reactivatedAt,reactivated_by:r.reactivatedBy,
  });
}

async function saveUser(client: PoolClient, r: Row): Promise<void> {
  await insert(client, 'woo_users', {
    email:r.email.toLowerCase(),id:r.id,password_hash:r.passwordHash,salt:r.salt,role:r.role,
    business_name:r.businessName,contact_name:r.contactName,phone:r.phone,fein:r.fein,
    license_number:r.licenseNumber,assigned_password:r.assignedPassword,created_at:r.createdAt,last_login_at:r.lastLoginAt,
  });
}

async function saveToken(client: PoolClient, r: SecurityTokenRecord): Promise<void> {
  await insert(client, 'woo_security_tokens', {
    token:r.token,email:r.email.toLowerCase(),type:r.type,target_id:r.targetId,expires_at:r.expiresAt,
    is_revoked:r.isRevoked,id:r.id,created_at:r.createdAt,used_at:r.usedAt,
  });
}

async function saveAudit(client: PoolClient, r: AuditLogRecord): Promise<void> {
  await insert(client, 'woo_audit_logs', {
    id:r.id,event:r.event,target_id:r.targetId,created_at:r.timestamp,target_email:r.targetEmail,
    admin_id:r.adminId,admin_email:r.adminEmail,ip:r.ip,
  });
  for (const [key, value] of Object.entries(r.details || {})) {
    await insertValueNodes(client, 'woo_audit_log_details', 'audit_log_id', r.id, 'detail_key', key, value);
  }
}

async function saveOrder(client: PoolClient, r: OrderRecord): Promise<void> {
  await insert(client, 'woo_orders', {
    id:r.id,order_number:r.orderNumber,email:r.email.toLowerCase(),status:r.status,fulfillment_method:r.fulfillmentMethod,
    created_at:r.createdAt,customer_id:r.customerId,customer_name:r.customerName,business_name:r.businessName,phone:r.phone,
    payment_status:r.paymentStatus,subtotal:r.subtotal,discount:r.discount,tax:r.tax,delivery_fee:r.deliveryFee,total:r.total,
    original_subtotal:r.originalSubtotal,original_total:r.originalTotal,updated_at:r.updatedAt,
    customer_address_street:r.customerAddress?.street,customer_address_city:r.customerAddress?.city,
    customer_address_state:r.customerAddress?.state,customer_address_zip:r.customerAddress?.zip,
    identity_document_id:r.identityDocument?.documentId,identity_document_type:r.identityDocument?.documentType,
    identity_document_filename:r.identityDocument?.filename,customer_notes:r.customerNotes,
    has_inventory_issue:r.hasInventoryIssue,customer_action_required:r.customerActionRequired,
    action_required_reason:r.actionRequiredReason,
  });
  for (const [position, i] of (r.lineItems || []).entries()) await insert(client, 'woo_order_line_items', {
    id:i.id,order_id:r.id,position,product_id:i.productId,sku:i.sku,name:i.name,flavor:i.flavor,
    quantity_ordered:i.quantityOrdered,price_per_unit:i.pricePerUnit,total_price:i.totalPrice,
    zoho_item_id:i.zoho_item_id,system_inventory:i.systemInventory,physical_quantity_available:i.physicalQuantityAvailable,
    unavailable_quantity:i.unavailableQuantity,fulfillment_status:i.itemFulfillmentStatus,
    substitute_product_id:i.substituteProductId,substitute_product_name:i.substituteProductName,
    substitute_price:i.substitutePrice,resolution_notes:i.resolutionNotes,customer_resolution_choice:i.customerResolutionChoice,
  });
  for (const n of r.internalNotes || []) await insert(client, 'woo_order_internal_notes', {
    id:n.id,order_id:r.id,note:n.note,author_id:n.authorId,author_name:n.authorName,created_at:n.timestamp,
  });
  for (const [position, t] of (r.timeline || []).entries()) await insert(client, 'woo_order_timeline', {
    order_id:r.id,position,status:t.status,occurred_at:t.timestamp,note:t.note,updated_by:t.updatedBy,
  });
  const p = r.pickupInfo;
  const d = r.deliveryInfo;
  if (p || d) {
    const pa = p?.locationSnapshot.address;
    const da = d?.addressSnapshot;
    await insert(client, 'woo_order_fulfillment', {
      order_id:r.id,pickup_location_id:p?.locationId,pickup_location_name:p?.locationSnapshot.locationName,
      pickup_street:pa?.street,pickup_city:pa?.city,pickup_state:pa?.state,pickup_zip:pa?.zip,
      pickup_hours:p?.locationSnapshot.hours,pickup_phone:p?.locationSnapshot.phone,
      pickup_instructions:p?.locationSnapshot.instructions,requested_pickup_date:p?.requestedPickupDate,
      requested_pickup_time:p?.requestedPickupTime,pickup_status:p?.pickupStatus,
      ready_for_pickup_at:p?.readyForPickupAt,picked_up_at:p?.pickedUpAt,picked_up_by_staff:p?.pickedUpByStaff,
      delivery_recipient_name:da?.recipientName,delivery_business_name:da?.businessName,delivery_street:da?.street,
      delivery_unit:da?.unit,delivery_city:da?.city,delivery_state:da?.state,delivery_zip:da?.zip,
      delivery_phone:da?.phone,delivery_instructions:da?.deliveryInstructions,delivery_status:d?.deliveryStatus,
      out_for_delivery_at:d?.outForDeliveryAt,delivered_at:d?.deliveredAt,delivered_by_staff:d?.deliveredByStaff,
    });
  }
}

export async function persistRelationalDiff(client: PoolClient, before: DatabaseState, after: DatabaseState): Promise<void> {
  await syncCollection(client,before.applications,after.applications,(r)=>r.id,'woo_applications','id',async(r)=>{
    await client.query('DELETE FROM woo_applications WHERE id=$1',[r.id]); await saveApplication(client,r);
  });
  await syncCollection(client,before.customers,after.customers,(r)=>r.id,'woo_customers','id',async(r)=>{
    await client.query('DELETE FROM woo_customers WHERE id=$1',[r.id]); await saveCustomer(client,r);
  });
  await syncCollection(client,before.users||[],after.users||[],(r)=>r.email.toLowerCase(),'woo_users','email',async(r)=>{
    await client.query('DELETE FROM woo_users WHERE email=$1',[r.email.toLowerCase()]); await saveUser(client,r);
  });
  await syncCollection(client,before.tokens,after.tokens,(r)=>r.token,'woo_security_tokens','token',async(r)=>{
    await client.query('DELETE FROM woo_security_tokens WHERE token=$1',[r.token]); await saveToken(client,r);
  });
  await syncCollection(client,before.auditLogs,after.auditLogs,(r)=>r.id,'woo_audit_logs','id',async(r)=>{
    await client.query('DELETE FROM woo_audit_logs WHERE id=$1',[r.id]); await saveAudit(client,r);
  });
  await syncCollection(client,before.orders||[],after.orders||[],(r)=>r.id,'woo_orders','id',async(r)=>{
    await client.query('DELETE FROM woo_orders WHERE id=$1',[r.id]); await saveOrder(client,r);
  });
  await syncCollection(client,before.inventoryOverrides||[],after.inventoryOverrides||[],(r)=>r.productId,'woo_inventory_overrides','product_id',async(r)=>{
    await client.query('DELETE FROM woo_inventory_overrides WHERE product_id=$1',[r.productId]);
    await insert(client,'woo_inventory_overrides',{
      product_id:r.productId,sku:r.sku,active:r.active,name:r.name,is_out_of_stock_online:r.isOutOfStockOnline,
      status_override:r.statusOverride,reported_by:r.reportedBy,reported_at:r.reportedAt,reason:r.reason,
    });
  });
  await syncCollection(client,before.productAdminOverrides||[],after.productAdminOverrides||[],(r)=>r.productId,'woo_product_admin_overrides','product_id',async(r)=>{
    await client.query('DELETE FROM woo_product_admin_overrides WHERE product_id=$1',[r.productId]);
    await insert(client,'woo_product_admin_overrides',{
      product_id:r.productId,sku:r.sku,name:(r as any).name,local_stock_quantity:r.localStockQuantity,
      wholesale_price:r.wholesalePrice,retail_price:r.retailPrice,updated_by:r.updatedBy,updated_at:r.updatedAt,
    });
  });
  await syncCollection(client,before.inventoryMismatches||[],after.inventoryMismatches||[],(r)=>r.id,'woo_inventory_mismatches','id',async(r)=>{
    await client.query('DELETE FROM woo_inventory_mismatches WHERE id=$1',[r.id]);
    await insert(client,'woo_inventory_mismatches',{
      id:r.id,order_id:r.orderId,resolved:r.resolved,reported_at:r.reportedAt,product_id:r.productId,sku:r.sku,
      product_name:r.productName,system_quantity:r.systemQuantity,physical_quantity:r.physicalQuantity,
      difference:r.difference,reported_by:r.reportedBy,resolved_by:r.resolvedBy,resolved_at:r.resolvedAt,
      resolution_notes:r.resolutionNotes,
    });
  });
  await syncCollection(client,before.customerAddresses||[],after.customerAddresses||[],(r)=>r.id,'woo_customer_addresses','id',async(r)=>{
    await client.query('DELETE FROM woo_customer_addresses WHERE id=$1',[r.id]);
    await insert(client,'woo_customer_addresses',{
      id:r.id,customer_id:r.customerId,address_type:r.type,is_default:r.isDefault,recipient_name:r.recipientName,
      business_name:r.businessName,street:r.street,unit:r.unit,city:r.city,state:r.state,zip:r.zip,phone:r.phone,
      delivery_instructions:r.deliveryInstructions,created_at:r.createdAt,
    });
  });

  if (stable(before.fulfillmentConfig) !== stable(after.fulfillmentConfig) && after.fulfillmentConfig) {
    const f=after.fulfillmentConfig, p=f.pickupLocation, d=f.delivery;
    await client.query(`INSERT INTO woo_fulfillment_settings
      (singleton,location_id,location_name,pickup_street,pickup_city,pickup_state,pickup_zip,pickup_hours,pickup_phone,
       pickup_instructions,delivery_enabled,delivery_fee,free_delivery_threshold,minimum_delivery_order,delivery_radius_miles,delivery_notes)
      VALUES(true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT(singleton) DO UPDATE SET location_id=EXCLUDED.location_id,location_name=EXCLUDED.location_name,
      pickup_street=EXCLUDED.pickup_street,pickup_city=EXCLUDED.pickup_city,pickup_state=EXCLUDED.pickup_state,
      pickup_zip=EXCLUDED.pickup_zip,pickup_hours=EXCLUDED.pickup_hours,pickup_phone=EXCLUDED.pickup_phone,
      pickup_instructions=EXCLUDED.pickup_instructions,delivery_enabled=EXCLUDED.delivery_enabled,
      delivery_fee=EXCLUDED.delivery_fee,free_delivery_threshold=EXCLUDED.free_delivery_threshold,
      minimum_delivery_order=EXCLUDED.minimum_delivery_order,delivery_radius_miles=EXCLUDED.delivery_radius_miles,
      delivery_notes=EXCLUDED.delivery_notes`,
    [p.locationId,p.locationName,p.address.street,p.address.city,p.address.state,p.address.zip,p.hours,p.phone,p.instructions,
      d.enabled,d.deliveryFee,d.freeDeliveryThreshold,d.minimumDeliveryOrder,d.deliveryRadiusMiles,d.notes]);
    await client.query('DELETE FROM woo_fulfillment_eligible_areas');
    for (const value of d.eligibleCities || []) await insert(client,'woo_fulfillment_eligible_areas',{kind:'city',value});
    for (const value of d.eligibleZipCodes || []) await insert(client,'woo_fulfillment_eligible_areas',{kind:'zip',value});
  }
  if (stable(before.taxSettings) !== stable(after.taxSettings) && after.taxSettings) {
    const t=after.taxSettings;
    await client.query(`INSERT INTO woo_tax_settings(singleton,state_tax_rate,local_tax_rate,enabled)
      VALUES(true,$1,$2,$3) ON CONFLICT(singleton) DO UPDATE SET
      state_tax_rate=EXCLUDED.state_tax_rate,local_tax_rate=EXCLUDED.local_tax_rate,enabled=EXCLUDED.enabled`,
    [t.stateTaxRate,t.localTaxRate,t.enabled]);
  }
}
