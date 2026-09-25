import { createClient } from "@/lib/supabase/server";
import { successResponse, withApi } from "@/server/http";

export const POST = withApi(async () => {
  const { clearSessionCookie } = await import("@/server/user-store");
  await clearSessionCookie();
  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => {});
  } catch {}
  return successResponse({ signedOut: true });
});
