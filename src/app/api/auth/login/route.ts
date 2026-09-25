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

    await setSessionCookie({
      userId: localUser.id,
      email: localUser.email,
      fullName: localUser.fullName,
      role: localUser.role,
      adminRole: localUser.adminRole,
      phone: localUser.phone,
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
    try {
      const profile = await prisma.profile.findUnique({ where: { id: data.user.id }, select: { role: true, status: true } });
      if (profile) {
        if (profile.status !== "ACTIVE") {
          await supabase.auth.signOut();
          throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
        }
        role = profile.role;
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
    });

    return successResponse({ user: { id: data.user.id, email: data.user.email, role } });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
  }
});
