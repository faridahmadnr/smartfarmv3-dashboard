import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnLogin = req.nextUrl.pathname.startsWith("/login");

    // User sudah login tapi buka halaman login → redirect ke dashboard
    if (isOnLogin && isLoggedIn) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // User belum login tapi buka halaman selain login → redirect ke login
    if (!isLoggedIn && !isOnLogin) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
