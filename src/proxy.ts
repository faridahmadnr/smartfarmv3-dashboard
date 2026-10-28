import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isAdminOnlyPath, isAdminRole, isProtectedPath } from "@/lib/roles";

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.auth;
    const role = req.auth?.user?.role ?? null;

    if (!isLoggedIn && isProtectedPath(pathname)) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isLoggedIn && pathname === "/login") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    if (isLoggedIn && isAdminOnlyPath(pathname) && !isAdminRole(role)) {
        return NextResponse.redirect(new URL("/?denied=admin", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    ],
};
