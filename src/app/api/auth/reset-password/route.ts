import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { resetPasswordSchema } from "@/server/validation";

const OTP_CODE_RE = /^\d{6,10}$/;

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, resetPasswordSchema);

  // Mode OTP: verifikasi kode dari email (atau token hash dari tautan reset),
  // lalu perbarui password memakai sesi recovery yang baru saja didapat.
  if ("email" in input && "token" in input) {
    const supabase = await createClient(10_000);
    const email = input.email.toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp(
      OTP_CODE_RE.test(input.token)
        ? { email, token: input.token, type: "recovery" }
        : { email, token_hash: input.token, type: "recovery" },
    );
    if (error || !data.user) {
      // Pesan dibuat generik agar detail internal GoTrue tidak bocor.
      throw new ApiError(400, "INVALID_OTP", "The reset code is invalid or has expired");
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: input.password });
    if (updateError) {
      throw new ApiError(400, "RESET_FAILED", updateError.message || "Failed to update the password");
    }

    // User-store lokal diverifikasi lebih dulu saat login — sinkronkan agar
    // kata sandi lama tidak tetap bisa dipakai setelah reset.
    const { updateLocalPassword } = await import("@/server/user-store");
    updateLocalPassword(email, input.password);

    await supabase.auth.signOut();

    return successResponse({ ok: true });
  }

  // Mode sesi: pemanggil membawa sesi hasil mengklik tautan reset dari email.
  const { getAuthContext } = await import("@/server/auth");
  const auth = await getAuthContext();
  if (!auth) {
    throw new ApiError(
      401,
      "INVALID_RESET_LINK",
      "This reset link is invalid or has expired. Please request a new one.",
    );
  }

  const supabase = await createClient(10_000);
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) {
    throw new ApiError(400, "RESET_FAILED", error.message || "Failed to update the password");
  }

  // User-store lokal diverifikasi lebih dulu saat login — sinkronkan agar
  // kata sandi lama tidak tetap bisa dipakai setelah reset.
  const { updateLocalPassword } = await import("@/server/user-store");
  updateLocalPassword(auth.profile.email, input.password);

  return successResponse({ ok: true });
});
