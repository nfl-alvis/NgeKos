import { z } from "zod";
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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/${input.locale}/dashboard`,
      data: { full_name: input.fullName, phone: input.phone, role: input.role, locale: input.locale },
    },
  });

  if (error) {
    const duplicate = /already|registered|exists/i.test(error.message);
    throw new ApiError(duplicate ? 409 : 400, duplicate ? "EMAIL_EXISTS" : "SIGNUP_FAILED", duplicate ? "Email sudah terdaftar" : "Pendaftaran gagal");
  }

  return successResponse(
    { userId: data.user?.id ?? null, requiresEmailConfirmation: !data.session },
    { status: 201 },
  );
});
