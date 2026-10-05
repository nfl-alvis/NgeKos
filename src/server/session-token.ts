/**
 * Token sesi bertanda tangan (HMAC-SHA256) untuk cookie `nk_session`.
 *
 * MODUL SINI ADALAH PERBAIKAN F-01 (lihat security_best_practices_report.md).
 * Sebelumnya `nk_session` berisi JSON base64url mentah tanpa tanda tangan, dan
 * `getAuthContext()` mempercayai `role`/`adminRole` di dalamnya — sehingga siapa pun
 * bisa membuat cookie ADMIN palsu. Sekarang payload ditandatangani dengan rahasia
 * server dan diverifikasi dengan `timingSafeEqual` saat dibaca.
 *
 * Aturan keras: payload ini HANYA boleh memuat identitas (userId + email + waktu
 * kedaluwarsa). TIDAK BOLEH memuat `role`, `adminRole`, atau field apa pun yang
 * memengaruhi otorisasi — role selalu dibaca ulang dari database / store server-side.
 *
 * Modul ini sengaja bebas `server-only` dan bebas Prisma supaya bisa dipakai oleh
 * `src/proxy.ts` yang berjalan di Proxy runtime.
 */

import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "nk_session";
/** 7 hari, sama dengan maxAge cookie. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionTokenPayload {
  userId: string;
  email: string;
  /** Waktu kedaluwarsa (detik sejak epoch). */
  exp: number;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Rahasia penanda tangan. Prioritaskan SESSION_SECRET; bila belum diisi, turunkan
 * deterministik dari SUPABASE_SECRET_KEY (server-only) agar aplikasi tetap berjalan.
 * Wajib set SESSION_SECRET eksplisit di produksi agar rotasi rahasia lain tidak
 * diam-diam membatalkan semua sesi.
 */
export function getSessionSecret(): string {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;

  const derivedFrom = process.env.SUPABASE_SECRET_KEY?.trim();
  if (derivedFrom && derivedFrom.length >= 16) {
    return sha256Hex(`ngekost.session.v1|${derivedFrom}`);
  }

  // Fallback dev-only: nilai tetap agar sesi tidak random-antray setiap restart.
  // Di produksi ini harus dicegah oleh validasi env (lihat getSessionSecretWarnings).
  return sha256Hex("ngekost.session.v1|dev-only-insecure-session-secret");
}

/** Peringatan yang harus diperbaiki sebelum deploy produksi. */
export function getSessionSecretWarnings(): string[] {
  const warnings: string[] = [];
  const explicit = process.env.SESSION_SECRET?.trim();
  if (!explicit || explicit.length < 32) {
    warnings.push(
      "SESSION_SECRET belum diisi (minimal 32 karakter). Sesi saat ini ditandatangani dengan rahasia turunan — setel SESSION_SECRET eksplisit sebelum produksi.",
    );
  }
  return warnings;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("base64url");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isValidPayload(value: unknown): value is SessionTokenPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    candidate.userId.length > 0 &&
    candidate.userId.length <= 128 &&
    typeof candidate.email === "string" &&
    candidate.email.length > 0 &&
    candidate.email.length <= 320 &&
    typeof candidate.exp === "number" &&
    Number.isFinite(candidate.exp)
  );
}

/** Bangun token bertanda tangan untuk payload sesi. */
export function createSessionToken(
  payload: Omit<SessionTokenPayload, "exp"> & { exp?: number },
  secret = getSessionSecret(),
  nowMs = Date.now(),
): string {
  const full: SessionTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    exp: payload.exp ?? Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verifikasi token sesi. Mengembalikan null untuk token yang rusak, tidak bertanda
 * tangan, bertanda tangan salah (termasuk token buatan penetran), atau kedaluwarsa.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret = getSessionSecret(),
  nowMs = Date.now(),
): SessionTokenPayload | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const body = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = sign(body, secret);
  if (!timingSafeEqualStrings(providedSignature, expectedSignature)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isValidPayload(decoded)) return null;

  if (decoded.exp <= Math.floor(nowMs / 1000)) return null;
  return decoded;
}