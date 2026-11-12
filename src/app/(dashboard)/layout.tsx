"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { NotificationProvider } from "@/components/notification-provider";
import { SessionExpiredOverlay } from "@/components/session-expired-overlay";
import { useTheme } from "@/components/providers/theme-provider";
import { useRole } from "@/hooks/useRole";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const { role, status: roleStatus } = useRole();
    const { theme } = useTheme();
    const [apiExpired, setApiExpired] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const sessionExpired = session?.error === "RefreshAccessTokenError" || apiExpired;

    // Dengarkan event 401 dari API call mana pun
    useEffect(() => {
        const handler = () => setApiExpired(true);
        window.addEventListener("session-expired", handler);
        return () => window.removeEventListener("session-expired", handler);
    }, []);

    // Handle unauthenticated (cookie habis / logout dari tab lain)
    useEffect(() => {
        if (status === "unauthenticated") {
            signOut({ callbackUrl: "/login" });
        }
    }, [status]);

    // Close sidebar when window resizes to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const mainBg = theme === "dark" ? "bg-slate-900" : "bg-gray-50";

    if (roleStatus === "loading" || !role) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${mainBg}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    return (
        <NotificationProvider>
            {sessionExpired && <SessionExpiredOverlay />}
            <div className={`min-h-screen theme-main-bg ${mainBg}`}>
                <Sidebar
                    role={role}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
                <main className="lg:ml-64 pt-28 sm:pt-24 px-3 sm:px-6 lg:px-8 pb-8 sm:pb-10 min-w-0">
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>
        </NotificationProvider>
    );
}
