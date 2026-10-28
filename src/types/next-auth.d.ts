import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/types";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: UserRole;
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
        role: UserRole;
        pemilik_id?: string;
        accessToken: string;
        refreshToken: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
        pemilik_id?: string;
        accessToken: string;
        refreshToken: string;
        accessTokenExpires: number;
        error?: string;
    }
}
