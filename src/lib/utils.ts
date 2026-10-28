import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat("id-ID").format(value);
}

export function getRoleBadgeColor(role: string): string {
    switch (role) {
        case "admin":
            return "bg-purple-500/20 text-purple-400 border-purple-500/30";
        case "owner":
        case "pemilik":
        case "peternak":
            return "bg-green-500/20 text-green-400 border-green-500/30";
        default:
            return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
}

export function getRoleLabel(role: string): string {
    switch (role) {
        case "admin":
            return "Admin";
        case "owner":
            return "Owner";
        case "pemilik":
            return "Owner";
        case "peternak":
            return "Owner";
        default:
            return role;
    }
}

export function getStatusColor(isActive: boolean): string {
    return isActive
        ? "bg-green-500/20 text-green-400 border-green-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30";
}
