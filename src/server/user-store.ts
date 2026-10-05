import "server-only";
import { cookies } from "next/headers";
import type { Profile, UserRole, AdminRole } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getSessionSecret,
  verifySessionToken,
  type SessionTokenPayload,
} from "@/server/session-token";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  adminRole?: AdminRole | null;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramConnectedAt?: string | null;
}

// In-memory registry with pre-seeded demo accounts
const userStore = new Map<string, StoredUser>([
  [
    "admin@ngekost.id",
    {
      id: "a1111111-1111-1111-1111-111111111111",
      email: "admin@ngekost.id",
      passwordHash: "Password123!",
      fullName: "Bayu Pratama (Admin Demo)",
      role: "ADMIN",
      adminRole: "SUPER",
    },
  ],
  [
    "owner@ngekost.id",
    {
      id: "58983471-0904-40df-beb8-3a51888b176b",
      email: "owner@ngekost.id",
      passwordHash: "Password123!",
      fullName: "Ratri Wulandari (Owner Demo)",
      role: "OWNER",
      adminRole: null,
      telegramChatId: "8169372099",
      telegramUsername: "spawn2pwn",
      telegramConnectedAt: "2026-09-28T07:59:10.141Z",
    },
  ],
  [
    "ngekostygocrudemo@uberip.com",
    {
      id: "b2222222-2222-2222-2222-222222222222",
      email: "ngekostygocrudemo@uberip.com",
      passwordHash: "NgekostDemo#2026",
      fullName: "Budi Santoso (Seeker Demo)",
      role: "SEEKER",
      adminRole: null,
    },
  ],
  [
    "informatikappg@gmail.com",
    {
      id: "9defd2b2-d0e0-4594-9160-88359ba2e466",
      email: "informatikappg@gmail.com",
      passwordHash: "Password123!",
      fullName: "ppg Informatika",
      role: "SEEKER",
      adminRole: null,
    },
  ],
]);

export function findLocalUser(email: string): StoredUser | undefined {
  return userStore.get(email.toLowerCase().trim());
}

export function registerLocalUser(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  role: "seeker" | "owner";
}): StoredUser {
  const email = data.email.toLowerCase().trim();
  const userRole: UserRole = data.role === "owner" ? "OWNER" : "SEEKER";
  const newUser: StoredUser = {
    id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    email,
    passwordHash: data.password,
    fullName: data.fullName.trim(),
    phone: data.phone?.trim() || null,
    role: userRole,
    adminRole: null,
  };
  userStore.set(email, newUser);
  return newUser;
}

export function verifyLocalPassword(email: string, password: string): StoredUser | null {
  const user = findLocalUser(email);
  if (!user) return null;
  if (user.passwordHash === password) {
    return user;
  }
  return null;
}

/**
 * Data yang dikirim ke `setSessionCookie`.
 *
 * PERINGATAN KEAMANAN: `role` dan `adminRole` TIDAK lagi masuk ke cookie — token yang
 * ditulis hanya berisi userId + email + waktu kedaluwarsa (lihat session-token.ts).
 * Field di sini hanya dipakai server-side sebagai sumber data display, dan role
 * otoritatif selalu diambil ulang dari database / store lokal.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  fullName?: string;
  role?: UserRole;
  adminRole?: AdminRole | null;
  phone?: string | null;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramConnectedAt?: string | null;
}

/** Identitas terautentikasi hasil pembacaan + verifikasi cookie. */
export type VerifiedSession = SessionTokenPayload;

/**
 * Menulis cookie sesi bertanda tangan (perbaikan F-01).
 * Token berisi HANYA userId + email + exp, ditandatangani HMAC-SHA256 dengan
 * rahasia server. Nilai `role` dari argumen diabaikan untuk keperluan cookie.
 */
export async function setSessionCookie(user: SessionPayload) {
  const cookieStore = await cookies();
  const token = createSessionToken({ userId: user.userId, email: user.email });
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Membaca cookie sesi dan MEMVERIFIKASI tanda tangannya.
 * Mengembalikan null untuk cookie yang tidak bertanda tangan, buatan penetran,
 * salah tanda tangan, atau sudah kedaluwarsa.
 */
export async function getSessionCookie(): Promise<VerifiedSession | null> {
  try {
    const cookieStore = await cookies();
    return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value, getSessionSecret());
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Membangun `Profile` dari sesi terverifikasi.
 *
 * `role` TIDAK pernah diambil dari cookie. When profil ditemukan di store
 * server-side, role otoritatif dari sana yang dipakai; `session` hanya menyumbang
 * id dan email. `authoritative` WAJIB diisi untuk sesi non-database; tanpa itu
 * peran default SEEKER yang diberikan (fail-closed), bukan escalate.
 */
export function profileFromSession(
  session: VerifiedSession,
  authoritative?: Pick<StoredUser, "role" | "adminRole" | "fullName" | "phone"> | null,
): Profile {
  return {
    id: session.userId,
    email: session.email,
    fullName: authoritative?.fullName ?? "",
    phone: authoritative?.phone ?? null,
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: authoritative?.role ?? "SEEKER",
    adminRole: authoritative?.adminRole ?? null,
    status: "ACTIVE",
    locale: "id",
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    telegramChatId: null,
    telegramUsername: null,
    telegramConnectedAt: null,
    telegramConnectToken: null,
    telegramConnectTokenExpiresAt: null,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}