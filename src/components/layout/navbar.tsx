"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, HeartCrack, ArrowRight, Calendar, HelpCircle } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useRealtimeNotifications } from "@/components/notification-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { KandangSwitcher } from "@/components/KandangSwitcher";
import { useKandangStore } from "@/store/useKandangStore";

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
  const { theme } = useTheme();
  const headerClass = theme === "dark"
    ? "fixed top-0 right-0 left-64 z-30 bg-slate-800 border-b border-slate-700"
    : "fixed top-0 right-0 left-64 z-30 bg-white border-b border-gray-200";
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropNotifs, setDropNotifs] = useState<any[]>([]);
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

    const handleDropMarkRead = async (id: string) => {
        if (!session?.accessToken) return;
        setDropNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            await notificationsApi.markAsRead(id, session.accessToken);
        } catch { /* silent */ }
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
      <div className="flex items-center justify-between px-8 py-4">
        {/* AREA KIRI */}
        <div>
          <h2 className="text-slate-800 font-bold">
            Selamat datang, {(session?.user as any)?.role || "Senior Farmer"}! 👋
          </h2>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            <span>{currentDate}</span>
          </div>
        </div>

        {/* AREA KANAN */}
        <div className="flex items-center gap-4">
          <KandangSwitcher />

          {/* Badge Status IoT */}
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-semibold">
            <div className={`w-2 h-2 rounded-full bg-emerald-500 ${connected ? "animate-pulse" : ""}`} />
            <span>Online (IoT Synced)</span>
          </div>

          <div className="flex items-center gap-3">
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
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
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
                      dropNotifs.map((n: any) => (
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

            {/* Tombol Bantuan */}
            <button className="border border-gray-200 rounded-lg p-1.5 bg-gray-50 hover:bg-gray-100 transition-colors">
              <HelpCircle className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
