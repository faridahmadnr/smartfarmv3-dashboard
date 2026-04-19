import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: "admin" | "pemilik" | "peternak";
            pemilik_id?: string;
        };
        accessToken: string;
        refreshToken: string;
        error?: string;
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: "admin" | "pemilik" | "peternak";
        pemilik_id?: string;
        accessToken: string;
        refreshToken: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "admin" | "pemilik" | "peternak";
        pemilik_id?: string;
        accessToken: string;
        refreshToken: string;
        accessTokenExpires: number;
        error?: string;
    }
}
