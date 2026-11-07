import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { resendOtpSchema } from "@/server/validation";

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, resendOtpSchema);
  const supabase = await createClient(10_000);

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
  });

  if (error) {
    throw new ApiError(400, "RESEND_FAILED", error.message || "Failed to resend the verification code");
  }

  return successResponse({ resent: true });
});
