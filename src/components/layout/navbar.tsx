"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, Calendar, HelpCircle, Menu } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useRealtimeNotifications } from "@/components/notification-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { KandangSwitcher } from "@/components/KandangSwitcher";
import { useKandangStore } from "@/store/useKandangStore";
import { getRoleLabel } from "@/lib/utils";

interface NavbarProps {
    onMenuToggle?: () => void;
}

interface NotificationItem {
    id: string;
    title: string;
    is_read?: boolean;
}

function extractNotificationItems(response: unknown): NotificationItem[] {
    const res = response as { data?: unknown; items?: unknown } | null;
    const data = res?.data;
    if (Array.isArray(data)) return data as NotificationItem[];
    const nested = (data as { items?: unknown } | undefined)?.items;
    if (Array.isArray(nested)) return nested as NotificationItem[];
    if (Array.isArray(res?.items)) return res.items as NotificationItem[];
    return [];
}

function stripEmoji(str: string) {
    return str.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️🚨]/gu, "").trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const headerClass = theme === "dark"
    ? "fixed top-0 right-0 left-0 lg:left-64 z-30 bg-slate-800 border-b border-slate-700"
    : "fixed top-0 right-0 left-0 lg:left-64 z-30 bg-white border-b border-gray-200";
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropNotifs, setDropNotifs] = useState<NotificationItem[]>([]);
  const [dropLoading, setDropLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  // ── Fetch daftar kandang saat Navbar pertama mount ───────────────────────
  const fetchKandangList = useKandangStore((s) => s.fetchKandangList);
  useEffect(() => {
    fetchKandangList();
  }, [fetchKandangList]);

  useEffect(() => {
    const now = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const formattedDate = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    setCurrentDate(formattedDate);
  }, []);
    const dropRef = useRef<HTMLDivElement>(null);

    const { newNotificationCount, resetNewCount } = useRealtimeNotifications();
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
            const res = await notificationsApi.list({ limit: 5 }, session.accessToken);
            setDropNotifs(extractNotificationItems(res).slice(0, 5));
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
    <header className={headerClass}>
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
        {/* AREA KIRI */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Hamburger menu button for mobile */}
          <button
            onClick={onMenuToggle}
            className={`lg:hidden flex-shrink-0 p-2 rounded-lg transition-colors ${
              theme === "dark"
                ? "text-slate-300 hover:bg-slate-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-slate-800 font-bold text-sm sm:text-base truncate">
              Selamat datang, {getRoleLabel(session?.user?.role ?? "owner")}! 👋
            </h2>
            <div className="text-xs text-gray-500 items-center gap-1 mt-0.5 hidden sm:flex">
              <Calendar className="w-3 h-3" />
              <span>{currentDate}</span>
            </div>
          </div>
        </div>

        {/* AREA KANAN */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Kandang Switcher - hidden on very small screens */}
          <div className="hidden sm:block">
            <KandangSwitcher />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tombol Notifikasi */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={handleOpen}
                className="border border-gray-200 rounded-lg p-1.5 bg-gray-50 relative hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {totalUnread > 0 && (
                  <div className="absolute w-2 h-2 bg-red-500 rounded-full top-1 right-1 border border-white" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {/* ... contents of dropdown ... */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {dropLoading ? (
                      <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" /></div>
                    ) : dropNotifs.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">Belum ada notifikasi</div>
                    ) : (
                      dropNotifs.map((n) => (
                        <div key={n.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-xs">
                          {stripEmoji(n.title)}
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/notifications" className="block text-center py-3 text-xs text-emerald-600 font-medium border-t border-gray-100">
                    Lihat Semua
                  </Link>
                </div>
              )}
            </div>

            {/* Tombol Bantuan - hidden on mobile */}
            <button className="hidden sm:block border border-gray-200 rounded-lg p-1.5 bg-gray-50 hover:bg-gray-100 transition-colors">
              <HelpCircle className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Kandang Switcher - shown below navbar on small screens */}
      <div className="sm:hidden px-4 pb-3 border-t border-gray-100">
        <KandangSwitcher />
      </div>
    </header>
  );
}
