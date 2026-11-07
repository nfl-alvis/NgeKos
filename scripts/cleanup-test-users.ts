/**
 * Sementara: bersihkan sisa data test (profiles rows dari email temp) via PostgREST.
 * Jalankan: npx tsx --env-file=.env.local scripts/cleanup-test-users.ts
 */
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const secret = process.env.SUPABASE_SECRET_KEY!;

  for (const pattern of ["ngekos-test-*", "ngekos-probe-*"]) {
    const res = await fetch(`${url}/rest/v1/profiles?email=like.${pattern}`, {
      method: "DELETE",
      headers: { apikey: anon, Authorization: `Bearer ${secret}`, Prefer: "return=representation" },
    });
    const rows = await res.json().catch(() => null);
    console.log(`profiles ${pattern}: HTTP ${res.status}, deleted ${Array.isArray(rows) ? rows.length : "?"}`);
  }
}

main().catch((err) => {
  console.error("CLEANUP GAGAL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

export {};
