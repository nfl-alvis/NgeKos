import { createClient } from "@/lib/supabase/server";
import { successResponse, withApi } from "@/server/http";

export const POST = withApi(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return successResponse({ signedOut: true });
});
