import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const role = requestUrl.searchParams.get("role") === "owner" ? "OWNER" : "SEEKER";
  const nextParam = requestUrl.searchParams.get("next");
  const safeNext = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/id/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await prisma.profile.updateMany({ where: { id: data.user.id, role: { not: "ADMIN" } }, data: { role } });
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/id/login?error=auth_callback", requestUrl.origin));
}
