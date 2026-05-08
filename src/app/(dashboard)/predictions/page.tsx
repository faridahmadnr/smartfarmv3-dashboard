"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    RefreshCw,
    ShieldCheck, TrendingUp, HeartCrack,
    CheckCircle2, AlertTriangle, XCircle,
    Activity, Cpu, ChevronDown, ChevronUp,
    Info, Filter, X,
    ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { useModelInfo } from "@/hooks/useApi";
import { predictionsApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PredictionRecord {
    id: string;
    type: "classification" | "forecasting";
    prediction: string | null;
    confidence: number | null;
    predicted_death: number | null;
    raw_prediction: number | null;
    input_data: Record<string, any> | null;
    created_at: string;
}

interface PredictionSummary {
    classification: { total: number; normal: number; abnormal: number };
    forecasting: { total: number; safe: number; risk: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
    try {
        return new Date(ts).toLocaleString("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return ts; }
}

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
}

function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const color = pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-yellow-400" : "bg-red-400";
    const label = pct >= 90 ? "sangat yakin" : pct >= 70 ? "cukup yakin" : "kurang yakin";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span
                className="text-xs font-semibold tabular-nums text-gray-700 cursor-help underline decoration-dotted decoration-gray-300"
                title={`Keyakinan model: ${pct}% (${label}) — semakin tinggi, semakin yakin model terhadap hasil prediksinya`}
            >
                {pct}%
            </span>
        </div>
    );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const { data: modelInfo } = useModelInfo();

    const [pagedRecords, setPagedRecords] = useState<PredictionRecord[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [summary, setSummary] = useState<PredictionSummary>({
        classification: { total: 0, normal: 0, abnormal: 0 },
        forecasting: { total: 0, safe: 0, risk: 0 },
    });
    const [latestClassify, setLatestClassify] = useState<PredictionRecord | null>(null);
    const [latestForecast, setLatestForecast] = useState<PredictionRecord | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<"classification" | "forecasting">("classification");
    const [showModelInfo, setShowModelInfo] = useState(false);

    // Pagination state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);

    // Filter state
    const [startInput, setStartInput] = useState("");
    const [endInput, setEndInput] = useState("");
    const [appliedStart, setAppliedStart] = useState("");
    const [appliedEnd, setAppliedEnd] = useState("");
    const [showFilter, setShowFilter] = useState(false);

    // Sort state
    const [sortKey, setSortKey] = useState<string>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
        setHistoryPage(1);
    };

    const Th = ({ col, label, className = "" }: { col: string; label: string; className?: string }) => (
        <th
            className={`py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap cursor-pointer select-none hover:text-gray-600 ${className}`}
            onClick={() => handleSort(col)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {sortKey === col
                    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-green-600" /> : <ChevronDown className="w-3 h-3 text-green-600" />)
                    : <ChevronDown className="w-3 h-3 opacity-30" />}
            </span>
        </th>
    );

    const isAdmin = session?.user?.role === "admin";

    // ── Fetch summary (stats) ────────────────────────────────────────────────
    const loadSummary = useCallback(async (start?: string, end?: string) => {
        if (!session?.accessToken) return;
        try {
            const params: any = {};
            if (start) params.start_date = start;
            if (end) params.end_date = end;
            const res: any = await predictionsApi.getSummary(params, session.accessToken);
            const d = res?.data?.data ?? res?.data ?? res;
            if (d?.classification) setSummary(d);
        } catch { /* silent */ }
    }, [session?.accessToken]);

    // ── Fetch history (server-side sort + pagination) ────────────────────────
    const loadHistory = useCallback(async (opts?: {
        start?: string; end?: string;
        page?: number; pageSize?: number;
        sortBy?: string; sortOrder?: "asc" | "desc";
        type?: string;
    }) => {
        if (!session?.accessToken) return;
        setLoadingHistory(true);
        try {
            const params: any = {
                type: opts?.type ?? activeTab,
                page: opts?.page ?? historyPage,
                page_size: opts?.pageSize ?? historyPageSize,
                sort_by: opts?.sortBy ?? sortKey,
                sort_order: opts?.sortOrder ?? sortDir,
            };
            if (opts?.start ?? appliedStart) params.start_date = opts?.start ?? appliedStart;
            if (opts?.end ?? appliedEnd) params.end_date = opts?.end ?? appliedEnd;

            const res: any = await predictionsApi.getHistory(params, session.accessToken);
            const d = res?.data?.data ?? res?.data ?? res;
            const items: PredictionRecord[] = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
            const total: number = d?.total ?? items.length;

            setPagedRecords(items);
            setTotalRecords(total);

            // Latest cards: ambil item pertama dari respons jika tab sesuai
            if ((opts?.type ?? activeTab) === "classification" && items.length > 0 && (opts?.sortBy ?? sortKey) === "created_at" && (opts?.sortOrder ?? sortDir) === "desc") {
                setLatestClassify(items[0]);
            }
            if ((opts?.type ?? activeTab) === "forecasting" && items.length > 0 && (opts?.sortBy ?? sortKey) === "created_at" && (opts?.sortOrder ?? sortDir) === "desc") {
                setLatestForecast(items[0]);
            }
        } catch (err) {
            console.error("Failed to load prediction history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [session?.accessToken, activeTab, historyPage, historyPageSize, sortKey, sortDir, appliedStart, appliedEnd]);

    // Refetch saat tab, page, sort berubah
    useEffect(() => {
        if (status === "authenticated" && session?.accessToken) {
            loadHistory();
            loadSummary(appliedStart || undefined, appliedEnd || undefined);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session?.accessToken, activeTab, historyPage, historyPageSize, sortKey, sortDir]);

    // Fetch latest cards untuk kedua tab saat pertama load
    useEffect(() => {
        if (status !== "authenticated" || !session?.accessToken) return;
        const token = session.accessToken;
        predictionsApi.getHistory({ type: "classification", page: 1, page_size: 1, sort_by: "created_at", sort_order: "desc" }, token)
            .then((res: any) => {
                const d = res?.data?.data ?? res?.data ?? res;
                const items = Array.isArray(d?.items) ? d.items : [];
                if (items[0]) setLatestClassify(items[0]);
            }).catch(() => {});
        predictionsApi.getHistory({ type: "forecasting", page: 1, page_size: 1, sort_by: "created_at", sort_order: "desc" }, token)
            .then((res: any) => {
                const d = res?.data?.data ?? res?.data ?? res;
                const items = Array.isArray(d?.items) ? d.items : [];
                if (items[0]) setLatestForecast(items[0]);
            }).catch(() => {});
    }, [status, session?.accessToken]);

    const applyFilter = () => {
        setAppliedStart(startInput);
        setAppliedEnd(endInput);
        setHistoryPage(1);
        loadHistory({ start: startInput || undefined, end: endInput || undefined, page: 1 });
        loadSummary(startInput || undefined, endInput || undefined);
    };

    const resetFilter = () => {
        setStartInput("");
        setEndInput("");
        setAppliedStart("");
        setAppliedEnd("");
        setHistoryPage(1);
        loadHistory({ start: undefined, end: undefined, page: 1 });
        loadSummary();
    };

    const isFiltered = !!(appliedStart || appliedEnd);

    const totalPages = Math.max(1, Math.ceil(totalRecords / historyPageSize));

    const classModel    = (modelInfo as any)?.data?.classification_model ?? (modelInfo as any)?.classification_model;
    const forecastModel = (modelInfo as any)?.data?.forecasting_model    ?? (modelInfo as any)?.forecasting_model;

    if (status === "loading") {
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
                <h1 className="text-xl font-bold text-gray-900">Prediksi Machine Learning</h1>
                <button
                    onClick={() => { loadHistory(); loadSummary(appliedStart || undefined, appliedEnd || undefined); }}
                    disabled={loadingHistory}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* ── Stats ───────────────────────────────────────────────────── */}
            <div className="space-y-3">
                {/* Klasifikasi row */}
                <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" /> Klasifikasi
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Total", value: summary.classification.total, icon: <ShieldCheck className="w-4 h-4" />, color: "text-slate-500 bg-slate-50" },
                            { label: "Normal", value: summary.classification.normal, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
                            { label: "Abnormal", value: summary.classification.abnormal, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500 bg-red-50" },
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
                </div>

                {/* Forecasting row */}
                <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Forecasting
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Total", value: summary.forecasting.total, icon: <TrendingUp className="w-4 h-4" />, color: "text-slate-500 bg-slate-50" },
                            { label: "Prediksi Aman", value: summary.forecasting.safe, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
                            { label: "Ada Risiko", value: summary.forecasting.risk, icon: <HeartCrack className="w-4 h-4" />, color: "text-orange-500 bg-orange-50" },
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
                </div>
            </div>

            {/* ── Latest Results ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latest Classification */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-indigo-300" />
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Klasifikasi Terkini</span>
                            </div>
                            {latestClassify && (
                                <span className="text-[11px] text-gray-400">{timeAgo(latestClassify.created_at)}</span>
                            )}
                        </div>

                        {latestClassify ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {latestClassify.prediction === "Normal"
                                        ? <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                                        : <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                                    }
                                    <div>
                                        <p className={`text-2xl font-bold ${latestClassify.prediction === "Normal" ? "text-green-600" : "text-red-600"}`}>
                                            {latestClassify.prediction ?? "—"}
                                        </p>
                                        <p className="text-xs text-gray-400">{formatTime(latestClassify.created_at)}</p>
                                    </div>
                                </div>
                                {latestClassify.confidence !== null && (
                                    <div title="Tingkat keyakinan model terhadap prediksi ini">
                                        <ConfidenceBar value={latestClassify.confidence} />
                                    </div>
                                )}
                                {latestClassify.input_data && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {latestClassify.input_data.suhu !== undefined && (
                                            <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Suhu {latestClassify.input_data.suhu}°C</span>
                                        )}
                                        {latestClassify.input_data.kelembaban !== undefined && (
                                            <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Kelembaban {latestClassify.input_data.kelembaban}%</span>
                                        )}
                                        {latestClassify.input_data.amoniak !== undefined && (
                                            <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Amoniak {Number(latestClassify.input_data.amoniak).toFixed(3)}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-gray-400">Belum ada data klasifikasi</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Latest Forecasting */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-orange-300" />
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Forecasting Terkini</span>
                            </div>
                            {latestForecast && (
                                <span className="text-[11px] text-gray-400">{timeAgo(latestForecast.created_at)}</span>
                            )}
                        </div>

                        {latestForecast ? (
                            <div className="flex flex-col justify-between h-full space-y-3 pt-2">
                                <div className="flex items-center gap-3">
                                    {(latestForecast.predicted_death ?? 0) > 0
                                        ? <HeartCrack className="w-8 h-8 text-red-500 flex-shrink-0" />
                                        : <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                                    }
                                    <div>
                                        <p className={`text-2xl font-bold ${(latestForecast.predicted_death ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                                            {(latestForecast.predicted_death ?? 0) > 0 ? `${latestForecast.predicted_death} kematian` : "Aman"}
                                        </p>
                                        <p className="text-xs text-gray-400">{formatTime(latestForecast.created_at)}</p>
                                    </div>
                                </div>
                                {(() => {
                                    const history: any[] = latestForecast.input_data?.sensor_history ?? [];
                                    const last = history[history.length - 1];
                                    if (!last) return null;
                                    return (
                                        <div className="flex flex-wrap gap-2 pt-6">
                                            {last.temp !== undefined && <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Suhu {last.temp}°C</span>}
                                            {last.hum !== undefined && <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Kelembaban {last.hum}%</span>}
                                            {last.ammo !== undefined && <span className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-500">Amoniak {Number(last.ammo).toFixed(3)}</span>}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-gray-400">Belum ada data forecasting</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── History ─────────────────────────────────────────────────── */}
            <Card>
                {/* Tabs + Filter toggle */}
                <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-0">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab("classification")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === "classification" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Klasifikasi
                            <span className="text-[10px] text-gray-400">{summary.classification.total}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("forecasting")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === "forecasting" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Forecasting
                            <span className="text-[10px] text-gray-400">{summary.forecasting.total}</span>
                        </button>
                    </div>
                    <button
                        onClick={() => setShowFilter(v => !v)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isFiltered ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                        {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </button>
                </div>

                {/* Filter panel */}
                {showFilter && (
                    <div className="mx-5 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-medium text-gray-500">Dari Tanggal</label>
                            <input
                                type="date"
                                value={startInput}
                                onChange={e => setStartInput(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-medium text-gray-500">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={endInput}
                                onChange={e => setEndInput(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                            />
                        </div>
                        <button
                            onClick={applyFilter}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                        >
                            Terapkan
                        </button>
                        {isFiltered && (
                            <button
                                onClick={resetFilter}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                            >
                                <X className="w-3 h-3" /> Reset
                            </button>
                        )}
                    </div>
                )}


                <CardContent className="p-0 mt-4">
                    {!loadingHistory && pagedRecords.length === 0 ? (
                        <div className="py-14 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Belum ada data {activeTab === "classification" ? "klasifikasi" : "forecasting"}</p>
                            <p className="text-xs text-gray-300 mt-1">Prediksi otomatis berjalan saat IoT mengirim data</p>
                        </div>
                    ) : activeTab === "classification" ? (
                        <>
                            <div className="relative overflow-x-auto">
                                {loadingHistory && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                                    </div>
                                )}
                                <table className="w-full text-sm table-fixed">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <Th col="created_at" label="Waktu" className="w-[20%]" />
                                            <Th col="prediction" label="Hasil" className="w-[25%]" />
                                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap w-[18%]">Suhu</th>
                                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap w-[18%]">Kelembaban</th>
                                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap w-[19%]">Amoniak (ppm)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pagedRecords.map((r) => {
                                            const inp = r.input_data ?? {};
                                            const isAbn = r.prediction === "Abnormal";
                                            return (
                                                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatTime(r.created_at)}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isAbn ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
                                                                >
                                                                    {isAbn ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                                                    {r.prediction ?? "—"}
                                                                </span>
                                                                {!isAdmin && r.confidence !== null && (
                                                                    <Tooltip
                                                                        content={`Keyakinan model: ${Math.round((r.confidence ?? 0) * 100)}%\nSemakin tinggi, semakin yakin model terhadap hasil prediksinya.`}
                                                                        side="top"
                                                                        className="cursor-help flex-shrink-0"
                                                                    >
                                                                        <Info className="w-3.5 h-3.5 text-gray-400" />
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            {isAdmin && r.confidence !== null && (
                                                                <div className="w-28" title="Tingkat keyakinan model terhadap prediksi ini">
                                                                    <ConfidenceBar value={r.confidence} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-700 tabular-nums">{inp.suhu ?? inp["Suhu"] ?? "—"}{inp.suhu !== undefined || inp["Suhu"] !== undefined ? "°C" : ""}</td>
                                                    <td className="py-3 px-4 text-gray-700 tabular-nums">{inp.kelembaban ?? inp["Kelembaban"] !== undefined ? `${inp.kelembaban ?? inp["Kelembaban"]}%` : "—"}</td>
                                                    <td className="py-3 px-4 text-gray-700 tabular-nums">
                                                        {inp.amoniak !== undefined ? Number(inp.amoniak).toFixed(3)
                                                            : inp["Amoniak"] !== undefined ? Number(inp["Amoniak"]).toFixed(3) : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative overflow-x-auto">
                                {loadingHistory && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                                    </div>
                                )}
                                <table className="w-full text-sm table-fixed">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <Th col="created_at" label="Waktu Prediksi" className="w-[18%]" />
                                            <Th col="predicted_death" label="Prediksi Kematian" className="w-[18%]" />
                                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap w-[16%]">Risiko</th>
                                            {isAdmin && (
                                                <th
                                                    className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left whitespace-nowrap w-[14%] cursor-pointer select-none hover:text-gray-600"
                                                    onClick={() => handleSort("raw_prediction")}
                                                >
                                                    <Tooltip
                                                        content={"Nilai mentah keluaran model ML sebelum dibulatkan.\nSemakin tinggi nilainya, semakin besar risiko kematian yang diprediksi."}
                                                        side="top"
                                                        className="cursor-help"
                                                    >
                                                        <span className="inline-flex items-center gap-1 underline decoration-dotted decoration-gray-300">
                                                            Skor Estimasi
                                                            {sortKey === "raw_prediction"
                                                                ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-green-600" /> : <ChevronDown className="w-3 h-3 text-green-600" />)
                                                                : <ChevronDown className="w-3 h-3 opacity-30" />}
                                                        </span>
                                                    </Tooltip>
                                                </th>
                                            )}
                                            <th className={`py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left ${isAdmin ? "w-[34%]" : "w-[48%]"}`}>Input Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pagedRecords.map((r) => {
                                            const hasRisk = (r.predicted_death ?? 0) > 0;
                                            const history: any[] = r.input_data?.sensor_history ?? [];
                                            return (
                                                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatTime(r.created_at)}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-lg font-bold ${hasRisk ? "text-red-600" : "text-green-600"}`}>
                                                                {r.predicted_death ?? 0}
                                                            </span>
                                                            <span className="text-xs text-gray-400">ekor</span>
                                                            {!isAdmin && r.raw_prediction !== null && r.raw_prediction !== undefined && (
                                                                <Tooltip
                                                                    content={`Skor estimasi: ${Number(r.raw_prediction).toFixed(4)}\nNilai mentah model sebelum dibulatkan menjadi prediksi kematian.`}
                                                                    side="top"
                                                                    className="cursor-help flex-shrink-0"
                                                                >
                                                                    <Info className="w-3.5 h-3.5 text-gray-400" />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {(() => {
                                                            const d = r.predicted_death ?? 0;
                                                            if (d === 0) return (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                                                    <CheckCircle2 className="w-3 h-3" /> Aman
                                                                </span>
                                                            );
                                                            if (d === 1) return (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                                                                    <AlertTriangle className="w-3 h-3" /> Waspada
                                                                </span>
                                                            );
                                                            return (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                                                    <HeartCrack className="w-3 h-3" /> Bahaya
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="py-3 px-4 text-xs text-gray-500 tabular-nums">
                                                            {r.raw_prediction !== null && r.raw_prediction !== undefined
                                                                ? Number(r.raw_prediction).toFixed(4)
                                                                : "—"}
                                                        </td>
                                                    )}
                                                    <td className="py-3 px-4">
                                                        {history.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {history.map((pt: any, i: number) => (
                                                                    <span key={i} className="text-[10px] bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-500 whitespace-nowrap">
                                                                        T{i + 1}: {pt.temp}°C {pt.hum}% {Number(pt.ammo).toFixed(2)}ppm
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-300">{r.input_data?.input_count ?? "—"}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {!loadingHistory && totalRecords > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <p className="text-xs text-gray-400">
                                    Halaman <span className="font-semibold text-gray-700">{historyPage}</span> dari{" "}
                                    <span className="font-semibold text-gray-700">{totalPages}</span>
                                    {" "}· {totalRecords} total
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <span>Tampilkan</span>
                                    <select
                                        value={historyPageSize}
                                        onChange={e => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}
                                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                    >
                                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <span>baris</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setHistoryPage(1)} disabled={historyPage === 1}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(historyPage - 2, totalPages - 4));
                                    const page = start + i;
                                    return (
                                        <button key={page} onClick={() => setHistoryPage(page)}
                                            className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${page === historyPage ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                                            {page}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button onClick={() => setHistoryPage(totalPages)} disabled={historyPage === totalPages}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Model Info (collapsible) ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowModelInfo(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-50 rounded-lg">
                            <Cpu className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Informasi Model</span>
                    </div>
                    {showModelInfo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showModelInfo && (
                    <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-gray-800">Model Klasifikasi</span>
                                </div>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    <Activity className="w-2.5 h-2.5" /> Active
                                </span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Algoritma</span><span className="font-medium text-gray-800">{classModel?.type ?? "RandomForestClassifier"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Output</span><span className="font-medium text-gray-800">Normal / Abnormal</span></div>
                                {classModel?.metrics && (
                                    <>
                                        <div className="flex justify-between"><span className="text-gray-500">Accuracy</span><span className="font-semibold text-green-700">{classModel.metrics.accuracy}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">F1 Score</span><span className="font-semibold text-green-700">{classModel.metrics.f1_score}</span></div>
                                    </>
                                )}
                                <div className="pt-1.5 border-t border-gray-200">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Input: Suhu, Kelembaban, NH₃, Pakan, Minum, Bobot, Populasi, Luas Kandang, Hari, Jam</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-gray-800">Model Forecasting</span>
                                </div>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    <Activity className="w-2.5 h-2.5" /> Active
                                </span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Algoritma</span><span className="font-medium text-gray-800">{forecastModel?.type ?? "XGBRegressor"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Output</span><span className="font-medium text-gray-800">Jumlah Kematian (ekor)</span></div>
                                {forecastModel?.metrics && (
                                    <>
                                        <div className="flex justify-between"><span className="text-gray-500">RMSE</span><span className="font-semibold text-green-700">{forecastModel.metrics.rmse}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Pearson</span><span className="font-semibold text-green-700">{forecastModel.metrics.pearson}</span></div>
                                    </>
                                )}
                                <div className="pt-1.5 border-t border-gray-200">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Input: 4 data berurutan (Suhu, Hum, NH₃, Kematian) · Window: 2 jam (30 menit/interval)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
