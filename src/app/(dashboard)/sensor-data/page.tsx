"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Thermometer, Droplets, Wind, Users, HeartCrack,
    TrendingUp, Table2, Database,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, ArrowUp, ArrowDown,
    X, RotateCcw, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSensorData, useMyKandang, useCreateSensorData, useUpdateSensorData } from "@/hooks/useApi";
import { useLiveSensorData } from "@/hooks/useLiveSensorData";

// ─── Stat Card (same pattern as dashboard) ────────────────────────────────────

function StatCard({
    label, value, unit, sub, icon, iconBg, iconColor, topBar,
}: {
    label: string; value: string; unit?: string; sub?: string;
    icon: React.ReactNode; iconBg: string; iconColor: string; topBar: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`h-1 w-full ${topBar}`} />
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                    <div className={`p-1.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-gray-900 tracking-tight">{value}</span>
                    {unit && <span className="text-xs text-gray-400 font-medium">{unit}</span>}
                </div>
                {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = "timestamp" | "hari_ke" | "suhu" | "kelembaban" | "amoniak" | "populasi" | "death";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc"
        ? <ArrowUp className="w-3 h-3 text-green-600" />
        : <ArrowDown className="w-3 h-3 text-green-600" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function SensorDataPage() {
    const { data: session, status } = useSession();
    const { data: kandang, loading: loadingKandang } = useMyKandang();

    // ── All filter/pagination state declared first (needed by useSensorData) ──
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortKey, setSortKey] = useState<SortKey>("timestamp");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "warning" | "danger">("all");
    const [hariKeFilter, setHariKeFilter] = useState("");
    const [startInput, setStartInput] = useState("");
    const [endInput, setEndInput] = useState("");
    const [appliedStart, setAppliedStart] = useState("");
    const [appliedEnd, setAppliedEnd] = useState("");

    // Reset page when date filter changes
    useEffect(() => { setCurrentPage(1); }, []);

    const applyDateFilter = () => {
        setAppliedStart(startInput ? `${startInput}T00:00:00` : "");
        setAppliedEnd(endInput ? `${endInput}T23:59:59` : "");
        setCurrentPage(1);
    };
    const resetDateFilter = () => {
        setStartInput(""); setEndInput("");
        setAppliedStart(""); setAppliedEnd("");
        setHariKeFilter("");
        setStatusFilter("all");
        setChartPreset("all");
        setCurrentPage(1);
    };
    const applyPreset = (preset: "all" | "today" | "7d" | "30d" | "custom") => {
        setChartPreset(preset);
        if (preset === "all") { resetDateFilter(); return; }
        if (preset === "custom") return;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        let startStr = todayStr;
        if (preset === "7d") {
            const d = new Date(now); d.setDate(d.getDate() - 6);
            startStr = d.toISOString().split("T")[0];
        } else if (preset === "30d") {
            startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        }
        setStartInput(startStr); setEndInput(todayStr);
        setAppliedStart(`${startStr}T00:00:00`);
        setAppliedEnd(`${todayStr}T23:59:59`);
        setCurrentPage(1);
    };
    const hasActiveFilter = appliedStart || appliedEnd || hariKeFilter || statusFilter !== "all";

    const [showFilters, setShowFilters] = useState(false);
    const [chartPreset, setChartPreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");

    const { data: sensorData, loading, isFetching, error, refetch } = useSensorData({
        page: currentPage,
        page_size: pageSize,
        start_date: appliedStart || undefined,
        end_date: appliedEnd || undefined,
    });

    const { mutate: createSensorData, loading: creating } = useCreateSensorData();
    const { mutate: updateSensorData, loading: updating } = useUpdateSensorData();
    const { connected, liveReadings, lastReceived } = useLiveSensorData();

    // ── Form / Edit state ─────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"charts" | "table">("charts");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        hari_ke: "", tanggal: new Date().toISOString().split("T")[0],
        jam: new Date().toTimeString().slice(0, 5),
        suhu: "", kelembaban: "", amoniak: "", pakan: "", minum: "", populasi: "", bobot: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editData, setEditData] = useState({ pakan: "", minum: "", bobot: "", populasi: "", death: "" });
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    // ── Merge live WS data ────────────────────────────────────────────────────
    const rawApiData = sensorData?.items || [];
    const total = sensorData?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rawData = useMemo(() => {
        if (liveReadings.length === 0 || currentPage !== 1) return rawApiData;
        const apiIds = new Set(rawApiData.map((r: any) => r.id));
        const uniqueLive = liveReadings.filter(lr => !apiIds.has(lr.id));
        return [...uniqueLive, ...rawApiData];
    }, [liveReadings, rawApiData, currentPage]);

    const canInput = session?.user?.role === "admin" || session?.user?.role === "pemilik" || session?.user?.role === "peternak";

    // ── Sort + filter pipeline (client-side on current page) ─────────────────
    const processedData = useMemo(() => {
        let data = [...rawData];

        // Hari ke filter
        if (hariKeFilter.trim()) {
            data = data.filter((r: any) => String(r.hari_ke) === hariKeFilter.trim());
        }

        // Status filter
        if (statusFilter !== "all") {
            data = data.filter((r: any) => {
                if (statusFilter === "danger") return r.amoniak > 10 || r.suhu > 32;
                if (statusFilter === "warning") return (r.amoniak > 5 || r.suhu > 30) && !(r.amoniak > 10 || r.suhu > 32);
                return r.amoniak <= 5 && r.suhu <= 30;
            });
        }

        // Sort
        data.sort((a: any, b: any) => {
            let av = a[sortKey], bv = b[sortKey];
            if (sortKey === "timestamp") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
            av = av ?? 0; bv = bv ?? 0;
            return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

        return data;
    }, [rawData, hariKeFilter, statusFilter, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = rawData.length > 0 ? {
        avgSuhu: (rawData.reduce((a: number, b: any) => a + (b.suhu || 0), 0) / rawData.length).toFixed(1),
        minSuhu: Math.min(...rawData.map((r: any) => r.suhu || 0)).toFixed(1),
        maxSuhu: Math.max(...rawData.map((r: any) => r.suhu || 0)).toFixed(1),
        avgHum: (rawData.reduce((a: number, b: any) => a + (b.kelembaban || 0), 0) / rawData.length).toFixed(1),
        avgAmmo: (rawData.reduce((a: number, b: any) => a + (b.amoniak || 0), 0) / rawData.length).toFixed(3),
        latestPopulasi: rawData[0]?.populasi,
        totalDeath: rawData.reduce((a: number, b: any) => a + (b.death || 0), 0),
    } : null;

    // ── Chart data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => [...rawData].reverse().map((row: any) => ({
        time: new Date(row.timestamp).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
        suhu: row.suhu, kelembaban: row.kelembaban, amoniak: row.amoniak,
        populasi: row.populasi, death: row.death ?? 0,
        pakan: row.pakan ?? 0, minum: row.minum ?? 0,
    })), [rawData]);

    const tooltipStyle = {
        backgroundColor: "#fff", border: "1px solid #e5e7eb",
        borderRadius: "12px", padding: "12px 16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        const payload: any = {
            timestamp: `${formData.tanggal}T${formData.jam}:00`,
            hari_ke: parseInt(formData.hari_ke) || 1,
            suhu: parseFloat(formData.suhu) || 0,
            kelembaban: parseFloat(formData.kelembaban) || 0,
            amoniak: parseFloat(formData.amoniak) || 0,
            pakan: parseFloat(formData.pakan) || undefined,
            minum: parseFloat(formData.minum) || undefined,
            populasi: parseInt(formData.populasi) || undefined,
            bobot: parseFloat(formData.bobot) || undefined,
        };
        const result = await createSensorData(payload);
        if (result.success) {
            setFormSuccess("Data sensor berhasil disimpan!");
            setShowForm(false);
            setFormData({ hari_ke: "", tanggal: new Date().toISOString().split("T")[0], jam: new Date().toTimeString().slice(0, 5), suhu: "", kelembaban: "", amoniak: "", pakan: "", minum: "", populasi: "", bobot: "" });
            refetch();
        } else {
            setFormError(result.error || "Gagal menyimpan data");
        }
    };

    const openEditModal = (row: any) => {
        setEditingRow(row);
        setEditData({ pakan: row.pakan?.toString() || "", minum: row.minum?.toString() || "", bobot: row.bobot?.toString() || "", populasi: row.populasi?.toString() || "", death: row.death?.toString() || "" });
        setEditError(""); setEditSuccess("");
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditError("");
        const payload: any = {};
        if (editData.pakan !== "") payload.pakan = parseFloat(editData.pakan);
        if (editData.minum !== "") payload.minum = parseFloat(editData.minum);
        if (editData.bobot !== "") payload.bobot = parseFloat(editData.bobot);
        if (editData.populasi !== "") payload.populasi = parseInt(editData.populasi);
        if (editData.death !== "") payload.death = parseInt(editData.death);
        const result = await updateSensorData(editingRow.id, payload);
        if (result.success) {
            setEditSuccess("Data berhasil diupdate!");
            setTimeout(() => { setEditingRow(null); setEditSuccess(""); refetch(); }, 1500);
        } else {
            setEditError(result.error || "Gagal update");
        }
    };

    const getStatusBadge = (suhu: number, amoniak: number) => {
        if (amoniak > 10 || suhu > 32) return <Badge variant="danger">Bahaya</Badge>;
        if (amoniak > 5 || suhu > 30) return <Badge variant="warning">Waspada</Badge>;
        return <Badge variant="success">Normal</Badge>;
    };

    const formatTimestamp = (ts: string) => {
        try { return new Date(ts).toLocaleString("id-ID"); } catch { return ts; }
    };

    const ThSort = ({ col, label }: { col: SortKey; label: string }) => (
        <th
            className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer select-none"
            onClick={() => handleSort(col)}
        >
            <div className="flex items-center gap-1.5">
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </div>
        </th>
    );

    // ── Loading / Empty guards ─────────────────────────────────────────────────
    if (status === "loading" || loadingKandang) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    if (!kandang) {
        return (
            <div className="flex justify-center py-12">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">Belum ada kandang. Hubungi admin untuk setup kandang.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data Sensor</h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <p className="text-sm text-gray-400">{kandang.nama}</p>
                        <span className="text-gray-300">·</span>
                        <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-600" : "text-gray-400"}`}>
                            <span className="relative flex h-2 w-2">
                                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-gray-400"}`} />
                            </span>
                            {connected ? "Live" : "Connecting..."}
                        </span>
                        {lastReceived && (
                            <span className="text-xs text-gray-400">
                                Update: {lastReceived.toLocaleTimeString("id-ID")}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tab toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
                        <button
                            onClick={() => setActiveTab("charts")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "charts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <TrendingUp className="w-4 h-4" /> Grafik
                        </button>
                        <button
                            onClick={() => setActiveTab("table")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <Table2 className="w-4 h-4" /> Tabel
                        </button>
                    </div>
                    {canInput && (
                        <Button onClick={() => setShowForm(!showForm)}>
                            {showForm ? "Tutup" : "+ Input Manual"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Avg Suhu" value={stats.avgSuhu} unit="°C"
                        sub={`${stats.minSuhu} – ${stats.maxSuhu}°C`}
                        icon={<Thermometer className="w-4 h-4" />}
                        iconBg="bg-amber-50" iconColor="text-amber-500" topBar="bg-amber-400" />
                    <StatCard label="Avg Kelembaban" value={stats.avgHum} unit="%"
                        icon={<Droplets className="w-4 h-4" />}
                        iconBg="bg-sky-50" iconColor="text-sky-500" topBar="bg-sky-400" />
                    <StatCard label="Avg Amoniak" value={stats.avgAmmo} unit="ppm"
                        icon={<Wind className="w-4 h-4" />}
                        iconBg="bg-orange-50" iconColor="text-orange-500" topBar="bg-orange-400" />
                    <StatCard label="Populasi" value={stats.latestPopulasi?.toLocaleString() ?? "-"} unit="ekor"
                        icon={<Users className="w-4 h-4" />}
                        iconBg="bg-emerald-50" iconColor="text-emerald-500" topBar="bg-emerald-400" />
                    <StatCard label="Total Kematian" value={String(stats.totalDeath)} unit="ekor"
                        icon={<HeartCrack className="w-4 h-4" />}
                        iconBg="bg-red-50" iconColor="text-red-500" topBar="bg-red-400" />
                    <StatCard label="Total Data" value={String(total)}
                        icon={<Database className="w-4 h-4" />}
                        iconBg="bg-violet-50" iconColor="text-violet-500" topBar="bg-violet-400" />
                </div>
            )}

            {/* Quick Preset Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Periode:</span>
                {([
                    { id: "today", label: "Hari ini" },
                    { id: "7d", label: "7 Hari" },
                    { id: "30d", label: "Bulan ini" },
                    { id: "custom", label: "Custom" },
                ] as const).map(p => (
                    <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${chartPreset === p.id ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                        {p.label}
                    </button>
                ))}
                {chartPreset === "custom" && (
                    <div className="flex items-center gap-2 ml-1">
                        <input type="date" value={startInput} onChange={e => setStartInput(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600" />
                        <span className="text-gray-300">–</span>
                        <input type="date" value={endInput} onChange={e => setEndInput(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600" />
                        <button onClick={applyDateFilter}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                            Terapkan
                        </button>
                    </div>
                )}
                {(appliedStart || appliedEnd) && chartPreset !== "custom" && (
                    <button onClick={() => applyPreset("all")}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg transition-colors">
                        <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                )}
            </div>

            {/* Success */}
            {formSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                    <p className="text-green-700 text-sm">{formSuccess}</p>
                    <button onClick={() => setFormSuccess("")}><X className="w-4 h-4 text-green-600" /></button>
                </div>
            )}

            {/* Input Form */}
            {showForm && (
                <Card>
                    <CardHeader className="border-b border-gray-100">
                        <div className="flex items-center justify-between gap-4">
                            <CardTitle className="text-base">Input Data Sensor Manual</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{formError}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Hari Ke-</label>
                                    <Input type="number" name="hari_ke" value={formData.hari_ke} onChange={e => setFormData({ ...formData, hari_ke: e.target.value })} placeholder="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
                                    <Input type="date" name="tanggal" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Jam</label>
                                    <Input type="time" name="jam" value={formData.jam} onChange={e => setFormData({ ...formData, jam: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Suhu (°C)", name: "suhu", step: "0.1", placeholder: "28.5" },
                                    { label: "Kelembaban (%)", name: "kelembaban", step: "0.1", placeholder: "72" },
                                    { label: "Amoniak (ppm)", name: "amoniak", step: "0.001", placeholder: "3.2" },
                                    { label: "Bobot (kg)", name: "bobot", step: "0.01", placeholder: "1.2" },
                                ].map(f => (
                                    <div key={f.name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                                        <Input type="number" step={f.step} name={f.name} value={(formData as any)[f.name]} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} placeholder={f.placeholder} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: "Pakan (kg)", name: "pakan", step: "0.1", placeholder: "150" },
                                    { label: "Minum (L)", name: "minum", step: "0.1", placeholder: "200" },
                                    { label: "Populasi", name: "populasi", step: "1", placeholder: "4850" },
                                ].map(f => (
                                    <div key={f.name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                                        <Input type="number" step={f.step} name={f.name} value={(formData as any)[f.name]} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} placeholder={f.placeholder} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
                                <Button type="submit" disabled={creating}>{creating ? "Menyimpan..." : "Simpan Data"}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* ── CHARTS VIEW ──────────────────────────────────────────────── */}
            {activeTab === "charts" && (
                loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                    </div>
                ) : chartData.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-400">Belum ada data untuk ditampilkan</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-5">
                        {/* Suhu & Kelembaban */}
                        <Card>
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-center justify-between gap-4">
                                    <CardTitle className="text-base">Suhu & Kelembaban</CardTitle>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-1 rounded-full bg-orange-400 inline-block" />
                                            Suhu (°C)
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-1 rounded-full bg-blue-400 inline-block" />
                                            Kelembaban (%)
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gSuhu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gHum" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#d1d5db" />
                                        <YAxis yAxisId="s" domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="#f97316" />
                                        <YAxis yAxisId="h" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#3b82f6" />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Area yAxisId="s" type="monotone" dataKey="suhu" stroke="#f97316" strokeWidth={2} fill="url(#gSuhu)" name="Suhu (°C)" />
                                        <Area yAxisId="h" type="monotone" dataKey="kelembaban" stroke="#3b82f6" strokeWidth={2} fill="url(#gHum)" name="Kelembaban (%)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Amoniak */}
                        <Card>
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-center justify-between gap-4">
                                    <CardTitle className="text-base">Level Amoniak (NH₃)</CardTitle>
                                    <Badge variant="warning">Batas aman &lt; 10 ppm</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gAmmo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#d1d5db" />
                                        <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Area type="monotone" dataKey="amoniak" stroke="#ef4444" strokeWidth={2} fill="url(#gAmmo)" name="Amoniak (ppm)" dot={{ r: 3, fill: "#ef4444" }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Kematian & Populasi */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="text-base">Kematian</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#d1d5db" />
                                            <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" allowDecimals={false} />
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Bar dataKey="death" fill="#ef4444" name="Kematian" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="text-base">Populasi</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#d1d5db" />
                                            <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" domain={["auto", "auto"]} />
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Line type="monotone" dataKey="populasi" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Populasi" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Pakan & Minum */}
                        <Card>
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-center justify-between gap-4">
                                    <CardTitle className="text-base">Konsumsi Pakan & Minum</CardTitle>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-1 rounded-full bg-amber-400 inline-block" />
                                            Pakan (kg)
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-1 rounded-full bg-cyan-400 inline-block" />
                                            Minum (L)
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#d1d5db" />
                                        <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Line type="monotone" dataKey="pakan" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Pakan (kg)" />
                                        <Line type="monotone" dataKey="minum" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Minum (L)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )
            )}

            {/* ── TABLE VIEW ───────────────────────────────────────────────── */}
            {activeTab === "table" && (
                <Card>
                    {/* Header: title + count (left) | filter toggle (right) */}
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">Riwayat Data Sensor</CardTitle>
                            <span className="text-sm text-gray-400">{total.toLocaleString("id-ID")} data</span>
                            {hasActiveFilter && (
                                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-green-600 text-white rounded-full">
                                    {[statusFilter !== "all", hariKeFilter, appliedStart || appliedEnd].filter(Boolean).length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showFilters ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filter
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
                        </button>
                    </div>

                    {/* Collapsible filter panel */}
                    {showFilters && (
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex flex-wrap gap-6 items-end">
                                {/* Status */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as any)}
                                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600"
                                    >
                                        <option value="all">Semua</option>
                                        <option value="normal">Normal</option>
                                        <option value="warning">Waspada</option>
                                        <option value="danger">Bahaya</option>
                                    </select>
                                </div>

                                {/* Hari ke */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Hari Ke-</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={hariKeFilter}
                                        onChange={e => setHariKeFilter(e.target.value)}
                                        placeholder="contoh: 5"
                                        className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600"
                                    />
                                </div>

                                {/* Rentang Waktu */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-gray-400">Dari Tanggal</span>
                                            <input
                                                type="date"
                                                value={startInput}
                                                onChange={e => setStartInput(e.target.value)}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600"
                                            />
                                        </div>
                                        <span className="text-gray-300 mt-4">–</span>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-gray-400">Hingga Tanggal</span>
                                            <input
                                                type="date"
                                                value={endInput}
                                                onChange={e => setEndInput(e.target.value)}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-end gap-2 pb-0.5">
                                    <button
                                        onClick={applyDateFilter}
                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Terapkan
                                    </button>
                                    {hasActiveFilter && (
                                        <button
                                            onClick={resetDateFilter}
                                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Thin progress bar during background refetch (page change) */}
                    <div className={`h-0.5 bg-green-500 transition-all duration-300 ${isFetching ? "opacity-100" : "opacity-0"}`}
                        style={{ width: isFetching ? "100%" : "0%" }} />

                    <CardContent className="p-0">
                        {!loading && processedData.length === 0 ? (
                            <div className="py-10 text-center">
                                <Table2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Tidak ada data yang sesuai</p>
                            </div>
                        ) : loading ? (
                            <div className="py-16 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto relative">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <ThSort col="hari_ke" label="Hari" />
                                            <ThSort col="timestamp" label="Waktu" />
                                            <ThSort col="suhu" label="Suhu" />
                                            <ThSort col="kelembaban" label="Hum" />
                                            <ThSort col="amoniak" label="NH₃" />
                                            <ThSort col="populasi" label="Pop" />
                                            <ThSort col="death" label="Death" />
                                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Status</th>
                                            {canInput && <th className="py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {processedData.map((row: any) => (
                                            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-600">H-{row.hari_ke}</td>
                                                <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(row.timestamp)}</td>
                                                <td className={`py-3 px-4 font-medium ${row.suhu > 32 ? "text-red-600" : "text-gray-800"}`}>
                                                    {row.suhu?.toFixed(1)}°C
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">{row.kelembaban?.toFixed(1)}%</td>
                                                <td className={`py-3 px-4 font-medium tabular-nums ${row.amoniak > 10 ? "text-red-600" : "text-gray-800"}`}>
                                                    {typeof row.amoniak === "number" ? row.amoniak.toFixed(3) : "-"}
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">{row.populasi?.toLocaleString() || "-"}</td>
                                                <td className={`py-3 px-4 font-medium ${row.death > 0 ? "text-red-600" : "text-gray-700"}`}>
                                                    {row.death ?? 0}
                                                </td>
                                                <td className="py-3 px-4">{getStatusBadge(row.suhu, row.amoniak)}</td>
                                                {canInput && (
                                                    <td className="py-3 px-4">
                                                        <button
                                                            onClick={() => openEditModal(row)}
                                                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {!loading && totalPages >= 1 && (
                            <div className="flex items-center justify-between px-4 py-6 border-t border-gray-100">
                                {/* Left: info + per-page */}
                                <div className="flex items-center gap-3">
                                    <p className="text-xs text-gray-400">
                                        Halaman <span className="font-semibold text-gray-700">{currentPage}</span> dari{" "}
                                        <span className="font-semibold text-gray-700">{totalPages}</span>
                                        {" "}· {total.toLocaleString("id-ID")} total
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <span>Tampilkan</span>
                                        <select
                                            value={pageSize}
                                            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                        >
                                            {PAGE_SIZE_OPTIONS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <span>baris</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {/* Page numbers */}
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        const page = start + i;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${page === currentPage
                                                    ? "bg-green-600 text-white"
                                                    : "text-gray-600 hover:bg-gray-100"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Edit Modal */}
            {editingRow && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-gray-900">Edit Data Manual</h3>
                            <button onClick={() => setEditingRow(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">Hari {editingRow.hari_ke} · {formatTimestamp(editingRow.timestamp)}</p>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{editError}</p></div>}
                            {editSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-green-700 text-sm">{editSuccess}</p></div>}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Pakan (kg)", name: "pakan", step: "0.1" },
                                    { label: "Minum (L)", name: "minum", step: "0.1" },
                                    { label: "Bobot (kg)", name: "bobot", step: "0.01" },
                                    { label: "Populasi", name: "populasi", step: "1" },
                                ].map(f => (
                                    <div key={f.name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                                        <Input type="number" step={f.step} name={f.name} value={(editData as any)[f.name]} onChange={e => setEditData({ ...editData, [f.name]: e.target.value })} />
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kematian</label>
                                    <Input type="number" name="death" value={editData.death} onChange={e => setEditData({ ...editData, death: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setEditingRow(null)}>Batal</Button>
                                <Button type="submit" disabled={updating}>{updating ? "Menyimpan..." : "Simpan"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
