"use client";

import { useState } from "react";
import { BookOpen, RefreshCw, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyLogModal } from "@/components/modals/DailyLogModal";
import { dailyLogsApi } from "@/lib/api";
import { useEffect, useCallback } from "react";

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

export default function DailyLogsPage() {
    const { data: session, status } = useSession();
    const [items, setItems] = useState<DailyLogItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const perPage = 30;

    const load = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        try {
            const res: any = await dailyLogsApi.list({ page, per_page: perPage }, session.accessToken);
            const d = res?.data ?? res;
            setItems(d?.items ?? []);
            setTotal(d?.total ?? 0);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, page]);

    useEffect(() => {
        if (status === "authenticated") load();
    }, [status, load]);

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Log Harian</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Pakan, minum, populasi, dan bobot harian</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                        <Plus className="w-3.5 h-3.5" />Input Harian
                    </button>
                </div>
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
                            <p className="text-sm text-gray-400">Belum ada log harian</p>
                            <button onClick={() => setShowModal(true)}
                                className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                + Input sekarang
                            </button>
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

                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Halaman <span className="font-semibold text-gray-700">{page}</span> dari{" "}
                                <span className="font-semibold text-gray-700">{totalPages}</span>
                            </p>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                                    Sebelumnya
                                </button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                                    Berikutnya
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DailyLogModal open={showModal} onClose={() => setShowModal(false)} onSuccess={load} />
        </div>
    );
}
