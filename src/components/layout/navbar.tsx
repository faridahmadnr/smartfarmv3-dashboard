"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, HeartCrack, ArrowRight } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useRealtimeNotifications } from "@/components/notification-provider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
}

function stripEmoji(str: string) {
    return str.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️🚨]/gu, "").trim();
}

const TYPE_ICON: Record<string, React.ReactNode> = {
    abnormal_classification: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    death_forecast: <HeartCrack className="w-3.5 h-3.5 text-red-500" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Navbar() {
    const { data: session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropNotifs, setDropNotifs] = useState<any[]>([]);
    const [dropLoading, setDropLoading] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    const { connected, newNotificationCount, resetNewCount } = useRealtimeNotifications();
    const totalUnread = unreadCount + newNotificationCount;

    // Fetch unread count (initial + polling)
    useEffect(() => {
        const fetch = async () => {
            if (!session?.accessToken) return;
            try {
                const res = await notificationsApi.getUnreadCount(session.accessToken);
                if (res.success && res.data) {
                    setUnreadCount((res.data as { unread_count: number }).unread_count);
                }
            } catch { /* silent */ }
        };
        fetch();
        const t = setInterval(fetch, 60000);
        return () => clearInterval(t);
    }, [session?.accessToken]);

    // Fetch recent notifications for dropdown
    const fetchDropdown = useCallback(async () => {
        if (!session?.accessToken) return;
        setDropLoading(true);
        try {
            const res: any = await notificationsApi.list({ limit: 5 }, session.accessToken);
            let items: any[] = [];
            if (Array.isArray(res)) items = res;
            else if (Array.isArray(res?.data?.items)) items = res.data.items;
            else if (Array.isArray(res?.data)) items = res.data;
            else if (Array.isArray(res?.items)) items = res.items;
            setDropNotifs(items.slice(0, 5));
        } catch { /* silent */ } finally {
            setDropLoading(false);
        }
    }, [session?.accessToken]);

    // Open dropdown → fetch + reset new count
    const handleOpen = () => {
        if (!showDropdown) {
            fetchDropdown();
            resetNewCount();
        }
        setShowDropdown(v => !v);
    };

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Re-fetch dropdown when new WS notification arrives
    useEffect(() => {
        if (newNotificationCount > 0 && showDropdown) fetchDropdown();
    }, [newNotificationCount, showDropdown, fetchDropdown]);

    return (
        <header className="fixed top-0 right-0 left-64 z-30 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-8 py-4">
                {/* Left: greeting */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Selamat datang, {session?.user?.name?.split(" ")[0] || "User"}! 👋
                    </h2>
                    <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString("id-ID", {
                            weekday: "long", day: "numeric", month: "long", year: "numeric",
                        })}
                    </p>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                        <span className="text-xs text-gray-500">{connected ? "Live" : "Offline"}</span>
                    </div>

                    {/* Notification bell + dropdown */}
                    <div className="relative" ref={dropRef}>
                        <button
                            onClick={handleOpen}
                            className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {totalUnread > 0 && (
                                <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ${newNotificationCount > 0 ? "bg-red-500 animate-bounce" : "bg-red-500"}`}>
                                    {totalUnread > 9 ? "9+" : totalUnread}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
                                    {totalUnread > 0 && (
                                        <span className="text-[11px] font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">
                                            {totalUnread} baru
                                        </span>
                                    )}
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                                    {dropLoading ? (
                                        <div className="py-8 flex justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                                        </div>
                                    ) : dropNotifs.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Bell className="w-6 h-6 text-gray-200 mx-auto mb-1.5" />
                                            <p className="text-xs text-gray-400">Belum ada notifikasi</p>
                                        </div>
                                    ) : (
                                        dropNotifs.map((n: any) => {
                                            const isUnread = !n.is_read;
                                            const icon = TYPE_ICON[n.type] ?? <Bell className="w-3.5 h-3.5 text-blue-400" />;
                                            return (
                                                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${isUnread ? "bg-amber-50/40" : "bg-white"}`}>
                                                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${n.type === "death_forecast" ? "bg-red-50" : n.type === "abnormal_classification" ? "bg-amber-50" : "bg-blue-50"}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs leading-snug ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                                                            {stripEmoji(n.title)}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                                                    </div>
                                                    {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer */}
                                <Link
                                    href="/notifications"
                                    onClick={() => setShowDropdown(false)}
                                    className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-gray-100 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
                                >
                                    Lihat Semua Notifikasi <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <Link href="/settings" className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </Link>
                </div>
            </div>
        </header>
    );
}
