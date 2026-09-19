import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRole = requestUrl.searchParams.get("role") === "owner" ? "OWNER" : "SEEKER";
  const intent = requestUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const locale = requestUrl.searchParams.get("locale") === "en" ? "en" : "id";
  const nextParam = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const safeNext =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : `/${locale}/dashboard`;

  if (oauthError || !code) {
    console.error("Auth callback missing code or OAuth error:", oauthError);
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth code exchange failed:", error.message);
      return NextResponse.redirect(
        new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
      );
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      console.error("Auth user retrieval failed: user is null");
      return NextResponse.redirect(
        new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
      );
    }

    let profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
    if (!profile) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const fullName =
        (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta.name === "string" && meta.name.trim()) ||
        data.user.email?.split("@")[0] ||
        "Pengguna";
      const avatarUrl =
        (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
        (typeof meta.picture === "string" && meta.picture.trim()) ||
        null;

      try {
        profile = await prisma.profile.create({
          data: {
            id: data.user.id,
            email: (data.user.email ?? "").toLowerCase(),
            fullName,
            avatarUrl,
            role: requestedRole,
            locale,
          },
        });
      } catch (createErr) {
        console.error("Auto-provision profile failed, attempting refetch:", createErr);
        profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
      }
    }

    if (!profile) {
      console.error("Profile could not be found or created for user:", data.user.id);
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(`/${locale}/login?error=profile_missing`, requestUrl.origin),
      );
    }

    if (profile.role === "ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}/admin`, requestUrl.origin));
    }

    if (intent === "register") {
      await prisma.profile.update({ where: { id: profile.id }, data: { role: requestedRole } });
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }

    if (profile.role === "OWNER") {
      const destination = safeNext.includes("/dashboard") ? `/${locale}/owner` : safeNext;
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }

    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  } catch (err) {
    console.error("Unhandled error in auth callback:", err);
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
    );
  }
}
