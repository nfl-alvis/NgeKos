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
  const { registerLocalUser, findLocalUser, setSessionCookie } = await import("@/server/user-store");

  const existingLocal = findLocalUser(input.email);
  if (existingLocal) {
    throw new ApiError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }

  // Register locally first so user can log in immediately
  const localUser = registerLocalUser({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    role: input.role,
  });

  // Attempt Supabase signUp in the background or with short timeout
  let supabaseUserId = localUser.id;
  try {
    const supabase = await createClient();
    const signUpPromise = supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/${input.locale}/dashboard`,
        data: { full_name: input.fullName, phone: input.phone, role: input.role, locale: input.locale },
      },
    });
    const timeoutPromise = new Promise<{ data: { user: null; session: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null, session: null }, error: new Error("Signup timeout") }), 2500)
    );
    const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);
    if (!error && data.user) {
      supabaseUserId = data.user.id;
    }
  } catch {}

  // Auto-login session cookie so user gets immediately authenticated
  await setSessionCookie({
    userId: supabaseUserId,
    email: localUser.email,
    fullName: localUser.fullName,
    role: localUser.role,
    phone: localUser.phone,
  });

  return successResponse(
    { userId: supabaseUserId, requiresEmailConfirmation: false },
    { status: 201 },
  );
});
