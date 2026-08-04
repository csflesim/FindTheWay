import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 三區嚴格分流：會員區只給 member、教師區只給 teacher、後台只給 staff/admin。
// 即使同一個 Email，各區身分互相獨立、不可跨區使用。

// 需要「會員」身分才能進入的前台頁面（瀏覽課程、首頁不用登入）
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

  const needsRole =
    (path.startsWith("/sys-admin") && path !== "/sys-admin/login") ||
    MEMBER_PROTECTED.some((p) => path.startsWith(p));

  let role: string | null = null;
  if (user && needsRole) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  // ── 後台：僅 staff / admin ──
  if (path.startsWith("/sys-admin") && path !== "/sys-admin/login") {
    if (!user) {
      return redirectWithCookies(new URL("/sys-admin/login", request.url), response);
    }
    if (!role || !["staff", "admin"].includes(role)) {
      return redirectWithCookies(
        new URL("/sys-admin/login?error=forbidden", request.url),
        response,
      );
    }
  }

  // ── 會員前台個人頁：僅 member ──
  if (MEMBER_PROTECTED.some((p) => path.startsWith(p))) {
    if (!user) {
      return redirectWithCookies(new URL("/m/login", request.url), response);
    }
    if (role === "teacher") {
      return redirectWithCookies(new URL("/m/teacher", request.url), response);
    }
    if (role === "staff" || role === "admin") {
      return redirectWithCookies(new URL("/sys-admin", request.url), response);
    }
    // LINE 註冊後尚未綁定真實 Email → 先完成綁定
    if ((user.email ?? "").endsWith("@findtheway.app")) {
      return redirectWithCookies(
        new URL(`/m/bind-email?next=${encodeURIComponent(path)}`, request.url),
        response,
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
