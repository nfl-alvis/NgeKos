-- CreateEnums if not exists
DO $$ BEGIN
    CREATE TYPE "WalletTransactionType" AS ENUM ('EARNING_HOLD', 'ESCROW_RELEASE', 'RENT_REFUND', 'DEPOSIT_REFUND', 'DAMAGE_COMPENSATION', 'WITHDRAWAL', 'PAYMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: wallets
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "balance" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "held_balance" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallets_profile_id_unique" UNIQUE ("profile_id"),
    CONSTRAINT "wallets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: wallet_transactions
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference_id" TEXT,
    "description" TEXT NOT NULL,
    "payout_eligible_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: payout_requests
CREATE TABLE IF NOT EXISTS "payout_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference_number" TEXT,
    "proof_url" TEXT,
    "admin_note" TEXT,
    "processed_by_id" UUID,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payout_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payout_requests_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");
CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_type_status_idx" ON "wallet_transactions"("wallet_id", "type", "status");
CREATE INDEX IF NOT EXISTS "wallet_transactions_status_payout_eligible_at_idx" ON "wallet_transactions"("status", "payout_eligible_at");
CREATE INDEX IF NOT EXISTS "payout_requests_wallet_id_status_idx" ON "payout_requests"("wallet_id", "status");
CREATE INDEX IF NOT EXISTS "payout_requests_status_created_at_idx" ON "payout_requests"("status", "created_at");

-- AlterTable: bookings (Add billing cycle and termination fields)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "billing_cycle" VARCHAR(30) DEFAULT 'MONTHLY';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_due_at" TIMESTAMPTZ(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "termination_status" VARCHAR(30) DEFAULT 'NONE';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "termination_requested_by" VARCHAR(30);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "termination_reason" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "termination_refund_amount" DECIMAL(14,0);
