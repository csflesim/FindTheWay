import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 需要登入才能進入的會員前台頁面（瀏覽課程、首頁不用登入）
const MEMBER_PROTECTED = [
  "/m/orders",
  "/m/profile",
  "/m/settings",
  "/m/students",
  "/m/tickets",
];

function redirectWithCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach(({ name, value }) => res.cookies.set(name, value));
  return res;
}

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // ── 後台：需登入且 role 為 staff / admin ──
  if (path.startsWith("/sys-admin") && path !== "/sys-admin/login") {
    if (!user) {
      return redirectWithCookies(new URL("/sys-admin/login", request.url), response);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !["staff", "admin"].includes(profile.role)) {
      return redirectWithCookies(
        new URL("/sys-admin/login?error=forbidden", request.url),
        response,
      );
    }
  }

  // ── 會員前台：個人相關頁需登入 ──
  if (!user && MEMBER_PROTECTED.some((p) => path.startsWith(p))) {
    return redirectWithCookies(new URL("/m/login", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
