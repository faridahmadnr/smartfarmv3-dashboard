"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
    AlertTriangle,
    Building2,
    CalendarRange,
    Check,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    RefreshCw,
    X,
    XCircle,
} from "lucide-react";
import { dailyLogsApi, deathReportsApi, kandangApi } from "@/lib/api";
import type { ReportDailyLog, ReportDeath } from "@/lib/pdf/dailyLogReport";

type PeriodKey = "cycle" | "7d" | "full" | "month";
type Phase = "configure" | "generating" | "success" | "error" | "cancelled";

interface Props {
    open: boolean;
    onClose: () => void;
    kandangId?: string;
    kandangName: string;
    kandangType: string;
}

interface ExportResult {
    fileName: string;
    size: number;
    pageCount: number;
    logCount: number;
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string; description: string }[] = [
    { key: "cycle", label: "Siklus Aktif", description: "Sejak awal siklus berjalan" },
    { key: "7d", label: "7 Hari Terakhir", description: "Rekap satu minggu terakhir" },
    { key: "full", label: "Siklus Penuh", description: "Seluruh catatan tersimpan" },
    { key: "month", label: "Bulan Ini", description: "Sejak awal bulan berjalan" },
];

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function toIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function rangeFor(period: PeriodKey, cycleStart: string | null, firstLogDate: string | null) {
    const today = new Date();
    const end = toIso(today);
    const fallback = firstLogDate ?? cycleStart ?? toIso(startOfMonth(today));

    let start = fallback;
    if (period === "7d") start = toIso(addDays(today, -6));
    else if (period === "month") start = toIso(startOfMonth(today));
    else if (period === "cycle") start = cycleStart ?? fallback;
    else if (period === "full") start = firstLogDate ?? cycleStart ?? fallback;

    if (start > end) start = end;
    return { start, end };
}

function formatShort(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${BULAN[(m ?? 1) - 1]} ${y}`;
}

function formatRange(start: string, end: string): string {
    if (start === end) return formatShort(start);
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    if (sy === ey && sm === em) {
        return `${sd} - ${ed} ${BULAN[(em ?? 1) - 1]} ${ey}`;
    }
    return `${formatShort(start)} - ${formatShort(end)}`;
}

function daysBetween(start: string, end: string): number {
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const a = new Date(sy, (sm ?? 1) - 1, sd ?? 1).getTime();
    const b = new Date(ey, (em ?? 1) - 1, ed ?? 1).getTime();
    return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

function slugify(value: string): string {
    return value.replace(/[^\w\s-]/g, "").replace(/\s+/g, "") || "Kandang";
}

function buildFileName(kandangName: string, start: string, end: string): string {
    return `Laporan_CatatanHarian_${slugify(kandangName)}_${start.replace(/-/g, "")}-${end.replace(/-/g, "")}.pdf`;
}

function formatBytes(bytes: number): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractItems<T>(response: unknown): { items: T[]; total: number } {
    const res = response as { data?: unknown } | null;
    const payload = (res?.data ?? res) as { items?: T[]; total?: number } | null;
    return { items: payload?.items ?? [], total: payload?.total ?? 0 };
}

async function fetchAllLogs(
    kandangId: string,
    token: string,
    start: string,
    end: string,
): Promise<ReportDailyLog[]> {
    const perPage = 100;
    const all: ReportDailyLog[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (all.length < total && page <= 50) {
        const response = await dailyLogsApi.list(
            { page, per_page: perPage, start_date: start, end_date: end, kandang_id: kandangId },
            token,
        );
        const { items, total: count } = extractItems<ReportDailyLog>(response);
        total = count;
        all.push(...items);
        if (items.length === 0) break;
        page += 1;
    }

    return all;
}

async function fetchAllDeaths(kandangId: string, token: string): Promise<ReportDeath[]> {
    const perPage = 100;
    const all: ReportDeath[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (all.length < total && page <= 50) {
        const response = await deathReportsApi.list({ page, per_page: perPage, kandang_id: kandangId }, token);
        const { items, total: count } = extractItems<ReportDeath>(response);
        total = count;
        all.push(...items);
        if (items.length === 0) break;
        page += 1;
    }

    return all;
}

export function ExportPDFModal({ open, onClose, kandangId, kandangName, kandangType }: Props) {
    const { data: session } = useSession();
    const token = session?.accessToken;

    const [phase, setPhase] = useState<Phase>("configure");
    const [period, setPeriod] = useState<PeriodKey>("cycle");
    const [includeCharts, setIncludeCharts] = useState(true);
    const [cycleStart, setCycleStart] = useState<string | null>(null);
    const [firstLogDate, setFirstLogDate] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ExportResult | null>(null);

    const cancelledRef = useRef(false);
    const runIdRef = useRef(0);

    const range = useMemo(() => rangeFor(period, cycleStart, firstLogDate), [period, cycleStart, firstLogDate]);
    const fileName = useMemo(
        () => buildFileName(kandangName, range.start, range.end),
        [kandangName, range.start, range.end],
    );
    const totalDays = useMemo(() => daysBetween(range.start, range.end), [range.start, range.end]);

    const resetToConfigure = useCallback(() => {
        cancelledRef.current = false;
        setPhase("configure");
        setError(null);
        setProgress("");
        setResult(null);
    }, []);

    useEffect(() => {
        if (!open) return;

        const runId = runIdRef.current + 1;
        runIdRef.current = runId;
        cancelledRef.current = false;
        setPhase("configure");
        setPeriod("cycle");
        setIncludeCharts(true);
        setCycleStart(null);
        setFirstLogDate(null);
        setError(null);
        setResult(null);
        setProgress("");

        if (!kandangId || !token) return;

        let active = true;
        setPreviewLoading(true);

        (async () => {
            try {
                const [kandangResponse, listResponse] = await Promise.all([
                    kandangApi.get(kandangId, token).catch(() => null),
                    dailyLogsApi.list({ page: 1, per_page: 100, kandang_id: kandangId }, token).catch(() => null),
                ]);

                if (!active || runIdRef.current !== runId) return;

                const kandangData = (kandangResponse as { data?: { tanggal_mulai_siklus?: string | null } } | null)?.data;
                if (kandangData?.tanggal_mulai_siklus) {
                    setCycleStart(kandangData.tanggal_mulai_siklus.slice(0, 10));
                }

                const { total } = extractItems<ReportDailyLog>(listResponse);
                if (total > 0) {
                    const lastPage = Math.max(1, Math.ceil(total / 100));
                    const lastResponse = await dailyLogsApi.list(
                        { page: lastPage, per_page: 100, kandang_id: kandangId },
                        token,
                    );
                    if (!active || runIdRef.current !== runId) return;
                    const oldest = extractItems<ReportDailyLog>(lastResponse).items
                        .map((item) => item.date.slice(0, 10))
                        .sort((a, b) => a.localeCompare(b));
                    if (oldest.length > 0) setFirstLogDate(oldest[0]);
                }
            } catch {
                // Preview is best-effort; export will surface any real error.
            } finally {
                if (active && runIdRef.current === runId) setPreviewLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [open, kandangId, token]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && phase !== "generating") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, phase, onClose]);

    const handleClose = () => {
        if (phase === "generating") return;
        onClose();
    };

    const cancelExport = () => {
        cancelledRef.current = true;
        runIdRef.current += 1;
        setPhase("cancelled");
        setProgress("");
    };

    const runExport = useCallback(async () => {
        if (!kandangId || !token) {
            setError("Sesi atau kandang tidak tersedia. Muat ulang halaman lalu coba lagi.");
            setPhase("error");
            return;
        }

        const runId = runIdRef.current + 1;
        runIdRef.current = runId;
        cancelledRef.current = false;
        setPhase("generating");
        setError(null);
        setResult(null);
        setProgress("Mengambil catatan harian...");

        try {
            const logs = await fetchAllLogs(kandangId, token, range.start, range.end);
            if (cancelledRef.current || runIdRef.current !== runId) return;

            if (logs.length === 0) {
                throw new Error("Tidak ada catatan harian pada rentang waktu ini. Pilih periode lain atau tambahkan catatan terlebih dahulu.");
            }

            setProgress("Mengambil laporan kematian...");
            const allDeaths = await fetchAllDeaths(kandangId, token);
            if (cancelledRef.current || runIdRef.current !== runId) return;

            const deaths = allDeaths.filter((item) => {
                const day = new Date(item.timestamp).toLocaleDateString("sv-SE");
                return day >= range.start && day <= range.end;
            });

            setProgress("Menyusun tata letak laporan...");
            const { buildDailyLogReport } = await import("@/lib/pdf/dailyLogReport");
            if (cancelledRef.current || runIdRef.current !== runId) return;

            await new Promise((resolve) => setTimeout(resolve, 260));
            if (cancelledRef.current || runIdRef.current !== runId) return;

            const report = buildDailyLogReport(
                logs,
                deaths,
                {
                    kandangName,
                    kandangType,
                    startDate: range.start,
                    endDate: range.end,
                    generatedAt: new Date(),
                },
                { includeCharts },
            );

            setProgress("Mengunduh berkas PDF...");
            if (cancelledRef.current || runIdRef.current !== runId) return;

            const url = URL.createObjectURL(report.blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 4000);

            setResult({
                fileName,
                size: report.size,
                pageCount: report.pageCount,
                logCount: report.logCount,
            });
            setPhase("success");
        } catch (err) {
            if (cancelledRef.current) {
                setPhase("cancelled");
                return;
            }
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat laporan PDF.");
            setPhase("error");
        }
    }, [kandangId, token, range.start, range.end, kandangName, kandangType, includeCharts, fileName]);

    if (!open) return null;

    const accent =
        phase === "success" ? "from-emerald-500 to-teal-400"
            : phase === "error" ? "from-red-500 to-rose-400"
                : phase === "cancelled" ? "from-amber-400 to-orange-400"
                    : "from-emerald-500 via-emerald-400 to-teal-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

                    <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={`p-2 rounded-xl ${phase === "error" ? "bg-red-50" : phase === "cancelled" ? "bg-amber-50" : "bg-emerald-50"}`}
                            >
                                {phase === "error" ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                ) : phase === "cancelled" ? (
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <FileText className="w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">
                                    {phase === "configure" && "Ekspor Laporan PDF"}
                                    {phase === "generating" && "Menyiapkan Laporan PDF"}
                                    {phase === "success" && "Laporan Siap Diunduh"}
                                    {phase === "error" && "Gagal Mengunduh Laporan"}
                                    {phase === "cancelled" && "Pengunduhan Dibatalkan"}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {phase === "configure" && "Rekap catatan harian dalam satu dokumen rapi."}
                                    {phase === "generating" && "Mohon tunggu, laporan sedang dibuat."}
                                    {phase === "success" && "Berkas PDF berhasil dibuat dan diunduh."}
                                    {phase === "error" && "Proses pembuatan laporan tidak selesai."}
                                    {phase === "cancelled" && "Tidak ada berkas yang diunduh."}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={phase === "generating"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {phase === "configure" && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Ringkasan Berkas</span>
                                    {previewLoading ? (
                                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Memuat
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-medium text-emerald-600 bg-white/70 border border-emerald-100 px-2 py-0.5 rounded-full">Siap diekspor</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <CalendarRange className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-400 font-medium">Periode</p>
                                            <p className="text-xs font-semibold text-gray-800 truncate">{formatRange(range.start, range.end)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Total</p>
                                            <p className="text-xs font-semibold text-gray-800">{totalDays} hari operasi</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-400 font-medium">Kandang</p>
                                            <p className="text-xs font-semibold text-gray-800 truncate">{kandangName} · {kandangType}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Format</p>
                                            <p className="text-xs font-semibold text-gray-800">PDF · A4</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Rentang Waktu Rekapitulasi</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PERIOD_OPTIONS.map((option) => {
                                        const selected = period === option.key;
                                        return (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => setPeriod(option.key)}
                                                className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${selected
                                                    ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/30"
                                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className="flex items-center justify-between">
                                                    <span className={`text-xs font-semibold ${selected ? "text-emerald-700" : "text-gray-700"}`}>
                                                        {option.label}
                                                    </span>
                                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                                                        {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </span>
                                                </span>
                                                <span className="block text-[10px] text-gray-400 mt-0.5">{option.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIncludeCharts((value) => !value)}
                                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${includeCharts ? "bg-emerald-600 border-emerald-600" : "border-gray-300 bg-white"}`}>
                                    {includeCharts && <Check className="w-3 h-3 text-white" />}
                                </span>
                                <span>
                                    <span className="block text-xs font-semibold text-gray-700">Sertakan grafik tren & evaluasi FCR</span>
                                    <span className="block text-[10px] text-gray-400 mt-0.5">Tampilkan visual pakan, minum, populasi, kematian, dan estimasi performa.</span>
                                </span>
                            </button>

                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Berkas memuat seluruh field catatan harian: tanggal, pakan, minum, populasi, bobot, catatan, serta laporan kematian pada periode terpilih.
                            </p>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={cancelExport}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={runExport}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Unduh Laporan PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === "generating" && (
                        <div className="py-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative w-14 h-14 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                                    <FileText className="absolute inset-0 m-auto w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{progress}</p>
                                <p className="text-xs text-gray-400 mt-1">{fileName}</p>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-5 overflow-hidden">
                                    <div className="h-full w-2/3 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3">Proses ini biasanya hanya membutuhkan beberapa detik.</p>
                            </div>
                            <button
                                type="button"
                                onClick={cancelExport}
                                className="mt-6 w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Batalkan Pengunduhan
                            </button>
                        </div>
                    )}

                    {phase === "success" && result && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center text-center py-2">
                                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Laporan PDF Berhasil Diunduh!</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                                    Dokumen rekapitulasi catatan harian telah selesai dibuat dan tersimpan di penyimpanan perangkat Anda.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{result.fileName}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {formatBytes(result.size)} · {result.pageCount} halaman · {result.logCount} catatan
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center">Tersimpan di direktori unduhan perangkat Anda.</p>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                            >
                                Selesai
                            </button>
                        </div>
                    )}

                    {phase === "cancelled" && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center text-center py-2">
                                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Pengunduhan Laporan PDF Dibatalkan</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                                    Proses pembuatan dan pengunduhan berkas dibatalkan. Anda dapat mengunduh ulang laporan ini kapan saja tanpa kehilangan data.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{fileName}</p>
                                    <p className="text-[10px] text-gray-400">{formatRange(range.start, range.end)} · {totalDays} hari</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToConfigure}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Coba Unduh Lagi
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === "error" && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center text-center py-2">
                                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                    <XCircle className="w-7 h-7 text-red-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Laporan Gagal Diunduh</p>
                                <p className="text-xs text-gray-400 mt-1">Dokumen PDF tidak dapat dibuat saat ini.</p>
                            </div>

                            <div className="rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5">
                                <p className="text-[11px] text-red-700 leading-relaxed">
                                    {error ?? "Terjadi kesalahan yang tidak diketahui. Silakan coba lagi."}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="button"
                                    onClick={runExport}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Coba Unduh Lagi
                                </button>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
}
