import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnLoginPage = req.nextUrl.pathname === "/login";
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard") ||
        req.nextUrl.pathname === "/" ||
        req.nextUrl.pathname.startsWith("/kandang") ||
        req.nextUrl.pathname.startsWith("/users") ||
        req.nextUrl.pathname.startsWith("/sensor-data") ||
        req.nextUrl.pathname.startsWith("/predictions") ||
        req.nextUrl.pathname.startsWith("/notifications") ||
        req.nextUrl.pathname.startsWith("/settings");

    // Redirect to login if not authenticated and trying to access protected routes
    if (!isLoggedIn && isOnDashboard) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Redirect to dashboard if authenticated and trying to access login
    if (isLoggedIn && isOnLoginPage) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    ],
};
