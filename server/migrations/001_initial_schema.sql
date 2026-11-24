CREATE TABLE IF NOT EXISTS woo_applications (
  id text PRIMARY KEY,
  email text NOT NULL,
  status text NOT NULL,
  submitted_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_applications_email_submitted_idx
  ON woo_applications (lower(email), submitted_at DESC);
CREATE INDEX IF NOT EXISTS woo_applications_status_idx
  ON woo_applications (status);

CREATE TABLE IF NOT EXISTS woo_customers (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  status text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS woo_users (
  email text PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS woo_security_tokens (
  token text PRIMARY KEY,
  email text NOT NULL,
  type text NOT NULL,
  target_id text NOT NULL,
  expires_at bigint NOT NULL,
  is_revoked boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_security_tokens_email_type_idx
  ON woo_security_tokens (lower(email), type);

CREATE TABLE IF NOT EXISTS woo_audit_logs (
  id text PRIMARY KEY,
  event text NOT NULL,
  target_id text,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_audit_logs_created_at_idx
  ON woo_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS woo_orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  email text NOT NULL,
  status text NOT NULL,
  fulfillment_method text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_orders_email_created_idx
  ON woo_orders (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS woo_orders_status_idx
  ON woo_orders (status);

CREATE TABLE IF NOT EXISTS woo_settings (
  setting_key text PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS woo_inventory_overrides (
  product_id text PRIMARY KEY,
  sku text,
  active boolean NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_inventory_overrides_sku_idx
  ON woo_inventory_overrides (sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE TABLE IF NOT EXISTS woo_product_admin_overrides (
  product_id text PRIMARY KEY,
  sku text,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_product_admin_overrides_sku_idx
  ON woo_product_admin_overrides (sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE TABLE IF NOT EXISTS woo_inventory_mismatches (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  resolved boolean NOT NULL,
  reported_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_inventory_mismatches_order_idx
  ON woo_inventory_mismatches (order_id);

CREATE TABLE IF NOT EXISTS woo_customer_addresses (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  address_type text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS woo_customer_addresses_customer_idx
  ON woo_customer_addresses (customer_id);

CREATE TABLE IF NOT EXISTS woo_data_imports (
  source_key text PRIMARY KEY,
  checksum text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS woo_schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
