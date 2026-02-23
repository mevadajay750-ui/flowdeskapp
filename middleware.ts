import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("fd_token")?.value;
  const status = request.cookies.get("fd_status")?.value;

  if (!token || status !== "approved") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/timesheets/:path*",
    "/members/:path*",
    "/settings/:path*",
  ],
};

