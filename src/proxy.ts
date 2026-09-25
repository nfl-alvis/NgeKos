import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);
const protectedArea = /^\/(id|en)\/(dashboard|tenant|owner|admin)(?:\/|$)/;
const publicAdminLogin = /^\/(id|en)\/admin\/login(?:\/|$)/;

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (/^\/(id|en)\/daftar(?:\/|$)/.test(pathname)) {
    const newPath = pathname.replace(/^\/(id|en)\/daftar/, (_m, loc) => `/${loc}/register`);
    const redirectUrl = new URL(newPath, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const intlResponse = handleI18n(request);
  const { response, user } = await refreshSupabaseSession(request, intlResponse);
  const hasSession = !!user || request.cookies.has("nk_session");

  if (protectedArea.test(pathname) && !publicAdminLogin.test(pathname) && !hasSession) {
    const locale = pathname.split("/")[1] === "en" ? "en" : "id";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)"],
};
