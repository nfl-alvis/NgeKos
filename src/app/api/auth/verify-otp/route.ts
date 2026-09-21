import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const verifyOtpSchema = z
  .object({
    email: z.email().trim(),
    token: z.string().trim().min(6).max(10),
    role: z.enum(["seeker", "owner"]).optional(),
  })
  .strict();

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, verifyOtpSchema);
  const supabase = await createClient();

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
      throw new ApiError(400, "INVALID_OTP", error?.message || "Kode OTP tidak valid atau sudah kedaluwarsa");
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
    "Pengguna";
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
      ...(fullName !== "Pengguna" ? { fullName } : {}),
      ...(phone ? { phone } : {}),
    },
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
