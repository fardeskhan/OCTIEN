import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Extract better-auth session cookie (better-auth standard is usually __session or better-auth.session_token)
  // We'll use a basic check for the token to prevent unauthenticated access. 
  // Real verification is done in the server action or layout.
  const token = request.cookies.get("better-auth.session_token")?.value || request.cookies.get("__Secure-better-auth.session_token")?.value;
  
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register");
  
  if (!token && !isAuthRoute && !request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
