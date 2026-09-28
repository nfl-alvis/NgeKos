-- AlterTable profiles
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_username" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_connected_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "telegram_connect_token" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_connect_token_expires_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_telegram_chat_id_key" ON "profiles"("telegram_chat_id");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_telegram_connect_token_key" ON "profiles"("telegram_connect_token");

-- AlterTable conversations
ALTER TABLE "conversations"
  ALTER COLUMN "contact_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "external_chat_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_name" TEXT,
  ADD COLUMN IF NOT EXISTS "external_username" TEXT;

CREATE INDEX IF NOT EXISTS "conversations_external_chat_id_idx" ON "conversations" ("external_chat_id");

-- AlterTable messages
ALTER TABLE "messages"
  ALTER COLUMN "sender_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "sender_role" TEXT NOT NULL DEFAULT 'OWNER',
  ADD COLUMN IF NOT EXISTS "telegram_message_id" TEXT;
