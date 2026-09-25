import "server-only";
import { cookies } from "next/headers";
import type { Profile, UserRole, AdminRole } from "@prisma/client";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  adminRole?: AdminRole | null;
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

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  adminRole?: AdminRole | null;
  phone?: string | null;
}

export async function setSessionCookie(user: SessionPayload) {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(user)).toString("base64url");
  cookieStore.set("nk_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSessionCookie(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("nk_session");
    if (!cookie?.value) return null;
    const json = Buffer.from(cookie.value, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("nk_session");
}

export function profileFromSession(session: SessionPayload): Profile {
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    phone: session.phone ?? null,
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: session.role,
    adminRole: session.adminRole ?? (session.role === "ADMIN" ? "SUPER" : null),
    status: "ACTIVE",
    locale: "id",
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}
