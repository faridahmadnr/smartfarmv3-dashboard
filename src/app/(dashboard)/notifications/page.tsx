"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
    Bell, AlertTriangle, HeartCrack, CheckCircle2,
    RefreshCw, BookCheck, Thermometer, Droplets, Wind,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    useNotifications, useMarkNotificationAsRead,
    useMarkAllNotificationsAsRead, Notification,
} from "@/hooks/useApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
}

function formatDate(ts: string) {
    return new Date(ts).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function parseData(raw?: string | null): Record<string, any> {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
}

function stripEmoji(str: string) {
    return str.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️🚨]/gu, "").trim();
}

// ─── Type config ──────────────────────────────────────────────────────────────

type NotifType = "abnormal_classification" | "death_forecast" | "system";

const TYPE_CONFIG: Record<string, {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    accentBorder: string;
    label: string;
    labelBg: string;
    labelText: string;
}> = {
    abnormal_classification: {
        icon: <AlertTriangle className="w-4 h-4" />,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        accentBorder: "border-l-amber-400",
        label: "Kondisi Abnormal",
        labelBg: "bg-amber-50",
        labelText: "text-amber-700",
    },
    death_forecast: {
        icon: <HeartCrack className="w-4 h-4" />,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        accentBorder: "border-l-red-400",
        label: "Prediksi Kematian",
        labelBg: "bg-red-50",
        labelText: "text-red-700",
    },
    system: {
        icon: <Bell className="w-4 h-4" />,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
        accentBorder: "border-l-blue-300",
        label: "Sistem",
        labelBg: "bg-blue-50",
        labelText: "text-blue-700",
    },
};

const DEFAULT_CONFIG = TYPE_CONFIG.system;

// ─── Detail chips ─────────────────────────────────────────────────────────────

function ClassificationDetail({ data, confidence }: { data: Record<string, any>; confidence?: number }) {
    const suhu = data.Suhu ?? data.suhu;
    const hum = data.Kelembaban ?? data.kelembaban;
    const ammo = data.Amoniak ?? data.amoniak;
    const hari = data["Hari Ke-"] ?? data.hari_ke;
    const conf = confidence ?? data.confidence;

    const chips = [
        suhu !== undefined && { icon: <Thermometer className="w-3 h-3" />, label: `${suhu}°C`, color: "text-red-600" },
        hum !== undefined && { icon: <Droplets className="w-3 h-3" />, label: `${hum}%`, color: "text-blue-600" },
        ammo !== undefined && { icon: <Wind className="w-3 h-3" />, label: `NH₃ ${typeof ammo === "number" ? ammo.toFixed(3) : ammo} ppm`, color: "text-purple-600" },
        hari !== undefined && { icon: null, label: `Hari ke-${hari}`, color: "text-gray-600" },
        conf !== undefined && { icon: null, label: `Confidence ${(conf * 100).toFixed(1)}%`, color: "text-gray-600" },
    ].filter(Boolean) as { icon: React.ReactNode; label: string; color: string }[];

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            {chips.map((c, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg ${c.color}`}>
                    {c.icon}{c.label}
                </span>
            ))}
        </div>
    );
}

function ForecastDetail({ data }: { data: Record<string, any> }) {
    const death = data.predicted_death;
    const raw = data.raw_prediction;
    if (death === undefined) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-red-50 border border-red-100 rounded-lg text-red-700 font-semibold">
                <HeartCrack className="w-3 h-3" />{death} ekor diprediksi
            </span>
            {raw !== undefined && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-500">
                    Raw: {Number(raw).toFixed(4)}
                </span>
            )}
        </div>
    );
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotifItem({
    notif, isRead, onMarkRead,
}: {
    notif: Notification;
    isRead: boolean;
    onMarkRead: (id: string) => void;
}) {
    const cfg = TYPE_CONFIG[notif.type as NotifType] ?? DEFAULT_CONFIG;
    const extra = parseData(notif.data);
    const cleanTitle = stripEmoji(notif.title);

    return (
        <div className={`flex gap-4 px-5 py-4 border-l-4 transition-colors ${cfg.accentBorder} ${isRead ? "bg-white" : "bg-gray-50/60"} hover:bg-gray-50/80`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
                {cfg.icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.labelBg} ${cfg.labelText}`}>
                                {cfg.label}
                            </span>
                            {!isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            )}
                            {notif.kandang && (
                                <span className="text-[10px] text-gray-400">
                                    · {notif.kandang.nama}
                                </span>
                            )}
                        </div>

                        <p className={`text-sm leading-snug ${isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                            {cleanTitle}
                        </p>

                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {notif.message}
                        </p>

                        {notif.type === "abnormal_classification" && (
                            <ClassificationDetail data={extra} />
                        )}
                        {notif.type === "death_forecast" && (
                            <ForecastDetail data={extra} />
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(notif.created_at)}</span>
                        <span className="text-[10px] text-gray-300">{formatDate(notif.created_at)}</span>
                        {!isRead && (
                            <button
                                onClick={() => onMarkRead(notif.id)}
                                className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 transition-colors"
                            >
                                <CheckCircle2 className="w-3 h-3" />
                                Tandai dibaca
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
    page, totalPages, onPageChange,
}: {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-center gap-1 px-5 py-3 border-t border-gray-100">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`e${i}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`min-w-[32px] h-8 px-2 text-xs rounded-lg transition-colors ${page === p ? "bg-green-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function NotificationsPage() {
    const { status } = useSession();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

    const { data: notifData, loading, error, refetch } = useNotifications(page, PAGE_SIZE);
    const { mutate: markAsRead } = useMarkNotificationAsRead();
    const { mutate: markAllAsRead, loading: markingAll } = useMarkAllNotificationsAsRead();

    const notifications = notifData?.items ?? [];
    const totalPages = notifData?.total_pages ?? 1;
    const total = notifData?.total ?? 0;
    const globalUnread = notifData?.unread_count ?? 0;

    const filtered = filter === "unread"
        ? notifications.filter(n => !n.is_read && !localReadIds.has(n.id))
        : notifications;

    const abnormalOnPage = notifications.filter(n => n.type === "abnormal_classification").length;
    const deathOnPage = notifications.filter(n => n.type === "death_forecast").length;

    const handleMarkAsRead = async (id: string) => {
        setLocalReadIds(prev => new Set([...prev, id]));
        await markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        const result = await markAllAsRead();
        if (result.success) {
            setLocalReadIds(new Set(notifications.map(n => n.id)));
            refetch();
        }
    };

    const handlePageChange = (p: number) => {
        setLocalReadIds(new Set());
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (status === "loading" || (loading && !notifData)) {
        return (
            <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {globalUnread > 0
                            ? <span><span className="font-semibold text-green-600">{globalUnread}</span> belum dibaca</span>
                            : "Semua notifikasi sudah dibaca"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {globalUnread > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            disabled={markingAll}
                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <BookCheck className="w-3.5 h-3.5" />
                            {markingAll ? "Memproses..." : "Tandai Semua Dibaca"}
                        </button>
                    )}
                    <button
                        onClick={() => { setPage(1); refetch(); }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats ───────────────────────────────────────────────────── */}
            {total > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Total", value: total, icon: <Bell className="w-4 h-4" />, color: "text-slate-500 bg-slate-50" },
                        { label: "Kondisi Abnormal", value: abnormalOnPage, icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-500 bg-amber-50" },
                        { label: "Prediksi Kematian", value: deathOnPage, icon: <HeartCrack className="w-4 h-4" />, color: "text-red-500 bg-red-50" },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400">{s.label}</p>
                                <div className={`p-1.5 rounded-lg ${s.color}`}>{s.icon}</div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    Gagal mengambil notifikasi: {error}
                </div>
            )}

            {/* ── Filter tabs + list ───────────────────────────────────────── */}
            {(total > 0 || loading) && (
                <Card>
                    {/* Tab header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => { setFilter("all"); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Semua
                                <span className="text-[10px] text-gray-400 ml-1">{total}</span>
                            </button>
                            <button
                                onClick={() => setFilter("unread")}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5 ${filter === "unread" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Belum Dibaca
                                {globalUnread > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-green-600 text-white rounded-full leading-none">
                                        {globalUnread > 99 ? "99+" : globalUnread}
                                    </span>
                                )}
                            </button>
                        </div>

                        {totalPages > 1 && (
                            <span className="text-xs text-gray-400">
                                Hal. {page} / {totalPages}
                            </span>
                        )}
                    </div>

                    {/* Loading overlay during page change */}
                    {loading && notifData && (
                        <div className="h-0.5 bg-green-500 animate-pulse" />
                    )}

                    <CardContent className="p-0 divide-y divide-gray-50">
                        {filtered.length === 0 && !loading ? (
                            <div className="py-10 text-center">
                                <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Tidak ada notifikasi yang belum dibaca</p>
                                <button onClick={() => setFilter("all")} className="mt-2 text-xs text-green-600 hover:underline">
                                    Lihat semua
                                </button>
                            </div>
                        ) : (
                            filtered.map(n => (
                                <NotifItem
                                    key={n.id}
                                    notif={n}
                                    isRead={n.is_read || localReadIds.has(n.id)}
                                    onMarkRead={handleMarkAsRead}
                                />
                            ))
                        )}
                    </CardContent>

                    <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </Card>
            )}

            {/* ── Empty State ──────────────────────────────────────────────── */}
            {!error && !loading && total === 0 && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                            <Bell className="w-7 h-7 text-gray-300" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 mb-1">Belum ada notifikasi</h3>
                        <p className="text-sm text-gray-400">Alert muncul otomatis saat ML mendeteksi kondisi Abnormal atau prediksi kematian</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
