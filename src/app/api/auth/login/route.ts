import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const signInSchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(8).max(128),
    role: z.enum(["seeker", "owner", "admin"]).optional(),
  })
  .strict();

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, signInSchema);
  const { verifyLocalPassword, setSessionCookie } = await import("@/server/user-store");

  // 1. Check local/demo accounts first for instant, reliable login
  const localUser = verifyLocalPassword(input.email, input.password);
  if (localUser) {
    if (input.role) {
      const requestedRole = input.role === "admin" ? "ADMIN" : input.role === "owner" ? "OWNER" : "SEEKER";
      if (localUser.role !== requestedRole) {
        const roleName = input.role === "admin" ? "admin" : input.role === "owner" ? "pemilik kos" : "pencari kos";
        throw new ApiError(403, "ROLE_MISMATCH", `Akun ini bukan akun ${roleName}`);
      }
    }

    let telegramChatId: string | null = localUser.telegramChatId ?? null;
    let telegramUsername: string | null = localUser.telegramUsername ?? null;
    let telegramConnectedAt: string | null = localUser.telegramConnectedAt ?? null;

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(localUser.id);
      const dbProfile = isUuid
        ? await prisma.profile.findUnique({
            where: { id: localUser.id },
            select: { telegramChatId: true, telegramUsername: true, telegramConnectedAt: true },
          })
        : await prisma.profile.findUnique({
            where: { email: localUser.email.toLowerCase() },
            select: { telegramChatId: true, telegramUsername: true, telegramConnectedAt: true },
          });

      if (dbProfile) {
        telegramChatId = dbProfile.telegramChatId;
        telegramUsername = dbProfile.telegramUsername;
        telegramConnectedAt = dbProfile.telegramConnectedAt ? dbProfile.telegramConnectedAt.toISOString() : null;
      }
    } catch {}

    await setSessionCookie({
      userId: localUser.id,
      email: localUser.email,
      fullName: localUser.fullName,
      role: localUser.role,
      adminRole: localUser.adminRole,
      phone: localUser.phone,
      telegramChatId,
      telegramUsername,
      telegramConnectedAt,
    });

    // Background attempt to sign in to Supabase if reachable
    try {
      const supabase = await createClient();
      await supabase.auth.signInWithPassword({ email: input.email, password: input.password }).catch(() => {});
    } catch {}

    return successResponse({ user: { id: localUser.id, email: localUser.email, role: localUser.role } });
  }

  // 2. Otherwise authenticate against Supabase with a 2.5s timeout
  try {
    const supabase = await createClient();
    const loginPromise = supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error("Auth timeout") }), 2500)
    );
    const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

    if (error || !data.user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
    }

    let role: "SEEKER" | "OWNER" | "ADMIN" = "SEEKER";
    let dbProfile: {
      role: "SEEKER" | "OWNER" | "ADMIN";
      status: string;
      telegramChatId: string | null;
      telegramUsername: string | null;
      telegramConnectedAt: Date | null;
    } | null = null;

    try {
      dbProfile = await prisma.profile.findUnique({
        where: { id: data.user.id },
        select: {
          role: true,
          status: true,
          telegramChatId: true,
          telegramUsername: true,
          telegramConnectedAt: true,
        },
      });
      if (dbProfile) {
        if (dbProfile.status !== "ACTIVE") {
          await supabase.auth.signOut();
          throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
        }
        role = dbProfile.role;
      } else {
        const requested = data.user.user_metadata?.role === "owner" ? "OWNER" : "SEEKER";
        role = requested;
      }
    } catch (dbErr) {
      if (dbErr instanceof ApiError) throw dbErr;
      role = data.user.user_metadata?.role === "owner" ? "OWNER" : "SEEKER";
    }

    if (input.role) {
      const requestedRole = input.role === "admin" ? "ADMIN" : input.role === "owner" ? "OWNER" : "SEEKER";
      if (role !== requestedRole) {
        await supabase.auth.signOut().catch(() => {});
        const roleName = input.role === "admin" ? "admin" : input.role === "owner" ? "pemilik kos" : "pencari kos";
        throw new ApiError(403, "ROLE_MISMATCH", `Akun ini bukan akun ${roleName}`);
      }
    }

    await setSessionCookie({
      userId: data.user.id,
      email: data.user.email ?? input.email,
      fullName: data.user.user_metadata?.full_name ?? input.email.split("@")[0],
      role,
      telegramChatId: dbProfile?.telegramChatId ?? null,
      telegramUsername: dbProfile?.telegramUsername ?? null,
      telegramConnectedAt: dbProfile?.telegramConnectedAt ? dbProfile.telegramConnectedAt.toISOString() : null,
    });

    return successResponse({ user: { id: data.user.id, email: data.user.email, role } });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
  }
});
