"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { NotificationProvider } from "@/components/notification-provider";
import { SessionExpiredOverlay } from "@/components/session-expired-overlay";
import { useTheme } from "@/components/providers/theme-provider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const { theme } = useTheme();
    const sessionExpired = session?.error === "RefreshAccessTokenError";

    const mainBg = theme === "dark" ? "bg-slate-900" : "bg-gray-50";

    return (
        <NotificationProvider>
            {sessionExpired && <SessionExpiredOverlay />}
            <div className={`min-h-screen theme-main-bg ${mainBg}`}>
                <Sidebar />
                <Navbar />
                <main className="ml-64 pt-24 px-8 pb-8">
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>
        </NotificationProvider>
    );
}
