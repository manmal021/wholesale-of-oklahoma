-- Move every application record out of the legacy JSONB payload columns.
-- The migration runner wraps this file in a transaction, so the legacy payloads
-- remain available if any transformation or verification fails.

ALTER TABLE woo_applications
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS dba text,
  ADD COLUMN IF NOT EXISTS business_entity text,
  ADD COLUMN IF NOT EXISTS contact_first_name text,
  ADD COLUMN IF NOT EXISTS contact_last_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS fein text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS sales_tax_permit_number text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS shipping_street text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_state text,
  ADD COLUMN IF NOT EXISTS shipping_zip text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS age_certified boolean,
  ADD COLUMN IF NOT EXISTS tax_exempt_certified boolean,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS assigned_password text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_message_id text,
  ADD COLUMN IF NOT EXISTS email_provider text,
  ADD COLUMN IF NOT EXISTS email_retry_count integer,
  ADD COLUMN IF NOT EXISTS generated_pdf_filename text,
  ADD COLUMN IF NOT EXISTS generated_pdf_document_id text;

CREATE TABLE woo_application_answers (
  application_id text NOT NULL REFERENCES woo_applications(id) ON DELETE CASCADE,
  answer_key text NOT NULL,
  value_path text[] NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'null', 'object', 'array')),
  string_value text,
  number_value numeric,
  boolean_value boolean,
  PRIMARY KEY (application_id, answer_key, value_path)
);
CREATE TABLE woo_application_documents (
  application_id text NOT NULL REFERENCES woo_applications(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  document_type text NOT NULL,
  filename text NOT NULL,
  position integer NOT NULL,
  PRIMARY KEY (application_id, position)
);

UPDATE woo_applications SET
  business_name = data->>'businessName', dba = data->>'dba',
  business_entity = data->>'businessEntity',
  contact_first_name = data->>'contactFirstName',
  contact_last_name = data->>'contactLastName', contact_name = data->>'contactName',
  phone = data->>'phone', business_phone = data->>'businessPhone',
  fein = data->>'fein', license_number = data->>'licenseNumber',
  sales_tax_permit_number = data->>'salesTaxPermitNumber',
  business_type = data->>'businessType',
  address_street = data->'address'->>'street', address_city = data->'address'->>'city',
  address_state = data->'address'->>'state', address_zip = data->'address'->>'zip',
  billing_street = data->'billingAddress'->>'street',
  billing_city = data->'billingAddress'->>'city',
  billing_state = data->'billingAddress'->>'state',
  billing_zip = data->'billingAddress'->>'zip',
  shipping_street = data->'shippingAddress'->>'street',
  shipping_city = data->'shippingAddress'->>'city',
  shipping_state = data->'shippingAddress'->>'state',
  shipping_zip = data->'shippingAddress'->>'zip',
  website = data->>'website', notes = data->>'notes',
  age_certified = COALESCE((data->>'ageCertified')::boolean, false),
  tax_exempt_certified = COALESCE((data->>'taxExemptCertified')::boolean, false),
  reviewed_at = NULLIF(data->>'reviewedAt', '')::timestamptz,
  reviewed_by = data->>'reviewedBy', review_notes = data->>'reviewNotes',
  customer_id = data->>'customerId', assigned_password = data->>'assignedPassword',
  email_status = data->>'emailStatus', email_error = data->>'emailError',
  email_sent_at = NULLIF(data->>'emailSentAt', '')::timestamptz,
  email_attempt_at = NULLIF(data->>'emailAttemptAt', '')::timestamptz,
  email_message_id = data->>'emailMessageId', email_provider = data->>'emailProvider',
  email_retry_count = NULLIF(data->>'emailRetryCount', '')::integer,
  generated_pdf_filename = data->>'generatedPdfFilename',
  generated_pdf_document_id = data->>'generatedPdfDocumentId';

WITH RECURSIVE answer_values(application_id, answer_key, value_path, value) AS (
  SELECT a.id, answer.key, ARRAY[]::text[], answer.value
  FROM woo_applications a
  CROSS JOIN LATERAL jsonb_each(COALESCE(a.data->'applicationAnswers', '{}'::jsonb)) answer
  UNION ALL
  SELECT parent.application_id, parent.answer_key,
         parent.value_path || child.path_segment, child.value
  FROM answer_values parent
  CROSS JOIN LATERAL (
    SELECT object_entry.key AS path_segment, object_entry.value
    FROM jsonb_each(CASE WHEN jsonb_typeof(parent.value) = 'object' THEN parent.value ELSE '{}'::jsonb END) object_entry
    UNION ALL
    SELECT (array_entry.ordinality - 1)::text, array_entry.value
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(parent.value) = 'array' THEN parent.value ELSE '[]'::jsonb END)
      WITH ORDINALITY AS array_entry(value, ordinality)
  ) child
)
INSERT INTO woo_application_answers
  (application_id, answer_key, value_path, value_type, string_value, number_value, boolean_value)
SELECT application_id, answer_key, value_path, jsonb_typeof(value),
       CASE WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}' END,
       CASE WHEN jsonb_typeof(value) = 'number' THEN value::text::numeric END,
       CASE WHEN jsonb_typeof(value) = 'boolean' THEN value::text::boolean END
FROM answer_values;
INSERT INTO woo_application_documents (application_id, document_id, document_type, filename, position)
SELECT a.id, COALESCE(d.value->>'documentId', d.value->>'id', ''),
       COALESCE(d.value->>'documentType', d.value->>'type', 'other'),
       COALESCE(d.value->>'filename', ''), d.ordinality::integer
FROM woo_applications a
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(a.data->'documents', '[]'::jsonb))
  WITH ORDINALITY AS d(value, ordinality);

ALTER TABLE woo_customers
  ADD COLUMN IF NOT EXISTS application_id text,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS dba text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS fein text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS temporary_password text,
  ADD COLUMN IF NOT EXISTS temporary_password_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by text,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactivated_by text;
UPDATE woo_customers SET
  application_id = data->>'applicationId', user_id = data->>'userId',
  business_name = data->>'businessName', dba = data->>'dba',
  contact_name = data->>'contactName', phone = data->>'phone', fein = data->>'fein',
  license_number = data->>'licenseNumber', business_type = data->>'businessType',
  address_street = data->'address'->>'street', address_city = data->'address'->>'city',
  address_state = data->'address'->>'state', address_zip = data->'address'->>'zip',
  created_at = NULLIF(data->>'createdAt', '')::timestamptz,
  approved_at = NULLIF(data->>'approvedAt', '')::timestamptz,
  approved_by = data->>'approvedBy',
  activated_at = NULLIF(data->>'activatedAt', '')::timestamptz,
  temporary_password = data->>'temporaryPassword',
  temporary_password_assigned_at = NULLIF(data->>'temporaryPasswordAssignedAt', '')::timestamptz,
  suspended_at = NULLIF(data->>'suspendedAt', '')::timestamptz,
  suspended_by = data->>'suspendedBy', suspended_reason = data->>'suspendedReason',
  reactivated_at = NULLIF(data->>'reactivatedAt', '')::timestamptz,
  reactivated_by = data->>'reactivatedBy';

ALTER TABLE woo_users
  ADD COLUMN IF NOT EXISTS id text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS salt text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS fein text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS assigned_password text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
UPDATE woo_users SET
  id = data->>'id', password_hash = data->>'passwordHash', salt = data->>'salt',
  role = data->>'role', business_name = data->>'businessName',
  contact_name = data->>'contactName', phone = data->>'phone',
  fein = data->>'fein', license_number = data->>'licenseNumber',
  assigned_password = data->>'assignedPassword',
  created_at = NULLIF(data->>'createdAt', '')::timestamptz,
  last_login_at = NULLIF(data->>'lastLoginAt', '')::timestamptz;

ALTER TABLE woo_security_tokens
  ADD COLUMN IF NOT EXISTS id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS used_at timestamptz;
UPDATE woo_security_tokens SET
  id = data->>'id', created_at = NULLIF(data->>'createdAt', '')::timestamptz,
  used_at = NULLIF(data->>'usedAt', '')::timestamptz;

ALTER TABLE woo_audit_logs
  ADD COLUMN IF NOT EXISTS target_email text,
  ADD COLUMN IF NOT EXISTS admin_id text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS ip text;
CREATE TABLE woo_audit_log_details (
  audit_log_id text NOT NULL REFERENCES woo_audit_logs(id) ON DELETE CASCADE,
  detail_key text NOT NULL,
  value_path text[] NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'null', 'object', 'array')),
  string_value text,
  number_value numeric,
  boolean_value boolean,
  PRIMARY KEY (audit_log_id, detail_key, value_path)
);
UPDATE woo_audit_logs SET
  target_email = data->>'targetEmail', admin_id = data->>'adminId',
  admin_email = data->>'adminEmail', ip = data->>'ip';
WITH RECURSIVE detail_values(audit_log_id, detail_key, value_path, value) AS (
  SELECT l.id, detail.key, ARRAY[]::text[], detail.value
  FROM woo_audit_logs l
  CROSS JOIN LATERAL jsonb_each(COALESCE(l.data->'details', '{}'::jsonb)) detail
  UNION ALL
  SELECT parent.audit_log_id, parent.detail_key,
         parent.value_path || child.path_segment, child.value
  FROM detail_values parent
  CROSS JOIN LATERAL (
    SELECT object_entry.key AS path_segment, object_entry.value
    FROM jsonb_each(CASE WHEN jsonb_typeof(parent.value) = 'object' THEN parent.value ELSE '{}'::jsonb END) object_entry
    UNION ALL
    SELECT (array_entry.ordinality - 1)::text, array_entry.value
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(parent.value) = 'array' THEN parent.value ELSE '[]'::jsonb END)
      WITH ORDINALITY AS array_entry(value, ordinality)
  ) child
)
INSERT INTO woo_audit_log_details
  (audit_log_id, detail_key, value_path, value_type, string_value, number_value, boolean_value)
SELECT audit_log_id, detail_key, value_path, jsonb_typeof(value),
       CASE WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}' END,
       CASE WHEN jsonb_typeof(value) = 'number' THEN value::text::numeric END,
       CASE WHEN jsonb_typeof(value) = 'boolean' THEN value::text::boolean END
FROM detail_values;

ALTER TABLE woo_orders
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount numeric(12,2),
  ADD COLUMN IF NOT EXISTS tax numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS total numeric(12,2),
  ADD COLUMN IF NOT EXISTS original_subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS original_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_address_street text,
  ADD COLUMN IF NOT EXISTS customer_address_city text,
  ADD COLUMN IF NOT EXISTS customer_address_state text,
  ADD COLUMN IF NOT EXISTS customer_address_zip text,
  ADD COLUMN IF NOT EXISTS identity_document_id text,
  ADD COLUMN IF NOT EXISTS identity_document_type text,
  ADD COLUMN IF NOT EXISTS identity_document_filename text,
  ADD COLUMN IF NOT EXISTS customer_notes text,
  ADD COLUMN IF NOT EXISTS has_inventory_issue boolean,
  ADD COLUMN IF NOT EXISTS customer_action_required boolean,
  ADD COLUMN IF NOT EXISTS action_required_reason text;
UPDATE woo_orders SET
  customer_id = data->>'customerId', customer_name = data->>'customerName',
  business_name = data->>'businessName', phone = data->>'phone',
  payment_status = data->>'paymentStatus',
  subtotal = NULLIF(data->>'subtotal', '')::numeric,
  discount = NULLIF(data->>'discount', '')::numeric,
  tax = NULLIF(data->>'tax', '')::numeric,
  delivery_fee = NULLIF(data->>'deliveryFee', '')::numeric,
  total = NULLIF(data->>'total', '')::numeric,
  original_subtotal = NULLIF(data->>'originalSubtotal', '')::numeric,
  original_total = NULLIF(data->>'originalTotal', '')::numeric,
  updated_at = NULLIF(data->>'updatedAt', '')::timestamptz,
  customer_address_street = data->'customerAddress'->>'street',
  customer_address_city = data->'customerAddress'->>'city',
  customer_address_state = data->'customerAddress'->>'state',
  customer_address_zip = data->'customerAddress'->>'zip',
  identity_document_id = data->'identityDocument'->>'documentId',
  identity_document_type = data->'identityDocument'->>'documentType',
  identity_document_filename = data->'identityDocument'->>'filename',
  customer_notes = data->>'customerNotes',
  has_inventory_issue = COALESCE((data->>'hasInventoryIssue')::boolean, false),
  customer_action_required = COALESCE((data->>'customerActionRequired')::boolean, false),
  action_required_reason = data->>'actionRequiredReason';
CREATE TABLE woo_order_line_items (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES woo_orders(id) ON DELETE CASCADE,
  position integer NOT NULL, product_id text NOT NULL, sku text NOT NULL, name text NOT NULL,
  flavor text, quantity_ordered numeric(12,3) NOT NULL, price_per_unit numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL, zoho_item_id text, system_inventory numeric(12,3) NOT NULL,
  physical_quantity_available numeric(12,3) NOT NULL, unavailable_quantity numeric(12,3) NOT NULL,
  fulfillment_status text NOT NULL, substitute_product_id text, substitute_product_name text,
  substitute_price numeric(12,2), resolution_notes text, customer_resolution_choice text
);
CREATE INDEX woo_order_line_items_order_idx ON woo_order_line_items(order_id, position);
INSERT INTO woo_order_line_items
SELECT item->>'id', o.id, i.ordinality::integer, item->>'productId', item->>'sku',
       item->>'name', item->>'flavor', (item->>'quantityOrdered')::numeric,
       (item->>'pricePerUnit')::numeric, (item->>'totalPrice')::numeric,
       item->>'zoho_item_id', COALESCE((item->>'systemInventory')::numeric, 0),
       COALESCE((item->>'physicalQuantityAvailable')::numeric, 0),
       COALESCE((item->>'unavailableQuantity')::numeric, 0),
       item->>'itemFulfillmentStatus', item->>'substituteProductId',
       item->>'substituteProductName', NULLIF(item->>'substitutePrice', '')::numeric,
       item->>'resolutionNotes', item->>'customerResolutionChoice'
FROM woo_orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.data->'lineItems', '[]'::jsonb))
  WITH ORDINALITY AS i(item, ordinality);
CREATE TABLE woo_order_internal_notes (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES woo_orders(id) ON DELETE CASCADE,
  note text NOT NULL, author_id text NOT NULL, author_name text NOT NULL, created_at timestamptz NOT NULL
);
INSERT INTO woo_order_internal_notes
SELECT n->>'id', o.id, n->>'note', n->>'authorId', n->>'authorName',
       (n->>'timestamp')::timestamptz
FROM woo_orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.data->'internalNotes', '[]'::jsonb)) n;
CREATE TABLE woo_order_timeline (
  order_id text NOT NULL REFERENCES woo_orders(id) ON DELETE CASCADE,
  position integer NOT NULL, status text NOT NULL, occurred_at timestamptz NOT NULL,
  note text, updated_by text, PRIMARY KEY(order_id, position)
);
INSERT INTO woo_order_timeline
SELECT o.id, t.ordinality::integer, t.item->>'status',
       (t.item->>'timestamp')::timestamptz, t.item->>'note', t.item->>'updatedBy'
FROM woo_orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.data->'timeline', '[]'::jsonb))
  WITH ORDINALITY AS t(item, ordinality);
CREATE TABLE woo_order_fulfillment (
  order_id text PRIMARY KEY REFERENCES woo_orders(id) ON DELETE CASCADE,
  pickup_location_id text, pickup_location_name text,
  pickup_street text, pickup_city text, pickup_state text, pickup_zip text,
  pickup_hours text, pickup_phone text, pickup_instructions text,
  requested_pickup_date text, requested_pickup_time text, pickup_status text,
  ready_for_pickup_at timestamptz, picked_up_at timestamptz, picked_up_by_staff text,
  delivery_recipient_name text, delivery_business_name text, delivery_street text,
  delivery_unit text, delivery_city text, delivery_state text, delivery_zip text,
  delivery_phone text, delivery_instructions text, delivery_status text,
  out_for_delivery_at timestamptz, delivered_at timestamptz, delivered_by_staff text
);
INSERT INTO woo_order_fulfillment
SELECT o.id,
  o.data->'pickupInfo'->>'locationId',
  o.data->'pickupInfo'->'locationSnapshot'->>'locationName',
  o.data->'pickupInfo'->'locationSnapshot'->'address'->>'street',
  o.data->'pickupInfo'->'locationSnapshot'->'address'->>'city',
  o.data->'pickupInfo'->'locationSnapshot'->'address'->>'state',
  o.data->'pickupInfo'->'locationSnapshot'->'address'->>'zip',
  o.data->'pickupInfo'->'locationSnapshot'->>'hours',
  o.data->'pickupInfo'->'locationSnapshot'->>'phone',
  o.data->'pickupInfo'->'locationSnapshot'->>'instructions',
  o.data->'pickupInfo'->>'requestedPickupDate',
  o.data->'pickupInfo'->>'requestedPickupTime',
  o.data->'pickupInfo'->>'pickupStatus',
  NULLIF(o.data->'pickupInfo'->>'readyForPickupAt', '')::timestamptz,
  NULLIF(o.data->'pickupInfo'->>'pickedUpAt', '')::timestamptz,
  o.data->'pickupInfo'->>'pickedUpByStaff',
  o.data->'deliveryInfo'->'addressSnapshot'->>'recipientName',
  o.data->'deliveryInfo'->'addressSnapshot'->>'businessName',
  o.data->'deliveryInfo'->'addressSnapshot'->>'street',
  o.data->'deliveryInfo'->'addressSnapshot'->>'unit',
  o.data->'deliveryInfo'->'addressSnapshot'->>'city',
  o.data->'deliveryInfo'->'addressSnapshot'->>'state',
  o.data->'deliveryInfo'->'addressSnapshot'->>'zip',
  o.data->'deliveryInfo'->'addressSnapshot'->>'phone',
  o.data->'deliveryInfo'->'addressSnapshot'->>'deliveryInstructions',
  o.data->'deliveryInfo'->>'deliveryStatus',
  NULLIF(o.data->'deliveryInfo'->>'outForDeliveryAt', '')::timestamptz,
  NULLIF(o.data->'deliveryInfo'->>'deliveredAt', '')::timestamptz,
  o.data->'deliveryInfo'->>'deliveredByStaff'
FROM woo_orders o
WHERE o.data ? 'pickupInfo' OR o.data ? 'deliveryInfo';

ALTER TABLE woo_inventory_overrides
  ADD COLUMN IF NOT EXISTS name text, ADD COLUMN IF NOT EXISTS is_out_of_stock_online boolean,
  ADD COLUMN IF NOT EXISTS status_override text, ADD COLUMN IF NOT EXISTS reported_by text,
  ADD COLUMN IF NOT EXISTS reported_at timestamptz, ADD COLUMN IF NOT EXISTS reason text;
UPDATE woo_inventory_overrides SET
  name = data->>'name', is_out_of_stock_online = COALESCE((data->>'isOutOfStockOnline')::boolean, false),
  status_override = data->>'statusOverride', reported_by = data->>'reportedBy',
  reported_at = NULLIF(data->>'reportedAt', '')::timestamptz, reason = data->>'reason';
ALTER TABLE woo_product_admin_overrides
  ADD COLUMN IF NOT EXISTS name text, ADD COLUMN IF NOT EXISTS local_stock_quantity integer,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2), ADD COLUMN IF NOT EXISTS retail_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS updated_by text, ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE woo_product_admin_overrides SET
  name = data->>'name', local_stock_quantity = NULLIF(data->>'localStockQuantity', '')::integer,
  wholesale_price = NULLIF(data->>'wholesalePrice', '')::numeric,
  retail_price = NULLIF(data->>'retailPrice', '')::numeric, updated_by = data->>'updatedBy',
  updated_at = NULLIF(data->>'updatedAt', '')::timestamptz;
ALTER TABLE woo_inventory_mismatches
  ADD COLUMN IF NOT EXISTS product_id text, ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS product_name text, ADD COLUMN IF NOT EXISTS system_quantity numeric(12,3),
  ADD COLUMN IF NOT EXISTS physical_quantity numeric(12,3), ADD COLUMN IF NOT EXISTS difference numeric(12,3),
  ADD COLUMN IF NOT EXISTS reported_by text, ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz, ADD COLUMN IF NOT EXISTS resolution_notes text;
UPDATE woo_inventory_mismatches SET
  product_id = data->>'productId', sku = data->>'sku', product_name = data->>'productName',
  system_quantity = NULLIF(data->>'systemQuantity', '')::numeric,
  physical_quantity = NULLIF(data->>'physicalQuantity', '')::numeric,
  difference = NULLIF(data->>'difference', '')::numeric, reported_by = data->>'reportedBy',
  resolved_by = data->>'resolvedBy', resolved_at = NULLIF(data->>'resolvedAt', '')::timestamptz,
  resolution_notes = data->>'resolutionNotes';

ALTER TABLE woo_customer_addresses
  ADD COLUMN IF NOT EXISTS recipient_name text, ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text, ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS phone text, ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;
UPDATE woo_customer_addresses SET
  recipient_name = data->>'recipientName', business_name = data->>'businessName',
  street = data->>'street', unit = data->>'unit', city = data->>'city',
  state = data->>'state', zip = data->>'zip', phone = data->>'phone',
  delivery_instructions = data->>'deliveryInstructions',
  created_at = NULLIF(data->>'createdAt', '')::timestamptz;

CREATE TABLE woo_fulfillment_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  location_id text NOT NULL, location_name text NOT NULL,
  pickup_street text NOT NULL, pickup_city text NOT NULL, pickup_state text NOT NULL, pickup_zip text NOT NULL,
  pickup_hours text NOT NULL, pickup_phone text NOT NULL, pickup_instructions text NOT NULL,
  delivery_enabled boolean NOT NULL, delivery_fee numeric(12,2) NOT NULL,
  free_delivery_threshold numeric(12,2) NOT NULL, minimum_delivery_order numeric(12,2) NOT NULL,
  delivery_radius_miles numeric(8,2), delivery_notes text
);
CREATE TABLE woo_fulfillment_eligible_areas (
  kind text NOT NULL CHECK (kind IN ('city', 'zip')),
  value text NOT NULL,
  PRIMARY KEY(kind, value)
);
CREATE TABLE woo_tax_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  state_tax_rate numeric(8,4) NOT NULL, local_tax_rate numeric(8,4) NOT NULL,
  enabled boolean NOT NULL
);
INSERT INTO woo_fulfillment_settings
SELECT true, data->'pickupLocation'->>'locationId', data->'pickupLocation'->>'locationName',
       data->'pickupLocation'->'address'->>'street', data->'pickupLocation'->'address'->>'city',
       data->'pickupLocation'->'address'->>'state', data->'pickupLocation'->'address'->>'zip',
       data->'pickupLocation'->>'hours', data->'pickupLocation'->>'phone',
       data->'pickupLocation'->>'instructions', COALESCE((data->'delivery'->>'enabled')::boolean, true),
       COALESCE((data->'delivery'->>'deliveryFee')::numeric, 0),
       COALESCE((data->'delivery'->>'freeDeliveryThreshold')::numeric, 0),
       COALESCE((data->'delivery'->>'minimumDeliveryOrder')::numeric, 0),
       NULLIF(data->'delivery'->>'deliveryRadiusMiles', '')::numeric,
       data->'delivery'->>'notes'
FROM woo_settings WHERE setting_key = 'fulfillmentConfig';
INSERT INTO woo_fulfillment_eligible_areas(kind, value)
SELECT 'city', jsonb_array_elements_text(data->'delivery'->'eligibleCities')
FROM woo_settings WHERE setting_key = 'fulfillmentConfig';
INSERT INTO woo_fulfillment_eligible_areas(kind, value)
SELECT 'zip', jsonb_array_elements_text(data->'delivery'->'eligibleZipCodes')
FROM woo_settings WHERE setting_key = 'fulfillmentConfig';
INSERT INTO woo_tax_settings(state_tax_rate, local_tax_rate, enabled)
SELECT COALESCE((data->>'stateTaxRate')::numeric, 4.5),
       COALESCE((data->>'localTaxRate')::numeric, 4.125),
       COALESCE((data->>'enabled')::boolean, true)
FROM woo_settings WHERE setting_key = 'taxSettings';

CREATE TABLE woo_documents (
  id text PRIMARY KEY, original_name text NOT NULL, mime_type text NOT NULL,
  size_bytes bigint NOT NULL, document_type text NOT NULL, object_key text NOT NULL UNIQUE,
  storage_provider text NOT NULL CHECK (storage_provider IN ('local', 's3')),
  uploaded_at timestamptz NOT NULL
);

-- A payload is dropped only after its relational replacement and children have
-- been inserted in this same transaction. If anything fails, PostgreSQL rolls
-- the entire cutover back and the legacy JSONB rows remain intact.
ALTER TABLE woo_applications DROP COLUMN data;
ALTER TABLE woo_customers DROP COLUMN data;
ALTER TABLE woo_users DROP COLUMN data;
ALTER TABLE woo_security_tokens DROP COLUMN data;
ALTER TABLE woo_audit_logs DROP COLUMN data;
ALTER TABLE woo_orders DROP COLUMN data;
DROP TABLE woo_settings;
ALTER TABLE woo_inventory_overrides DROP COLUMN data;
ALTER TABLE woo_product_admin_overrides DROP COLUMN data;
ALTER TABLE woo_inventory_mismatches DROP COLUMN data;
ALTER TABLE woo_customer_addresses DROP COLUMN data;

ALTER TABLE woo_applications
  ALTER COLUMN business_name SET NOT NULL, ALTER COLUMN contact_name SET NOT NULL;
ALTER TABLE woo_customers
  ALTER COLUMN application_id SET NOT NULL, ALTER COLUMN business_name SET NOT NULL;
ALTER TABLE woo_users
  ALTER COLUMN id SET NOT NULL, ALTER COLUMN password_hash SET NOT NULL,
  ALTER COLUMN salt SET NOT NULL, ALTER COLUMN role SET NOT NULL;
