import "server-only";
import type { Profile, UserRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/server/http";
import type { VerifiedSession } from "@/server/user-store";

export type AuthContext = { authUser: User; profile: Profile };

function requestedRole(user: User): UserRole {
  return user.user_metadata?.role === "owner" ? "OWNER" : "SEEKER";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authUserFromProfile(profile: Profile): User {
  return {
    id: profile.id,
    email: profile.email,
    user_metadata: {
      full_name: profile.fullName,
      role: profile.role.toLowerCase(),
    },
  } as unknown as User;
}

/**
 * Resolusi profil OTORITATIF untuk cookie sesi yang sudah terverifikasi.
 *
 * PERBAIKAN F-01: `role` hanya boleh berasal dari database atau store akun lokal.
 * Nilai role dari cookie tidak pernah dipercaya. Sumber yang tidak ditemukan
 * menghasilkan `null` (gagal tertutup), bukan profil SEEKER dari cookie.
 */
async function resolveAuthoritativeProfile(session: VerifiedSession) {
  const { findLocalUser, profileFromSession } = await import("@/server/user-store");

  if (UUID_RE.test(session.userId)) {
    const byId = await prisma.profile.findUnique({ where: { id: session.userId } });
    if (byId) return byId;
  }

  const byEmail = await prisma.profile.findUnique({
    where: { email: session.email.toLowerCase() },
  });
  if (byEmail) return byEmail;

  // Akun demo lokal (mis. admin@ngekost.id) tidak selalu ada di tabel profiles.
  // Role-nya tetap otoritatif karena berasal dari source, bukan dari cookie.
  const local = findLocalUser(session.email);
  if (local && local.id === session.userId) {
    return profileFromSession(session, local);
  }
  return null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const { getSessionCookie } = await import("@/server/user-store");
  const session = await getSessionCookie();
  if (session) {
    let profile: Profile | null = null;

    try {
      profile = await resolveAuthoritativeProfile(session);
    } catch {
      // Database tidak terjangkau. PERBAIKAN F-01: JANGAN jatuh kembali ke
      // kredensial dari cookie — cookie tanpa profil otoritatif tidak cukup.
      profile = null;
    }

    if (profile) {
      if (profile.status !== "ACTIVE") {
        throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
      }
      return { authUser: authUserFromProfile(profile), profile };
    }
    // Sesi tidak dapat diverifikasi ke sumber otoritatif: continue ke Supabase
    // atau berakhir sebagai tidak terautentikasi (fail-closed).
  }

  try {
    const supabase = await createClient();
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error("Supabase auth timeout") }), 2500)
    );
    const { data, error } = await Promise.race([userPromise, timeoutPromise]);
    if (error || !data.user?.email) return null;

    const user = data.user;
    const email = user.email;
    if (!email) return null;

    try {
      const profile = await prisma.profile.upsert({
        where: { id: user.id },
        update: { email: email.toLowerCase(), lastSeenAt: new Date() },
        create: {
          id: user.id,
          email: email.toLowerCase(),
          fullName: user.user_metadata?.full_name?.trim() || email.split("@")[0],
          phone: user.user_metadata?.phone || null,
          role: requestedRole(user),
          locale: user.user_metadata?.locale === "en" ? "en" : "id",
          lastSeenAt: new Date(),
        },
      });

      if (profile.status !== "ACTIVE") {
        throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
      }
      return { authUser: user, profile };
    } catch (dbErr) {
      if (dbErr instanceof ApiError) throw dbErr;
      // Fallback if DB is unavailable
      const fallbackProfile: Profile = {
        id: user.id,
        email: email.toLowerCase(),
        fullName: user.user_metadata?.full_name?.trim() || email.split("@")[0],
        phone: user.user_metadata?.phone || null,
        avatarUrl: null,
        birthPlace: null,
        occupation: null,
        role: requestedRole(user),
        adminRole: null,
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
      return { authUser: user, profile: fallbackProfile };
    }
  } catch {
    return null;
  }
}

export async function requireUser(allowedRoles?: readonly UserRole[]): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
  if (allowedRoles && !allowedRoles.includes(auth.profile.role)) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk tindakan ini");
  }
  return auth;
}

export function assertOwnerOrAdmin(profile: Profile, ownerId: string) {
  if (profile.role !== "ADMIN" && profile.id !== ownerId) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke data ini");
  }
}
