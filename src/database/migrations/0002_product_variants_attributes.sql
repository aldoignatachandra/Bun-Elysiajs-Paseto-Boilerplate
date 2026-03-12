ALTER TABLE "products" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "has_variant" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "category";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_attributes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "name" text NOT NULL,
  "values" jsonb NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "price" numeric(10, 2),
  "stock_quantity" integer DEFAULT 0 NOT NULL,
  "stock_reserved" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "attribute_values" jsonb NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_owner_id_idx" ON "products" ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_price_idx" ON "products" ("price");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_has_variant_idx" ON "products" ("has_variant");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_stock_idx" ON "products" ("stock");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_attributes_product_id_idx" ON "product_attributes" ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_attributes_product_id_name_idx" ON "product_attributes" ("product_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_is_active_idx" ON "product_variants" ("is_active");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION maintain_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id uuid;
    v_total_stock integer;
    v_has_variant boolean;
BEGIN
    v_product_id := COALESCE(NEW.product_id, OLD.product_id);

    SELECT COALESCE(SUM(stock_quantity), 0), COUNT(*) > 0
    INTO v_total_stock, v_has_variant
    FROM product_variants
    WHERE product_id = v_product_id AND deleted_at IS NULL;

    UPDATE products
    SET stock = v_total_stock, has_variant = v_has_variant, updated_at = now()
    WHERE id = v_product_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validate_variant_sku()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM product_variants
        WHERE sku = NEW.sku AND id != NEW.id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'SKU "%" already exists', NEW.sku
            USING HINT = 'Each SKU must be unique across all products';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validate_variant_attributes()
RETURNS TRIGGER AS $$
DECLARE
    attr_record RECORD;
    attr_value TEXT;
    valid_values JSONB;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.attribute_values = NEW.attribute_values THEN
        RETURN NEW;
    END IF;

    FOR attr_record IN
        SELECT name, values FROM product_attributes
        WHERE product_id = NEW.product_id AND deleted_at IS NULL
    LOOP
        IF NEW.attribute_values ? attr_record.name THEN
            attr_value := NEW.attribute_values->>attr_record.name;
            valid_values := attr_record.values;
            IF NOT jsonb_exists(valid_values, attr_value) THEN
                RAISE EXCEPTION 'Invalid value "%" for attribute "%". Valid values: %',
                    attr_value, attr_record.name, valid_values;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION cascade_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE product_variants
        SET deleted_at = NEW.deleted_at
        WHERE product_id = NEW.id AND deleted_at IS NULL;
        UPDATE product_attributes
        SET deleted_at = NEW.deleted_at
        WHERE product_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS variant_insert_stock_trigger ON product_variants;
--> statement-breakpoint
CREATE TRIGGER variant_insert_stock_trigger
AFTER INSERT ON product_variants FOR EACH ROW
EXECUTE FUNCTION maintain_product_stock();
--> statement-breakpoint
DROP TRIGGER IF EXISTS variant_update_stock_trigger ON product_variants;
--> statement-breakpoint
CREATE TRIGGER variant_update_stock_trigger
AFTER UPDATE OF stock_quantity, deleted_at ON product_variants FOR EACH ROW
EXECUTE FUNCTION maintain_product_stock();
--> statement-breakpoint
DROP TRIGGER IF EXISTS variant_delete_stock_trigger ON product_variants;
--> statement-breakpoint
CREATE TRIGGER variant_delete_stock_trigger
AFTER DELETE ON product_variants FOR EACH ROW
EXECUTE FUNCTION maintain_product_stock();
--> statement-breakpoint
DROP TRIGGER IF EXISTS variant_sku_validation_trigger ON product_variants;
--> statement-breakpoint
CREATE TRIGGER variant_sku_validation_trigger
BEFORE INSERT OR UPDATE OF sku ON product_variants FOR EACH ROW
EXECUTE FUNCTION validate_variant_sku();
--> statement-breakpoint
DROP TRIGGER IF EXISTS variant_attributes_validation_trigger ON product_variants;
--> statement-breakpoint
CREATE TRIGGER variant_attributes_validation_trigger
BEFORE INSERT OR UPDATE OF attribute_values ON product_variants FOR EACH ROW
EXECUTE FUNCTION validate_variant_attributes();
--> statement-breakpoint
DROP TRIGGER IF EXISTS product_soft_delete_cascade_trigger ON products;
--> statement-breakpoint
CREATE TRIGGER product_soft_delete_cascade_trigger
AFTER UPDATE OF deleted_at ON products FOR EACH ROW
EXECUTE FUNCTION cascade_soft_delete();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION recalculate_all_product_stocks()
RETURNS void AS $$
BEGIN
    UPDATE products p
    SET
        stock = (
            SELECT COALESCE(SUM(stock_quantity), 0)
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
        ),
        has_variant = (
            SELECT COUNT(*) > 0
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
        ),
        updated_at = now()
    WHERE has_variant = true
       OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id);
END;
$$ LANGUAGE plpgsql;
