import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isSuperAdminPath = pathname.startsWith("/superadmin");

  if (!session?.user) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const homePath = session.user.role === "SUPER_ADMIN" ? "/superadmin/companies" : "/dashboard";

  if (isLoginPage || pathname === "/") {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (isSuperAdminPath && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (!isSuperAdminPath && session.user.role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
