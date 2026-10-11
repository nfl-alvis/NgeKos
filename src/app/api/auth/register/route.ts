import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const signUpSchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(8).max(128),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^(\+62|0)8\d{7,12}$/),
    role: z.enum(["seeker", "owner"]),
    locale: z.enum(["id", "en"]).default("id"),
  })
  .strict();

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, signUpSchema);
  const normalizedEmail = input.email.toLowerCase();
  const { registerLocalUser, findLocalUser, setSessionCookie } = await import("@/server/user-store");

  const existingLocal = findLocalUser(normalizedEmail);
  if (existingLocal) {
    throw new ApiError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingProfile) {
    throw new ApiError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }

  // Attempt Supabase signUp via custom SMTP (Resend)
  const supabase = await createClient(10_000);
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/${input.locale}/dashboard`,
      data: {
        full_name: input.fullName,
        phone: input.phone,
        role: input.role,
        locale: input.locale,
      },
    },
  });

  if (error) {
    console.error("Supabase auth.signUp error:", error);
    const duplicate = /already|registered|exists/i.test(error.message);
    throw new ApiError(
      duplicate ? 409 : 400,
      duplicate ? "EMAIL_EXISTS" : "SIGNUP_FAILED",
      duplicate ? "Email sudah terdaftar" : (error.message || "Pendaftaran gagal"),
    );
  }

  const supabaseUser = data.user;
  const requiresEmailConfirmation = !data.session;

  // Pre-register user in local store
  const localUser = registerLocalUser({
    id: supabaseUser?.id,
    email: normalizedEmail,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    role: input.role,
  });

  if (!requiresEmailConfirmation) {
    // If Supabase does not require confirmation, log in immediately
    await setSessionCookie({
      userId: localUser.id,
      email: localUser.email,
      fullName: localUser.fullName,
      role: localUser.role,
      phone: localUser.phone,
    });

    return successResponse(
      { userId: localUser.id, requiresEmailConfirmation: false },
      { status: 201 },
    );
  }

  // Email confirmation is required (OTP / verification link sent via Resend)
  return successResponse(
    { userId: localUser.id, requiresEmailConfirmation: true },
    { status: 201 },
  );
});
