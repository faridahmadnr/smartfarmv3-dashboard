"use client";

import { useSession } from "next-auth/react";
import { normalizeRole, type UserRole } from "@/lib/roles";

export interface RoleState {
    status: "loading" | "authenticated" | "unauthenticated";
    role: UserRole | null;
    isAdmin: boolean;
    isOwner: boolean;
}

export function useRole(): RoleState {
    const { data: session, status } = useSession();
    const role = session?.user?.role ? normalizeRole(session.user.role) : null;

    return {
        status,
        role,
        isAdmin: role === "admin",
        isOwner: role === "owner",
    };
}
