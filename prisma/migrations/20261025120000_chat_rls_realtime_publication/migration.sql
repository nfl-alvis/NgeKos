-- Spec #10 (real-time website chat): SELECT-only RLS untuk chat berbasis
-- keanggotaan percakapan, plus pendaftaran tabel messages ke publication
-- Realtime. Policy hanya mengikat role klien (authenticated); Prisma menulis
-- via role pemilik tabel sehingga tidak terpengaruh.

-- Tabel dibuat oleh Prisma dengan role pemilik non-Supabase, sehingga grant
-- default Supabase untuk `authenticated` tidak ada — tanpa GRANT ini, SELECT
-- klien gagal "permission denied" sebelum RLS sempat berlaku. Hanya SELECT
-- yang diberikan; INSERT/UPDATE/DELETE klien terkunci di level privilege.
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.messages TO authenticated;

-- conversations: owner, atau contact terkait. Riwayat Telegram (contact_id
-- NULL) hanya terlihat oleh owner.
DROP POLICY IF EXISTS "conversations_participant_select" ON "conversations";
CREATE POLICY "conversations_participant_select" ON "conversations"
  FOR SELECT TO authenticated
  USING (
    "owner_id" = auth.uid()
    OR ("contact_id" IS NOT NULL AND "contact_id" = auth.uid())
  );

-- messages: dinilai dari keanggotaan percakapan terkait (EXISTS), bukan dari
-- kolom baris pesan.
DROP POLICY IF EXISTS "messages_participant_select" ON "messages";
CREATE POLICY "messages_participant_select" ON "messages"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "conversations" c
      WHERE c."id" = "messages"."conversation_id"
        AND (
          c."owner_id" = auth.uid()
          OR (c."contact_id" IS NOT NULL AND c."contact_id" = auth.uid())
        )
    )
  );

-- Daftarkan messages ke publication supabase_realtime (idempoten).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "messages";
  END IF;
END $$;
