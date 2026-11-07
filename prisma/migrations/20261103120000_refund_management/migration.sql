-- AlterTable: payments (Synchronize Midtrans and Booking relations)
ALTER TABLE "payments" ALTER COLUMN "invoice_id" DROP NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "booking_id" UUID;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "snap_token" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "midtrans_order_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_type" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "settlement_at" TIMESTAMPTZ(3);

-- CreateIndex on payments
CREATE UNIQUE INDEX IF NOT EXISTS "payments_midtrans_order_id_key" ON "payments"("midtrans_order_id");
CREATE INDEX IF NOT EXISTS "payments_booking_id_status_idx" ON "payments"("booking_id", "status");

-- AddForeignKey for payments -> bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.payments')
          AND conname = 'payments_booking_id_fkey'
    ) THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateEnum for RefundStatus (Schema-scoped check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typname = 'RefundStatus'
    ) THEN
        CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'CANCELLED');
    END IF;
END $$;

-- CreateTable: refund_requests
CREATE TABLE IF NOT EXISTS "refund_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "payment_id" UUID,
    "applicant_id" UUID NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "admin_note" TEXT,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on refund_requests
CREATE INDEX IF NOT EXISTS "refund_requests_booking_id_status_idx" ON "refund_requests"("booking_id", "status");
CREATE INDEX IF NOT EXISTS "refund_requests_payment_id_status_idx" ON "refund_requests"("payment_id", "status");
CREATE INDEX IF NOT EXISTS "refund_requests_applicant_id_status_idx" ON "refund_requests"("applicant_id", "status");
CREATE INDEX IF NOT EXISTS "refund_requests_status_created_at_idx" ON "refund_requests"("status", "created_at");

-- AddForeignKey for refund_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.refund_requests')
          AND conname = 'refund_requests_booking_id_fkey'
    ) THEN
        ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_booking_id_fkey"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.refund_requests')
          AND conname = 'refund_requests_payment_id_fkey'
    ) THEN
        ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_payment_id_fkey"
            FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.refund_requests')
          AND conname = 'refund_requests_applicant_id_fkey'
    ) THEN
        ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_applicant_id_fkey"
            FOREIGN KEY ("applicant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.refund_requests')
          AND conname = 'refund_requests_decided_by_id_fkey'
    ) THEN
        ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_decided_by_id_fkey"
            FOREIGN KEY ("decided_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: subscription_plans (Missing model from schema.prisma)
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(14,0) NOT NULL,
    "price_yearly" DECIMAL(14,0) NOT NULL,
    "max_properties" INTEGER NOT NULL DEFAULT 1,
    "max_rooms" INTEGER NOT NULL DEFAULT 10,
    "features" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on subscription_plans
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateTable: subscriptions (Missing model from schema.prisma)
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMPTZ(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on subscriptions
CREATE INDEX IF NOT EXISTS "subscriptions_owner_id_status_idx" ON "subscriptions"("owner_id", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_status_idx" ON "subscriptions"("plan_id", "status");

-- AddForeignKey for subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.subscriptions')
          AND conname = 'subscriptions_owner_id_fkey'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_fkey"
            FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.subscriptions')
          AND conname = 'subscriptions_plan_id_fkey'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey"
            FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: promos (Missing model from schema.prisma)
CREATE TABLE IF NOT EXISTS "promos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "max_discount" DECIMAL(14,0),
    "valid_until" TIMESTAMPTZ(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on promos
CREATE UNIQUE INDEX IF NOT EXISTS "promos_code_key" ON "promos"("code");
CREATE INDEX IF NOT EXISTS "promos_code_active_idx" ON "promos"("code", "active");
