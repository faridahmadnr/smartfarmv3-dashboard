import type { BackendRole, UserRole } from "@/types";

export type { BackendRole, UserRole } from "@/types";

export const USER_ROLES: readonly UserRole[] = ["admin", "owner"] as const;

export const DEFAULT_ROLE: UserRole = "owner";

export function isUserRole(value: unknown): value is UserRole {
    return value === "admin" || value === "owner";
}

export function normalizeRole(raw: unknown): UserRole {
    switch (raw) {
        case "admin":
            return "admin";
        case "owner":
        case "pemilik":
        case "peternak":
            return "owner";
        default:
            return DEFAULT_ROLE;
    }
}

export function toApiRole(role: UserRole): BackendRole {
    return role === "admin" ? "admin" : "pemilik";
}

export function isAdminRole(role: string | null | undefined): boolean {
    return normalizeRole(role) === "admin";
}

export function isOwnerRole(role: string | null | undefined): boolean {
    return normalizeRole(role) === "owner";
}

export const ADMIN_ONLY_PATHS = ["/users", "/manajemen-kandang"] as const;

export const PROTECTED_PATHS = [
    "/",
    "/daily-logs",
    "/sensor-data",
    "/predictions",
    "/notifications",
    "/settings",
    "/activity-logs",
    "/manajemen-kandang",
    "/users",
] as const;

export function matchPath(pathname: string, paths: readonly string[]): boolean {
    return paths.some((path) =>
        path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
    );
}

export function isAdminOnlyPath(pathname: string): boolean {
    return matchPath(pathname, ADMIN_ONLY_PATHS);
}

export function isProtectedPath(pathname: string): boolean {
    return matchPath(pathname, PROTECTED_PATHS);
}
