/**
 * Sementara (issue #12): menerapkan migration RLS + publication secara langsung.
 * Latar: `prisma migrate deploy` menggantung karena DIRECT_URL menunjuk ke
 * PgBouncer transaction-pooling (port 6543) — DDL/advisory lock tidak stabil di
 * jalur tersebut. Skrip ini menjalankan SQL migration dalam satu transaksi lalu
 * mencatatnya ke `_prisma_migrations` dengan checksum file resmi, sehingga
 * `prisma migrate deploy` berikutnya mengenalinya sebagai applied.
 * Jalankan: npx tsx --env-file=.env.local scripts/apply-chat-rls.ts
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";

const MIGRATION_NAME = "20261025120000_chat_rls_realtime_publication";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL tidak tersedia");
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 20_000 });

  const sql = readFileSync(
    `prisma/migrations/${MIGRATION_NAME}/migration.sql`,
    "utf8",
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("SQL migration diterapkan (policies + publication).");

    // Catat ke _prisma_migrations bila belum tercatat (checksum = sha256 file).
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query("SELECT 1 FROM _prisma_migrations WHERE migration_name = $1", [
      MIGRATION_NAME,
    ]);
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at, applied_steps_count, started_at)
         VALUES (gen_random_uuid(), $1, now(), $2, $3, NULL, 1, now())`,
        [
          checksum,
          MIGRATION_NAME,
          "Applied via scripts/apply-chat-rls.ts (prisma migrate deploy hangs over PgBouncer 6543; see issue #12)",
        ],
      );
      console.log("Tercatat di _prisma_migrations dengan checksum file.");
    } else {
      // File migration bisa direvisi (idempoten) — sinkronkan checksum.
      await client.query(
        `UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2`,
        [checksum, MIGRATION_NAME],
      );
      console.log("Checksum _prisma_migrations disinkronkan dengan file.");
    }

    const policies = await client.query(
      `SELECT tablename, policyname, cmd FROM pg_policies
       WHERE tablename IN ('conversations', 'messages') ORDER BY tablename, policyname`,
    );
    console.log("policies:", policies.rows);
    const pub = await client.query(
      `SELECT count(*)::int AS count FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'`,
    );
    console.log("messages di publication supabase_realtime:", pub.rows[0]?.count);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("APPLY GAGAL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
