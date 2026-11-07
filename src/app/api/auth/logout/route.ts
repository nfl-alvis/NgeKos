import { createClient } from "@/lib/supabase/server";
import { successResponse, withApi } from "@/server/http";

export const POST = withApi(async (request: Request) => {
  try {
    const { getAuthContext } = await import("@/server/auth");
    const auth = await getAuthContext();
    if (auth?.profile && auth.profile.role === "ADMIN") {
      const { recordAuditLog } = await import("@/server/audit-service");
      await recordAuditLog({
        actor: auth.profile,
        action: "auth.logout",
        entityType: "SESSION",
        entityId: auth.profile.id,
        description: `Admin ${auth.profile.fullName} logged out`,
        metadata: {
          target: auth.profile.email,
          email: auth.profile.email,
          role: "ADMIN",
        },
        request,
      });
    }
  } catch {
    // Non-blocking for logout
  }

  const { clearSessionCookie } = await import("@/server/user-store");
  await clearSessionCookie();
  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => {});
  } catch {}
  return successResponse({ signedOut: true });
});
