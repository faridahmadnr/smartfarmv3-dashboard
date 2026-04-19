import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "/api/v1";

export const authConfig: NextAuthConfig = {
    trustHost: true,
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                try {
                    const res = await fetch(`${API_URL}${API_PREFIX}/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: credentials.username,
                            password: credentials.password,
                        }),
                    });

                    const data = await res.json();

                    if (!res.ok || !data.success || !data.data) {
                        return null;
                    }

                    const loginData = data.data;

                    return {
                        id: loginData.user.id,
                        email: loginData.user.email,
                        name: loginData.user.full_name,
                        role: loginData.user.role,
                        pemilik_id: loginData.user.pemilik_id,
                        accessToken: loginData.access_token,
                        refreshToken: loginData.refresh_token,
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.pemilik_id = user.pemilik_id;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.accessTokenExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
            }

            // Token refresh logic
            if (Date.now() < token.accessTokenExpires) {
                return token;
            }

            // Try to refresh the token
            try {
                const res = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        refresh_token: token.refreshToken,
                    }),
                });

                const data = await res.json();

                if (res.ok && data.success && data.data) {
                    return {
                        ...token,
                        accessToken: data.data.access_token,
                        refreshToken: data.data.refresh_token,
                        accessTokenExpires: Date.now() + 30 * 60 * 1000,
                    };
                }
            } catch (error) {
                console.error("Token refresh error:", error);
            }

            return { ...token, error: "RefreshAccessTokenError" };
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.pemilik_id = token.pemilik_id;
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.error = token.error;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
