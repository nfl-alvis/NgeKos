import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const resendOtpSchema = z
  .object({
    email: z.email().trim(),
  })
  .strict();

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, resendOtpSchema);
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
  });

  if (error) {
    throw new ApiError(400, "RESEND_FAILED", error.message || "Gagal mengirim ulang kode OTP");
  }

  return successResponse({ resent: true });
});
