import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { parseJson, successResponse, withApi } from "@/server/http";
import { forgotPasswordSchema } from "@/server/validation";

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, forgotPasswordSchema);

  const supabase = await createClient(10_000);
  // resetPasswordForEmail tidak memberi tahu apakah email terdaftar; respons
  // selalu sukses agar keberadaan akun tidak bisa ditebak. Email reset dikirim
  // Supabase via custom SMTP (Resend) dan memuat tautan reset ber-token.
  await supabase.auth.resetPasswordForEmail(input.email.toLowerCase(), {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/${input.locale}/reset-password`,
  });

  return successResponse({
    message: "If this email is registered, a password reset link has been sent.",
  });
});
