"use client";

import { useState, useCallback, useEffect } from "react";
import { BookOpen, RefreshCw, Plus, RotateCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, HeartCrack, Skull } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyLogModal } from "@/components/modals/DailyLogModal";
import { DeathReportModal } from "@/components/modals/DeathReportModal";
import { dailyLogsApi } from "@/lib/api";
import { useDeathReports, useTodayDeathTotal } from "@/hooks/useApi";

interface DailyLogItem {
    id: string;
    date: string;
    pakan?: number;
    minum?: number;
    populasi?: number;
    bobot?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

const PER_PAGE = 20;

export default function DailyLogsPage() {
    const { data: session, status } = useSession();
    const isPeternak = session?.user?.role === "peternak";

    // Daily log state
    const [items, setItems] = useState<DailyLogItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);

    // Death report state
    const [showDeathModal, setShowDeathModal] = useState(false);
    const [deathPage, setDeathPage] = useState(1);
    const DEATH_PER_PAGE = 10;
    const { data: deathData, loading: deathLoading, refetch: refetchDeaths } = useDeathReports({ page: deathPage, per_page: DEATH_PER_PAGE });
    const { total: todayDeathTotal, refetch: refetchDeathTotal } = useTodayDeathTotal();
    const deathTotalPages = Math.max(1, Math.ceil((deathData?.total ?? 0) / DEATH_PER_PAGE));

    // Filter state
    const [startInput, setStartInput] = useState("");
    const [endInput, setEndInput] = useState("");
    const [appliedStart, setAppliedStart] = useState("");
    const [appliedEnd, setAppliedEnd] = useState("");

    const hasFilter = !!(appliedStart || appliedEnd);

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        try {
            const res: any = await dailyLogsApi.list(
                { page, per_page: PER_PAGE, start_date: appliedStart || undefined, end_date: appliedEnd || undefined },
                session.accessToken,
            );
            const d = res?.data ?? res;
            setItems(d?.items ?? []);
            setTotal(d?.total ?? 0);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, page, appliedStart, appliedEnd]);

    useEffect(() => {
        if (status === "authenticated") load();
    }, [status, load]);

    const applyFilter = () => { setAppliedStart(startInput); setAppliedEnd(endInput); setPage(1); };
    const resetFilter = () => { setStartInput(""); setEndInput(""); setAppliedStart(""); setAppliedEnd(""); setPage(1); };
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

    const formatTime = (ts: string) =>
        new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const handleDeathSuccess = () => {
        refetchDeaths();
        refetchDeathTotal();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Catatan Harian</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Log harian & laporan kematian ayam</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { load(); refetchDeaths(); refetchDeathTotal(); }} disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    {isPeternak && (
                        <>
                            <button onClick={() => setShowDeathModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
                                <HeartCrack className="w-3.5 h-3.5" />Laporkan Kematian
                            </button>
                            <button onClick={() => setShowModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                                <Plus className="w-3.5 h-3.5" />Input Harian
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Log Harian ────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Log Harian</h2>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Dari Tanggal</span>
                    <input type="date" value={startInput} onChange={e => setStartInput(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hingga Tanggal</span>
                    <input type="date" value={endInput} onChange={e => setEndInput(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600" />
                </div>
                <div className="flex items-center gap-2 pb-0.5">
                    <button onClick={applyFilter}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Terapkan
                    </button>
                    {hasFilter && (
                        <button onClick={resetFilter}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg transition-colors">
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    )}
                </div>
                {hasFilter && (
                    <span className="text-xs text-green-600 font-medium pb-0.5">
                        {appliedStart && appliedEnd ? `${appliedStart} – ${appliedEnd}` : appliedStart ? `Dari ${appliedStart}` : `Hingga ${appliedEnd}`}
                    </span>
                )}
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <CardTitle className="text-base">{total} Catatan</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-lg" />)}</div>
                    ) : items.length === 0 ? (
                        <div className="py-14 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">{hasFilter ? "Tidak ada data untuk rentang tanggal ini" : "Belum ada log harian"}</p>
                            {!hasFilter && isPeternak && (
                                <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                    + Input sekarang
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        {["Tanggal", "Pakan (kg)", "Minum (L)", "Populasi", "Bobot (g)", "Catatan"].map(h => (
                                            <th key={h} className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {items.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3 px-4 text-xs font-medium text-gray-700 whitespace-nowrap">{formatDate(row.date)}</td>
                                            <td className="py-3 px-4 text-gray-700 tabular-nums">{row.pakan ?? <span className="text-gray-300">—</span>}</td>
                                            <td className="py-3 px-4 text-gray-700 tabular-nums">{row.minum ?? <span className="text-gray-300">—</span>}</td>
                                            <td className="py-3 px-4 text-gray-700 tabular-nums">{row.populasi?.toLocaleString() ?? <span className="text-gray-300">—</span>}</td>
                                            <td className="py-3 px-4 text-gray-700 tabular-nums">{row.bobot ?? <span className="text-gray-300">—</span>}</td>
                                            <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">{row.notes || <span className="text-gray-300">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && totalPages >= 1 && total > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Halaman <span className="font-semibold text-gray-700">{page}</span> dari{" "}
                                <span className="font-semibold text-gray-700">{totalPages}</span> · {total} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                    const p = start + i;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${p === page ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Laporan Kematian ──────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-semibold text-gray-700">Laporan Kematian</h2>
                </div>
                {todayDeathTotal > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                        <HeartCrack className="w-3 h-3" />
                        Hari ini: {todayDeathTotal} ekor
                    </span>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {deathLoading ? (
                        <div className="p-6 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-lg" />)}</div>
                    ) : !deathData?.items.length ? (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                                <HeartCrack className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Belum ada laporan kematian</p>
                            {isPeternak && (
                                <button onClick={() => setShowDeathModal(true)} className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium">
                                    + Laporkan sekarang
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        {["Waktu Laporan", "Jumlah", "Catatan"].map(h => (
                                            <th key={h} className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {deathData.items.map(row => {
                                        const isToday = new Date(row.timestamp).toDateString() === new Date().toDateString();
                                        return (
                                            <tr key={row.id} className={`hover:bg-gray-50/60 transition-colors ${isToday ? "bg-red-50/30" : ""}`}>
                                                <td className="py-3 px-4 text-xs font-medium text-gray-700 whitespace-nowrap">
                                                    {formatTime(row.timestamp)}
                                                    {isToday && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Hari ini</span>}
                                                </td>
                                                <td className="py-3 px-4 font-semibold tabular-nums text-red-600">
                                                    {row.count} ekor
                                                </td>
                                                <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                                                    {row.notes || <span className="text-gray-300">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {(deathData?.total ?? 0) > DEATH_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                                    <p className="text-xs text-gray-400">
                                        Halaman {deathPage} dari {deathTotalPages} · Total {deathData?.total} laporan
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setDeathPage(1)} disabled={deathPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
                                        <button onClick={() => setDeathPage(p => Math.max(1, p - 1))} disabled={deathPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="px-3 py-1 text-xs font-medium text-gray-700">{deathPage}</span>
                                        <button onClick={() => setDeathPage(p => Math.min(deathTotalPages, p + 1))} disabled={deathPage === deathTotalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                        <button onClick={() => setDeathPage(deathTotalPages)} disabled={deathPage === deathTotalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <DailyLogModal open={showModal} onClose={() => setShowModal(false)} onSuccess={load} />
            <DeathReportModal open={showDeathModal} onClose={() => setShowDeathModal(false)} onSuccess={handleDeathSuccess} />
        </div>
    );
}
