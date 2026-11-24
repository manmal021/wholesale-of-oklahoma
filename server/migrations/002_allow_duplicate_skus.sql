DROP INDEX IF EXISTS woo_inventory_overrides_sku_idx;
CREATE INDEX woo_inventory_overrides_sku_idx
  ON woo_inventory_overrides (sku) WHERE sku IS NOT NULL AND sku <> '';

DROP INDEX IF EXISTS woo_product_admin_overrides_sku_idx;
CREATE INDEX woo_product_admin_overrides_sku_idx
  ON woo_product_admin_overrides (sku) WHERE sku IS NOT NULL AND sku <> '';
