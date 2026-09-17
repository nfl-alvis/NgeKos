import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";

const signInSchema = z.object({ email: z.email().trim(), password: z.string().min(8).max(128) }).strict();

export const POST = withApi(async (request: Request) => {
  const input = await parseJson(request, signInSchema);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error || !data.user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
  }
  return successResponse({ user: { id: data.user.id, email: data.user.email } });
});
