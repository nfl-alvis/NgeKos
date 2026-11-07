/**
 * Helper inbox email sementara berbasis mail.tm untuk test integrasi alur OTP.
 * Email yang dikirim Supabase (custom SMTP Resend) benar-benar diterima di
 * inbox ini, lalu kodenya diekstrak untuk diverifikasi lewat endpoint.
 */

const MAILTM_BASE = "https://api.mail.tm";

export interface TempInbox {
  address: string;
  password: string;
  token: string;
  seenIds: Set<string>;
}

export interface InboxMessage {
  id: string;
  subject: string;
  from: { address: string; name?: string };
}

function toArray<T>(value: T[] | { "hydra:member": T[] } | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value["hydra:member"];
}

async function mailTmList<T>(path: string, token?: string): Promise<T[]> {
  const res = await mailTm<T[] | { "hydra:member": T[] }>(path, {}, token);
  return toArray(res);
}

async function mailTm<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let lastError: Error | null = null;
  // mail.tm membatasi QPS; coba ulang 429 dengan jeda sebelum menyerah.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${MAILTM_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (res.ok) return (await res.json()) as T;
    lastError = new Error(`mail.tm ${path} -> ${res.status}: ${await res.text()}`);
    if (res.status !== 429) throw lastError;
    await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
  }
  throw lastError ?? new Error(`mail.tm ${path} failed`);
}

export function randomSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
}

export async function createTempInbox(prefix = "ngekos-test"): Promise<TempInbox> {
  const domainList = await mailTmList<{ domain: string; isActive: boolean }>("/domains?page=1");
  const domain = domainList.find((d) => d.isActive)?.domain ?? domainList[0]?.domain;
  if (!domain) throw new Error("mail.tm: no active domain available");
  const address = `${prefix}-${randomSuffix()}@${domain}`;
  const password = `Inbox${randomSuffix()}!a`;
  await mailTm("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });
  const { token } = await mailTm<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });
  return { address, password, token, seenIds: new Set<string>() };
}

export async function waitForMessage(
  inbox: TempInbox,
  label: string,
  timeoutMs = 120_000,
): Promise<InboxMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await mailTmList<InboxMessage>("/messages?page=1", inbox.token);
    const fresh = items.find((message) => !inbox.seenIds.has(message.id));
    if (fresh) {
      inbox.seenIds.add(fresh.id);
      return fresh;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`[${label}] no email arrived within ${timeoutMs / 1000}s at ${inbox.address}`);
}

export async function readMessage(
  inbox: TempInbox,
  id: string,
): Promise<{ subject: string; text: string | null; html: string[] | null }> {
  return mailTm(`/messages/${id}`, {}, inbox.token);
}

/** Kode OTP 8 digit di body teks email. */
export function extractOtpCode(text: string): string {
  const codes = [...new Set(text.match(/(?<![\d-])\d{8}(?![\d-])/g) ?? [])];
  if (codes.length === 0) throw new Error("no 8-digit OTP code found in email body");
  return codes[0];
}

/** URL verify dari tautan reset password pada email (mendukung alur PKCE). */
export function extractRecoveryLink(text: string, html = ""): string {
  const haystack = `${text}\n${html}`;
  const match = haystack.match(/https:\/\/[^\s\[\]<>"']+\/auth\/v1\/verify\?[^\s\[\]<>"']+/i);
  if (!match) {
    throw new Error("no recovery link found in email body");
  }
  return match[0];
}
