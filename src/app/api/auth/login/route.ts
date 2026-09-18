import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const signInSchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(8).max(128),
    role: z.enum(["seeker", "owner"]),
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
  const requestedRole = input.role === "owner" ? "OWNER" : "SEEKER";
  if (!profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    throw new ApiError(403, "ACCOUNT_DISABLED", "Akun tidak aktif");
  }
  if (profile.role !== requestedRole) {
    await supabase.auth.signOut();
    throw new ApiError(403, "ROLE_MISMATCH", input.role === "owner" ? "Akun ini bukan akun pemilik kos" : "Akun ini bukan akun pencari kos");
  }

  return successResponse({ user: { id: data.user.id, email: data.user.email, role: profile.role } });
});
