import "server-only";
import type { Profile, UserRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/server/http";

export type AuthContext = { authUser: User; profile: Profile };

function requestedRole(user: User): UserRole {
  return user.user_metadata?.role === "owner" ? "OWNER" : "SEEKER";
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const { getSessionCookie, profileFromSession } = await import("@/server/user-store");
  const session = await getSessionCookie();
  if (session) {
    const profile = profileFromSession(session);
    const authUser = {
      id: session.userId,
      email: session.email,
      user_metadata: {
        full_name: session.fullName,
        role: session.role.toLowerCase(),
      },
    } as unknown as User;
    return { authUser, profile };
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
        adminRole: requestedRole(user) === "ADMIN" ? "SUPER" : null,
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
