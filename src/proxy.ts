import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/portal/:path*", "/login", "/signup"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("d_session")?.value;

  if (pathname.startsWith("/portal")) {
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
