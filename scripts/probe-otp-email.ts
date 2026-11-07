/**
 * Sementara (diagnostik): dry-run lengkap jalur OTP + lupa password via REST GoTrue.
 * 1. Buat inbox sementara di mail.tm
 * 2. POST /auth/v1/signup (email OTP dikirim via custom SMTP Resend)
 * 3. POST /auth/v1/verify type=signup dengan kode dari email
 * 4. POST /auth/v1/recover, baca email kedua, verify type=recovery, ganti password
 * 5. Bersihkan user percobaan via admin API
 *
 * Jalankan: npx tsx --env-file=.env.local scripts/probe-otp-email.ts
 */

const MAILTM = "https://api.mail.tm";
const PROBE_PASSWORD = "ProbePass!2026";
const NEW_PASSWORD = "NewProbePass!2026";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

async function mailTm<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${MAILTM}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`mail.tm ${path} -> ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function toArray<T>(value: T[] | { "hydra:member": T[] } | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value["hydra:member"];
}

async function mailTmList<T>(path: string, token?: string): Promise<T[]> {
  const res = await mailTm<T[] | { "hydra:member": T[] }>(path, {}, token);
  return toArray(res);
}

async function createTempInbox(): Promise<{ address: string; password: string; token: string }> {
  const domainList = await mailTmList<{ domain: string }>("/domains?page=1");
  const domain = domainList[0]?.domain;
  if (!domain) throw new Error("mail.tm: no domain available");
  const address = `ngekos-probe-${Date.now()}@${domain}`;
  const password = `Inbox${Date.now()}!a`;
  await mailTm("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });
  const { token } = await mailTm<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });
  return { address, password, token };
}

async function waitForNewMessage(
  inboxToken: string,
  label: string,
  seenIds: Set<string>,
  timeoutMs = 120_000,
): Promise<{ id: string; subject: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await mailTmList<{ id: string; subject: string; from: { address: string } }>(
      "/messages?page=1",
      inboxToken,
    );
    const fresh = items.find((m) => !seenIds.has(m.id));
    if (fresh) {
      seenIds.add(fresh.id);
      console.log(`[${label}] email diterima dari ${fresh.from.address}: ${fresh.subject}`);
      return fresh;
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  console.log(`[${label}] TIDAK ada email baru dalam ${timeoutMs / 1000}s`);
  return null;
}

async function readMessage(inboxToken: string, id: string) {
  return mailTm<{ subject: string; text: string | null; html: string[] | null }>(
    `/messages/${id}`,
    {},
    inboxToken,
  );
}

function extractCode(text: string): string | null {
  const codes = [...new Set(text.match(/(?<![\d-])\d{8}(?![\d-])/g) ?? [])];
  return codes[0] ?? null;
}

async function gotoTrue(
  path: string,
  init: RequestInit,
  key: string,
  bearer?: string,
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${bearer ?? key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  const inbox = await createTempInbox();
  const seenIds = new Set<string>();
  console.log(`Inbox sementara: ${inbox.address}`);

  // --- 1. signup ---
  const signup = await gotoTrue(
    "/signup",
    {
      method: "POST",
      body: JSON.stringify({
        email: inbox.address,
        password: PROBE_PASSWORD,
        data: { full_name: "OTP Probe", role: "seeker", locale: "id" },
      }),
    },
    ANON,
  );
  console.log(`signup HTTP ${signup.status} session=${!!(signup.json as { access_token?: string })?.access_token}`);
  const signupUser = (signup.json as { user?: { id?: string }; id?: string }) ?? {};
  const userId = signupUser.user?.id ?? signupUser.id ?? null;

  // --- 2. verify signup OTP ---
  const signupMail = await waitForNewMessage(inbox.token, "signup", seenIds);
  if (!signupMail) throw new Error("email signup tidak diterima");
  const signupMsg = await readMessage(inbox.token, signupMail.id);
  const signupCode = extractCode(signupMsg.text ?? "");
  console.log(`kode OTP signup: ${signupCode}`);
  if (!signupCode) throw new Error("kode 8-digit tidak ditemukan di email signup");

  const verify = await gotoTrue(
    "/verify",
    {
      method: "POST",
      body: JSON.stringify({ type: "signup", email: inbox.address, token: signupCode }),
    },
    ANON,
  );
  const accessToken = (verify.json as { access_token?: string })?.access_token;
  console.log(`verify signup HTTP ${verify.status} access_token=${accessToken ? "DAPAT" : "tidak"}`);
  if (!accessToken) throw new Error(`verify signup gagal: ${JSON.stringify(verify.json)}`);

  // --- 3. recover (lupa password) ---
  await new Promise((r) => setTimeout(r, 8_000));
  const recover = await gotoTrue(
    "/recover",
    { method: "POST", body: JSON.stringify({ email: inbox.address }) },
    ANON,
  );
  console.log(`recover HTTP ${recover.status}`);
  const recoverMail = await waitForNewMessage(inbox.token, "recover", seenIds);
  if (!recoverMail) throw new Error("email recover tidak diterima");
  const recoverMsg = await readMessage(inbox.token, recoverMail.id);
  console.log("--- recover email text (300 char) ---");
  console.log((recoverMsg.text ?? "").slice(0, 300));
  const recoverCode = extractCode(recoverMsg.text ?? "");
  console.log(`kode OTP recover: ${recoverCode}`);
  if (!recoverCode) throw new Error("kode 8-digit tidak ditemukan di email recover");

  const verifyRecovery = await gotoTrue(
    "/verify",
    {
      method: "POST",
      body: JSON.stringify({ type: "recovery", email: inbox.address, token: recoverCode }),
    },
    ANON,
  );
  const recoveryAccessToken = (verifyRecovery.json as { access_token?: string })?.access_token;
  console.log(
    `verify recovery HTTP ${verifyRecovery.status} access_token=${recoveryAccessToken ? "DAPAT" : "tidak"}`,
  );
  if (!recoveryAccessToken) throw new Error(`verify recovery gagal: ${JSON.stringify(verifyRecovery.json)}`);

  // --- 4. ganti password dengan session recovery ---
  const updateUser = await gotoTrue(
    "/user",
    { method: "PUT", body: JSON.stringify({ password: NEW_PASSWORD }) },
    ANON,
    recoveryAccessToken,
  );
  console.log(`updateUser (ganti password) HTTP ${updateUser.status}`);
  if (updateUser.status !== 200) throw new Error(`updateUser gagal: ${JSON.stringify(updateUser.json)}`);

  // --- 5. login dengan password baru ---
  await new Promise((r) => setTimeout(r, 3_000));
  const login = await gotoTrue(
    "/token?grant_type=password",
    {
      method: "POST",
      body: JSON.stringify({ email: inbox.address, password: NEW_PASSWORD }),
    },
    ANON,
  );
  console.log(`login password baru HTTP ${login.status}`);

  // --- cleanup ---
  if (userId) {
    // Format key baru: apikey = publishable, Bearer = secret.
    const del = await gotoTrue(`/admin/users/${userId}`, { method: "DELETE" }, ANON, SECRET);
    console.log(del.status === 200 ? `cleanup OK (user ${userId} dihapus)` : `cleanup HTTP ${del.status}: ${JSON.stringify(del.json)}`);
  }
}

main().catch((err) => {
  console.error("PROBE GAGAL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

export {};
