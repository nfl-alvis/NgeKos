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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const user = data.user;
  const email = user.email;
  if (!email) return null;
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
