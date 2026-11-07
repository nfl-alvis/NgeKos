/**
 * Sementara: audit keamanan read-only untuk issue #12 + inventaris akun test.
 * Hanya SELECT ke katalog sistem & auth.users — tidak ada perubahan database.
 * Jalankan: npx tsx --env-file=.env.local scripts/audit-chat-security.ts
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261025120000_chat_rls_realtime_publication";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("=== 1. RLS aktif? ===");
    const rls = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('conversations', 'messages') ORDER BY c.relname`;
    for (const r of rls) console.log(` ${r.relname}: rowsecurity=${r.relrowsecurity} force=${r.relforcerowsecurity}`);

    console.log("\n=== 2. Policies (harus tepat 2, keduanya SELECT, TO authenticated) ===");
    const policies = await prisma.$queryRaw<{ tablename: string; policyname: string; cmd: string; roles: string[] }[]>`
      SELECT tablename, policyname, cmd, array_to_string(roles, ',') AS "roles"
      FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages')
      ORDER BY tablename, policyname`;
    for (const p of policies) console.log(` ${p.tablename}.${p.policyname}: ${p.cmd} TO ${p.roles}`);

    console.log("\n=== 3. Grants role klien (harus: SELECT saja) ===");
    const grants = await prisma.$queryRaw<{ grantee: string; table_name: string; privilege_type: string }[]>`
      SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name IN ('conversations', 'messages')
        AND grantee IN ('anon', 'authenticated') ORDER BY grantee, table_name, privilege_type`;
    for (const g of grants) console.log(` ${g.grantee} @ ${g.table_name}: ${g.privilege_type}`);

    console.log("\n=== 4. Publication supabase_realtime (harus memuat messages) ===");
    const pub = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY tablename`;
    for (const p of pub) console.log(` ${p.tablename}`);

    console.log("\n=== 5. Catatan _prisma_migrations vs checksum file ===");
    const localChecksum = createHash("sha256")
      .update(readFileSync(`prisma/migrations/${MIGRATION_NAME}/migration.sql`, "utf8"))
      .digest("hex");
    const rows = await prisma.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null; applied_steps_count: number }[]>`
      SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
      FROM "_prisma_migrations" WHERE migration_name = ${MIGRATION_NAME}`;
    for (const r of rows) {
      const match = r.checksum === localChecksum;
      console.log(` ${r.migration_name}: finished=${!!r.finished_at} rolled_back=${!!r.rolled_back_at} steps=${r.applied_steps_count}`);
      console.log(` checksum match: ${match} (${r.checksum.slice(0, 12)}... vs ${localChecksum.slice(0, 12)}...)`);
    }

    console.log("\n=== 6. Akun test di auth.users (untuk administrasi; tanpa token) ===");
    const users = await prisma.$queryRaw<{ id: string; email: string; created_at: Date; email_confirmed_at: Date | null }[]>`
      SELECT id, email, created_at, email_confirmed_at FROM auth.users
      WHERE email LIKE 'rls-%' OR email LIKE 'rlsdbg-%' OR email LIKE 'ngekos-test-%' OR email LIKE 'ngekos-probe-%'
      ORDER BY created_at ASC`;
    console.log(` total akun test: ${users.length}`);
    for (const u of users) {
      console.log(` ${u.id} | ${u.email} | dibuat ${u.created_at.toISOString().slice(0, 16)} | confirmed=${!!u.email_confirmed_at}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("AUDIT GAGAL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
