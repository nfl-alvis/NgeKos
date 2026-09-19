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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
  }

  const profile = await prisma.profile.findUnique({ where: { id: data.user.id }, select: { role: true, status: true } });
  if (!profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
  }

  if (input.role) {
    const requestedRole = input.role === "admin" ? "ADMIN" : input.role === "owner" ? "OWNER" : "SEEKER";
    if (profile.role !== requestedRole) {
      await supabase.auth.signOut();
      const roleName = input.role === "admin" ? "admin" : input.role === "owner" ? "pemilik kos" : "pencari kos";
      throw new ApiError(403, "ROLE_MISMATCH", `Akun ini bukan akun ${roleName}`);
    }
  }

  return successResponse({ user: { id: data.user.id, email: data.user.email, role: profile.role } });
});
