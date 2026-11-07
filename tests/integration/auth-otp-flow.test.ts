/**
 * Test integrasi alur OTP registrasi + lupa password, end-to-end lewat
 * endpoint API dengan email yang benar-benar dikirim:
 *   Supabase Auth (custom SMTP Resend) -> inbox email sementara (mail.tm).
 *
 * Yang di-mock: cookies() (penyimpanan sesi in-memory) dan Prisma (agar test
 * tidak menulis ke database development). Selain itu semua nyata: origin
 * check, zod, user-store lokal, GoTrue, dan pengiriman email.
 *
 * Bila jaringan/mail.tm tidak tersedia, seluruh suite dilewati.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, { name: string; value: string }>(),
  profileUpserts: [] as unknown[],
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...h.store.values()],
    get: (name: string) => h.store.get(name),
    set: (name: string, value: string) => {
      h.store.set(name, { name, value });
    },
    delete: (name: string) => {
      h.store.delete(name);
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async ({ create }: { create: unknown }) => {
        h.profileUpserts.push(create);
        return create;
      }),
    },
  },
}));

import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as verifyOtpPOST } from "@/app/api/auth/verify-otp/route";
import { POST as forgotPasswordPOST } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordPOST } from "@/app/api/auth/reset-password/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { SESSION_COOKIE_NAME } from "@/server/session-token";
import {
  createTempInbox,
  extractOtpCode,
  extractRecoveryLink,
  readMessage,
  waitForMessage,
  type TempInbox,
} from "../helpers/mailtm";

const PASSWORD = "TestPass!2026";
const NEW_PASSWORD = "NewTestPass!2026";
// profiles.phone unik — nomor acak mencegah tabrakan dengan run sebelumnya.
const uniquePhone = () => `08${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

const mailTmReachable = await fetch("https://api.mail.tm/domains?page=1")
  .then((res) => res.ok)
  .catch(() => false);

function api(path: string, body: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

async function jsonOf(response: Response) {
  return (await response.json()) as {
    success: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  };
}

/** Hapus user percobaan dari Supabase Auth + baris profiles-nya. */
async function cleanupTestUser(userId: string, email: string): Promise<void> {
  if (!SECRET) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: ANON, Authorization: `Bearer ${SECRET}` },
  }).catch(() => {});
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: { apikey: ANON, Authorization: `Bearer ${SECRET}` },
  }).catch(() => {});
}

const createdUsers: { userId: string; email: string }[] = [];

async function registerVerifiedSeeker(inbox: TempInbox): Promise<string | null> {
  const regRes = await registerPOST(
    api("/api/auth/register", {
      email: inbox.address,
      password: PASSWORD,
      fullName: "Test Seeker",
      phone: uniquePhone(),
      role: "seeker",
      locale: "id",
    }),
  );
  expect(regRes.status).toBe(201);
  const regBody = await jsonOf(regRes);
  expect(regBody.data?.requiresEmailConfirmation).toBe(true);
  const userId = regBody.data?.userId as string | undefined;
  if (userId) createdUsers.push({ userId, email: inbox.address });

  const mail = await waitForMessage(inbox, "signup-otp");
  const msg = await readMessage(inbox, mail.id);
  const code = extractOtpCode(msg.text ?? "");
  const verifyRes = await verifyOtpPOST(
    api("/api/auth/verify-otp", { email: inbox.address, token: code, role: "seeker" }),
  );
  expect(verifyRes.status).toBe(200);
  return userId ?? null;
}

describe.skipIf(!mailTmReachable)("auth OTP + forgot password (temp email)", () => {
  let inbox: TempInbox;

  beforeEach(async () => {
    h.store.clear();
    h.profileUpserts.length = 0;
    inbox = await createTempInbox();
  });

  afterAll(async () => {
    for (const { userId, email } of createdUsers) {
      await cleanupTestUser(userId, email);
    }
  });

  it(
    "sends an 8-digit OTP on registration, rejects a wrong code, then verifies and signs in",
    async () => {
      const regRes = await registerPOST(
        api("/api/auth/register", {
          email: inbox.address,
          password: PASSWORD,
          fullName: "Test Seeker",
          phone: uniquePhone(),
          role: "seeker",
          locale: "id",
        }),
      );
      expect(regRes.status).toBe(201);
      const regBody = await jsonOf(regRes);
      expect(regBody.data?.requiresEmailConfirmation).toBe(true);
      const userId = regBody.data?.userId as string;
      createdUsers.push({ userId, email: inbox.address });

      const mail = await waitForMessage(inbox, "signup-otp");
      const msg = await readMessage(inbox, mail.id);
      const code = extractOtpCode(msg.text ?? "");
      expect(code).toMatch(/^\d{8}$/);

      const badRes = await verifyOtpPOST(
        api("/api/auth/verify-otp", {
          email: inbox.address,
          token: code === "12345678" ? "87654321" : "12345678",
          role: "seeker",
        }),
      );
      expect(badRes.status).toBe(400);
      const badBody = await jsonOf(badRes);
      expect(badBody.error?.message).toBe("The verification code is invalid or has expired");

      const verifyRes = await verifyOtpPOST(
        api("/api/auth/verify-otp", { email: inbox.address, token: code, role: "seeker" }),
      );
      expect(verifyRes.status).toBe(200);
      const verifyBody = await jsonOf(verifyRes);
      expect(verifyBody.data?.user).toMatchObject({ email: inbox.address, role: "SEEKER" });
      expect(h.store.has(SESSION_COOKIE_NAME)).toBe(true);

      const loginRes = await loginPOST(
        api("/api/auth/login", { email: inbox.address, password: PASSWORD, role: "seeker" }),
      );
      expect(loginRes.status).toBe(200);
      const loginBody = await jsonOf(loginRes);
      expect((loginBody.data?.user as { email?: string } | undefined)?.email).toBe(inbox.address);
    },
    240_000,
  );

  it(
    "emails a reset link on forgot-password and completes the reset through it",
    async () => {
      await registerVerifiedSeeker(inbox);

      const forgotRes = await forgotPasswordPOST(
        api("/api/auth/forgot-password", { email: inbox.address, locale: "id" }),
      );
      expect(forgotRes.status).toBe(200);
      const forgotBody = await jsonOf(forgotRes);
      expect(forgotBody.data?.message).toBe(
        "If this email is registered, a password reset link has been sent.",
      );

      const mail = await waitForMessage(inbox, "reset-link");
      const msg = await readMessage(inbox, mail.id);
      const verifyUrl = extractRecoveryLink(msg.text ?? "", (msg.html ?? []).join("\n"));

      // Ikuti tautan verify (alur PKCE): GoTrue mengarahkan kembali dengan
      // `code` yang dipertukarkan memakai verifier di cookie store mock.
      const follow = await fetch(verifyUrl, { redirect: "manual" });
      const location = follow.headers.get("location") ?? "";
      expect(location).toContain("code=");
      const authCode = new URL(location).searchParams.get("code") ?? "";

      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient(10_000);
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
      expect(exchangeError).toBeNull();

      const resetRes = await resetPasswordPOST(
        api("/api/auth/reset-password", { password: NEW_PASSWORD }),
      );
      expect(resetRes.status).toBe(200);
      const resetBody = await jsonOf(resetRes);
      expect(resetBody.data?.ok).toBe(true);

      const oldLogin = await loginPOST(
        api("/api/auth/login", { email: inbox.address, password: PASSWORD }),
      );
      expect(oldLogin.status).toBe(401);
      const oldBody = await jsonOf(oldLogin);
      expect(oldBody.error?.message).toBe("Email or password is incorrect");

      const newLogin = await loginPOST(
        api("/api/auth/login", { email: inbox.address, password: NEW_PASSWORD }),
      );
      expect(newLogin.status).toBe(200);
    },
    300_000,
  );

  it("responds to forgot-password without leaking whether the email exists", async () => {
    const res = await forgotPasswordPOST(
      api("/api/auth/forgot-password", { email: "nobody-does-not-exist@example.com" }),
    );
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.data?.message).toBe(
      "If this email is registered, a password reset link has been sent.",
    );
    expect(h.profileUpserts).toHaveLength(0);
  }, 60_000);
});
