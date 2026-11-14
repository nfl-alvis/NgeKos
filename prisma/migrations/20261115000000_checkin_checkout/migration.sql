-- AlterTable: bookings (Add check-in and check-out fields)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checked_in_at" TIMESTAMPTZ(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_in_notes" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_out_requested_at" TIMESTAMPTZ(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_out_date" DATE;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_out_notes" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_bank_info" JSONB;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checked_out_at" TIMESTAMPTZ(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "inspection_notes" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deposit_refund_amount" DECIMAL(14,0);
