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
  const safeNext = nextParam?.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : `/${locale}/dashboard`;

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/login?role=${requestedRole.toLowerCase()}&error=oauth_callback`, requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/login?role=${requestedRole.toLowerCase()}&error=oauth_callback`, requestUrl.origin));
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.redirect(new URL(`/${locale}/login?role=${requestedRole.toLowerCase()}&error=oauth_callback`, requestUrl.origin));
  }

  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(`/${locale}/login?role=${requestedRole.toLowerCase()}&error=profile_missing`, requestUrl.origin));
  }

  if (profile.role === "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/admin`, requestUrl.origin));
  }

  if (intent === "register") {
    await prisma.profile.update({ where: { id: profile.id }, data: { role: requestedRole } });
    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  if (profile.role !== requestedRole) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(`/${locale}/login?role=${requestedRole.toLowerCase()}&error=role_mismatch`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
