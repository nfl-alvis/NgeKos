ALTER TABLE "properties"
  ADD COLUMN "min_monthly_price" DECIMAL(14,0) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "properties_min_monthly_price_check" CHECK ("min_monthly_price" >= 0);

CREATE INDEX "properties_public_listing_idx"
  ON "properties" ("status", "city", "min_monthly_price", "average_rating")
  WHERE "deleted_at" IS NULL;
