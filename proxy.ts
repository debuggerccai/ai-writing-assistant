import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import type { NextAuthRequest } from "next-auth";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);
const PUBLIC_PREFIXES = ["/api", "/_next", "/assets"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // 直接放行常见静态文件请求，避免资源请求被重定向到登录页
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

/** Next 16 约定命名为 `proxy`；NextAuth 需外层 `auth(proxy)` 注入 `req.auth`。 */
function proxy(req: NextAuthRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default auth(proxy);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

