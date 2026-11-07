import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { verifyOtpSchema } from "@/server/validation";

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, verifyOtpSchema);
  const supabase = await createClient(10_000);

  const { data: initialData, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: "signup",
  });
  let data = initialData;

  if (error || !data.user) {
    const fallback = await supabase.auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: "email",
    });
    if (fallback.error || !fallback.data?.user) {
      // Pesan dibuat generik agar detail internal GoTrue tidak bocor.
      throw new ApiError(400, "INVALID_OTP", "The verification code is invalid or has expired");
    }
    data = fallback.data;
  }

  const user = data.user!;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = input.role
    ? input.role === "owner"
      ? "OWNER"
      : "SEEKER"
    : meta.role === "owner"
      ? "OWNER"
      : "SEEKER";
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    user.email?.split("@")[0] ||
    "User";
  const phone = (typeof meta.phone === "string" && meta.phone.trim()) || null;
  const locale = (typeof meta.locale === "string" && meta.locale.trim()) || "id";

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: (user.email ?? input.email).toLowerCase(),
      fullName,
      phone,
      role,
      locale,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
      role,
      ...(fullName !== "User" ? { fullName } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  const { findLocalUser, registerLocalUser, setSessionCookie } = await import("@/server/user-store");
  // Hanya isi user lokal bila belum ada — jangan menimpa password yang
  // tersimpan saat registrasi.
  if (!findLocalUser(profile.email)) {
    registerLocalUser({
      id: user.id,
      email: profile.email,
      password: "",
      fullName: profile.fullName,
      phone: profile.phone ?? "",
      role: profile.role === "OWNER" ? "owner" : "seeker",
    });
  }

  await setSessionCookie({
    userId: user.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    phone: profile.phone ?? undefined,
  });

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      role: profile.role,
      fullName: profile.fullName,
    },
  });
});
