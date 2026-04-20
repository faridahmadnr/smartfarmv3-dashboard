"use client";

import { useCallback, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    Thermometer, Droplets, Wind, Users, HeartCrack,
    BarChart2, Bell, Clock, CalendarDays,
    CheckCircle2, ShieldCheck, TrendingUp, AlertTriangle,
    XCircle, BookOpen,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyKandang, useNotifications, useSensorData, useTodayDailyLog, useTodayDeathTotal } from "@/hooks/useApi";
import { useLiveSensorData } from "@/hooks/useLiveSensorData";
import { DeathReportModal } from "@/components/modals/DeathReportModal";
import { DailyLogModal } from "@/components/modals/DailyLogModal";
import { predictionsApi } from "@/lib/api";

interface StatCardProps {
    label: string; value: string; unit?: string;
    icon: React.ReactNode; iconBg: string; iconColor: string;
    topBar: string; loading?: boolean; alert?: boolean;
}

function StatCard({ label, value, unit, icon, iconBg, iconColor, topBar, loading, alert }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`h-1 w-full ${topBar}`} />
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                    <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                </div>
                {loading ? (
                    <div className="h-8 w-20 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl font-bold tracking-tight ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</span>
                        {unit && <span className="text-sm text-gray-400 font-medium">{unit}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

function getRiskLevel(predictedDeath: number) {
    if (predictedDeath === 0) return { label: "Aman", variant: "success" as const, color: "text-green-600", bg: "bg-green-50 border-green-100" };
    if (predictedDeath === 1) return { label: "Waspada", variant: "warning" as const, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-100" };
    return { label: "Bahaya", variant: "danger" as const, color: "text-red-600", bg: "bg-red-50 border-red-100" };
}

export default function DashboardPage() {
    const { status } = useSession();
    const { data: session } = useSession();
    const { data: kandang, loading: loadingKandang } = useMyKandang();
    const { data: notifData, loading: loadingNotif } = useNotifications();
    const { data: sensorData, loading: loadingSensor, refetch: refetchSensor } = useSensorData();

    const { data: todayLog } = useTodayDailyLog();
    const { total: todayDeathTotal, refetch: refetchDeathTotal } = useTodayDeathTotal();
    const [showDeathModal, setShowDeathModal] = useState(false);
    const [showDailyModal, setShowDailyModal] = useState(false);

    // Latest ML predictions
    const [latestClassify, setLatestClassify] = useState<any>(null);
    const [latestForecast, setLatestForecast] = useState<any>(null);
    const [loadingPred, setLoadingPred] = useState(true);

    const latestSensor = kandang?.latest_sensor;

    const onNewData = useCallback(() => { refetchSensor(); }, [refetchSensor]);
    useLiveSensorData(onNewData);

    useEffect(() => {
        if (status !== "authenticated" || !session?.accessToken) return;
        predictionsApi.getHistory({ limit: 20 }, session.accessToken)
            .then((res: any) => {
                const items: any[] = Array.isArray(res?.data) ? res.data
                    : (Array.isArray(res?.data?.data) ? res.data.data : []);
                setLatestClassify(items.find(r => r.type === "classification") ?? null);
                setLatestForecast(items.find(r => r.type === "forecasting") ?? null);
            })
            .catch(() => {})
            .finally(() => setLoadingPred(false));
    }, [status, session?.accessToken]);

    if (status === "loading") {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
    }

    const notifications = notifData?.items || [];
    const unreadAlerts = notifications.filter((n: any) => !n.is_read).slice(0, 3);
    const sensorItems = sensorData?.items || [];
    const recentSensors = sensorItems.slice(0, 10);

    const getStatus = () => {
        if (!latestSensor) return { label: "Tidak Ada Data", variant: "default" as const, dot: "bg-gray-400" };
        if (latestSensor.amoniak > 10 || latestSensor.suhu > 34) return { label: "Bahaya", variant: "danger" as const, dot: "bg-red-500" };
        if (latestSensor.amoniak > 5 || latestSensor.suhu > 32) return { label: "Waspada", variant: "warning" as const, dot: "bg-yellow-400" };
        return { label: "Normal", variant: "success" as const, dot: "bg-green-500" };
    };
    const kandangStatus = getStatus();

    const lastUpdate = latestSensor?.timestamp
        ? (() => {
            const m = Math.floor((Date.now() - new Date(latestSensor.timestamp).getTime()) / 60000);
            return m < 60 ? `${m} menit lalu` : `${Math.floor(m / 60)} jam lalu`;
        })() : null;

    const hariKe = (recentSensors[0] as any)?.hari_ke ?? null;

    const formatTimeAgo = (dateString: string) => {
        const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
        const h = Math.floor(m / 60);
        if (m < 60) return `${m} menit lalu`;
        if (h < 24) return `${h} jam lalu`;
        return `${Math.floor(h / 24)} hari lalu`;
    };

    const riskLevel = latestForecast ? getRiskLevel(latestForecast.predicted_death ?? 0) : null;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Monitoring</h1>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <p className="text-sm text-gray-400">
                            {kandang ? `${kandang.nama} — ${kandang.lokasi || "Kandang Utama"}` : "Memuat data kandang..."}
                        </p>
                        {hariKe && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                <CalendarDays className="w-3 h-3" />Hari ke-{hariKe}
                            </span>
                        )}
                        {lastUpdate && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />{lastUpdate}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button
                        onClick={() => setShowDeathModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        <HeartCrack className="w-3.5 h-3.5" />Laporkan Kematian
                    </button>
                    <button
                        onClick={() => setShowDailyModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        <BookOpen className="w-3.5 h-3.5" />Input Harian
                    </button>
                    {kandang && (
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${kandangStatus.dot}`} />
                            <Badge variant={kandangStatus.variant} className="text-xs px-2.5 py-1">
                                Kondisi {kandangStatus.label}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Sensor Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Suhu" value={latestSensor?.suhu?.toFixed(1) ?? "-"} unit="°C"
                    icon={<Thermometer className="w-4 h-4" />} iconBg="bg-amber-50" iconColor="text-amber-500" topBar="bg-amber-400"
                    loading={loadingKandang} alert={latestSensor ? latestSensor.suhu > 32 : false} />
                <StatCard label="Kelembaban" value={latestSensor?.kelembaban?.toFixed(1) ?? "-"} unit="%"
                    icon={<Droplets className="w-4 h-4" />} iconBg="bg-sky-50" iconColor="text-sky-500" topBar="bg-sky-400"
                    loading={loadingKandang} />
                <StatCard label="Amoniak" value={latestSensor?.amoniak != null ? Number(latestSensor.amoniak).toFixed(3) : "-"} unit="ppm"
                    icon={<Wind className="w-4 h-4" />} iconBg="bg-orange-50" iconColor="text-orange-500" topBar="bg-orange-400"
                    loading={loadingKandang} alert={latestSensor ? latestSensor.amoniak > 10 : false} />
                <StatCard label="Populasi" value={latestSensor?.populasi?.toLocaleString() ?? "-"} unit="ekor"
                    icon={<Users className="w-4 h-4" />} iconBg="bg-emerald-50" iconColor="text-emerald-500" topBar="bg-emerald-400"
                    loading={loadingKandang} />
                <StatCard label="Kematian Hari Ini" value={String(todayDeathTotal)} unit="ekor"
                    icon={<HeartCrack className="w-4 h-4" />} iconBg="bg-red-50" iconColor="text-red-500" topBar="bg-red-400"
                    loading={loadingKandang} alert={todayDeathTotal > 0} />
            </div>

            {/* ML Prediction Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Classification */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-indigo-400" />
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-indigo-50 rounded-lg"><ShieldCheck className="w-4 h-4 text-indigo-500" /></div>
                            <span className="text-sm font-semibold text-gray-700">Status Kondisi Kandang</span>
                        </div>
                        {loadingPred ? (
                            <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
                        ) : latestClassify ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {latestClassify.prediction === "Normal"
                                        ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                                        : <AlertTriangle className="w-7 h-7 text-red-500" />
                                    }
                                    <div>
                                        <p className={`text-xl font-bold ${latestClassify.prediction === "Normal" ? "text-green-600" : "text-red-600"}`}>
                                            {latestClassify.prediction}
                                        </p>
                                        <p className="text-[11px] text-gray-400">{formatTimeAgo(latestClassify.created_at)}</p>
                                    </div>
                                </div>
                                {latestClassify.confidence !== null && (
                                    <span className={`text-sm font-bold px-3 py-1 rounded-xl ${latestClassify.prediction === "Normal" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                        {Math.round(latestClassify.confidence * 100)}%
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 py-2">Menunggu data IoT...</p>
                        )}
                    </div>
                </div>

                {/* Forecasting */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-orange-400" />
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-orange-50 rounded-lg"><TrendingUp className="w-4 h-4 text-orange-500" /></div>
                            <span className="text-sm font-semibold text-gray-700">Prediksi Kematian 30 Menit ke Depan</span>
                        </div>
                        {loadingPred ? (
                            <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
                        ) : latestForecast ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {(latestForecast.predicted_death ?? 0) === 0
                                        ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                                        : (latestForecast.predicted_death ?? 0) === 1
                                        ? <AlertTriangle className="w-7 h-7 text-yellow-500" />
                                        : <XCircle className="w-7 h-7 text-red-500" />
                                    }
                                    <div>
                                        <p className={`text-xl font-bold ${riskLevel?.color}`}>
                                            {(latestForecast.predicted_death ?? 0) === 0 ? "Aman" : `${latestForecast.predicted_death} ekor`}
                                        </p>
                                        <p className="text-[11px] text-gray-400">{formatTimeAgo(latestForecast.created_at)}</p>
                                    </div>
                                </div>
                                {riskLevel && (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${riskLevel.bg} ${riskLevel.color}`}>
                                        {riskLevel.label}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 py-2">Perlu 4 data interval 30 menit</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sensor Table */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden h-full">
                        <CardHeader className="border-b border-gray-100">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-base">Data Sensor Terbaru</CardTitle>
                                <Link href="/sensor-data" className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors flex-shrink-0">
                                    Lihat Semua →
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingSensor ? (
                                <div className="p-6 space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-lg" />)}
                                </div>
                            ) : recentSensors.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                        <BarChart2 className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-400">Belum ada data sensor</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50/80">
                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Waktu</th>
                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Suhu</th>
                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Kelembaban</th>
                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amoniak (ppm)</th>
                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Populasi</th>
                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Kematian</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {recentSensors.map((row: any) => (
                                                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3 px-4 text-xs text-gray-500">
                                                        {new Date(row.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                    </td>
                                                    <td className={`py-3 px-4 text-right font-medium ${row.suhu > 32 ? "text-red-600" : "text-gray-800"}`}>{row.suhu?.toFixed(1)}°C</td>
                                                    <td className="py-3 px-4 text-right text-gray-700">{row.kelembaban?.toFixed(1)}%</td>
                                                    <td className={`py-3 px-4 text-right font-medium tabular-nums ${row.amoniak > 10 ? "text-red-600" : "text-gray-800"}`}>
                                                        {typeof row.amoniak === "number" ? row.amoniak.toFixed(3) : "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-700">{row.populasi?.toLocaleString() || "-"}</td>
                                                    <td className={`py-3 px-4 text-right font-medium ${row.death > 0 ? "text-red-600" : "text-gray-700"}`}>{row.death ?? 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-4">
                    <Card className="flex-1">
                        <CardHeader className="border-b border-gray-100">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-gray-500" />
                                    <CardTitle className="text-base">Notifikasi</CardTitle>
                                </div>
                                <Link href="/notifications" className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors flex-shrink-0">
                                    Lihat Semua →
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {loadingNotif ? (
                                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-lg" />)}</div>
                            ) : unreadAlerts.length === 0 ? (
                                <div className="py-5 text-center">
                                    <CheckCircle2 className="w-7 h-7 text-green-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Semua kondisi normal</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {unreadAlerts.map((alert: any) => {
                                        const isDanger = alert.type === "danger" || alert.type === "death_forecast";
                                        const isWarning = alert.type === "alert" || alert.type === "abnormal_classification";
                                        return (
                                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors">
                                                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isDanger ? "bg-red-500" : isWarning ? "bg-yellow-400" : "bg-blue-400"}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800 truncate">{alert.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(alert.created_at)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b border-gray-100 pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-gray-500" />
                                    <CardTitle className="text-base">Catatan Harian</CardTitle>
                                </div>
                                <button
                                    onClick={() => setShowDailyModal(true)}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                    {todayLog ? "Edit →" : "+ Input"}
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: "Pakan", value: todayLog?.pakan != null ? `${todayLog.pakan} kg` : "—", color: "bg-amber-50 text-amber-700" },
                                    { label: "Minum", value: todayLog?.minum != null ? `${todayLog.minum} L` : "—", color: "bg-sky-50 text-sky-700" },
                                    { label: "Populasi", value: todayLog?.populasi != null ? todayLog.populasi.toLocaleString() : "—", color: "bg-emerald-50 text-emerald-700" },
                                    { label: "Bobot", value: todayLog?.bobot != null ? `${todayLog.bobot} g` : "—", color: "bg-purple-50 text-purple-700" },
                                ].map(item => (
                                    <div key={item.label} className={`rounded-xl px-3 py-2.5 ${item.color}`}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{item.label}</p>
                                        <p className="text-sm font-bold mt-0.5">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowDeathModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-colors border border-red-100"
                            >
                                <HeartCrack className="w-3.5 h-3.5" />
                                Laporkan Kematian
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <DeathReportModal open={showDeathModal} onClose={() => setShowDeathModal(false)} onSuccess={refetchDeathTotal} />
            <DailyLogModal open={showDailyModal} onClose={() => setShowDailyModal(false)} />
        </div>
    );
}
