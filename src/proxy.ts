import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/portal/:path*", "/api/admin/:path*", "/api/user/profile", "/login", "/signup"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("d_session")?.value;

  if (pathname.startsWith("/portal") || pathname.startsWith("/api/admin") || pathname === "/api/user/profile") {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (
    (pathname === "/login" || pathname === "/signup") &&
    session
  ) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}
