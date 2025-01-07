import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // If the user is not logged in and trying to access protected routes
    if (!req.nextauth.token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If the user is logged in and trying to access login page
    if (req.nextauth.token && req.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/chat", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/chat/:path*", "/login"],
}; 