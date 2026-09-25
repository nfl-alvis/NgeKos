import { NextResponse } from "next/server";
import { UserRole, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRole: UserRole = requestUrl.searchParams.get("role") === "owner" ? UserRole.OWNER : UserRole.SEEKER;
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
    const supabase = await createClient(10_000);
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth code exchange failed:", error.message);
      return NextResponse.redirect(
        new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
      );
    }

    const user = exchangeData.user;
    if (!user) {
      console.error("Auth user retrieval failed: user is null");
      return NextResponse.redirect(
        new URL(`/${locale}/login?error=oauth_callback`, requestUrl.origin),
      );
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      user.email?.split("@")[0] ||
      "Pengguna";
    const avatarUrl =
      (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
      (typeof meta.picture === "string" && meta.picture.trim()) ||
      null;
    const email = (user.email ?? "").toLowerCase();
    let profile: Pick<Profile, "id" | "email" | "fullName" | "avatarUrl" | "role" | "locale"> = {
      id: user.id,
      email,
      fullName,
      avatarUrl,
      role: requestedRole,
      locale,
    };
    try {
      profile = await prisma.profile.upsert({
        where: { id: user.id },
        update: {
          email,
          fullName,
          avatarUrl,
          locale,
          ...(intent === "register" ? { role: requestedRole } : {}),
        },
        create: {
          id: user.id,
          email,
          fullName,
          avatarUrl,
          role: requestedRole,
          locale,
        },
      });
    } catch (dbErr) {
      console.warn("Profile sync failed in auth callback, using session fallback:", dbErr);
    }

    const { setSessionCookie } = await import("@/server/user-store");
    await setSessionCookie({
      userId: user.id,
      email: profile.email || user.email || "",
      fullName: profile.fullName || fullName,
      role: profile.role || requestedRole,
    });

    if (profile.role === "ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}/admin`, requestUrl.origin));
    }

    if (intent === "register") {
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
