"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActivityLogs, ActivityLog } from "@/hooks/useApi";

const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
        login: "Login",
        logout: "Logout",
        create_user: "Tambah Pengguna",
        update_user: "Edit Pengguna",
        delete_user: "Hapus Pengguna",
        change_password: "Ganti Password",
        create_daily_log: "Input Log Harian",
        update_daily_log: "Update Log Harian",
        create_death_report: "Lapor Kematian",
        classify: "Prediksi Klasifikasi",
        forecast: "Prediksi Kematian",
        reload_models: "Reload Model ML",
    };
    return labels[action] || action;
};

const getActionColor = (action: string): "default" | "success" | "warning" | "danger" | "info" => {
    if (action === "login" || action.startsWith("create")) return "success";
    if (action.startsWith("update") || action === "change_password") return "info";
    if (action.startsWith("delete")) return "danger";
    if (action === "classify" || action === "forecast") return "warning";
    return "default";
};

const getActivityDescription = (log: ActivityLog) => {
    const name = log.user_full_name || log.user_username || "Pengguna";
    switch (log.action) {
        case "login":               return `${name} masuk ke sistem`;
        case "logout":              return `${name} keluar dari sistem`;
        case "create_user":         return `${name} menambahkan pengguna baru`;
        case "update_user":         return `${name} memperbarui data pengguna`;
        case "delete_user":         return `${name} menghapus pengguna`;
        case "change_password":     return `${name} mengganti password`;
        case "create_daily_log":    return `${name} menginput log harian`;
        case "update_daily_log":    return `${name} memperbarui log harian`;
        case "create_death_report": return `${name} melaporkan kematian ayam`;
        case "classify":            return `Sistem menjalankan prediksi kondisi kandang`;
        case "forecast":            return `Sistem menjalankan prediksi kematian`;
        case "reload_models":       return `${name} me-reload model ML`;
        default: return log.action;
    }
};


const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function ActivityLogsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { data: logsData, loading, error, refetch } = useActivityLogs({ per_page: 50 });

    if (status === "loading" || loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (session?.user?.role !== "admin") {
        router.push("/");
        return null;
    }

    const activityLogs = logsData?.items || [];
    const totalLogs = logsData?.total || 0;

    const today = new Date().toDateString();
    const todayLogs = activityLogs.filter(
        (l) => new Date(l.created_at).toDateString() === today
    ).length;
    const webLogs = activityLogs.filter((l) => l.platform === "web").length;
    const mobileLogs = activityLogs.filter((l) => l.platform === "mobile").length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
                    <p className="text-gray-500 mt-1">
                        Monitor semua aktivitas pengguna dalam sistem
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">❌ {error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500">Total Aktivitas</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{totalLogs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500">Hari Ini</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{todayLogs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500">Via Web</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">{webLogs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500">Via Mobile</div>
                        <div className="text-2xl font-bold text-purple-600 mt-1">{mobileLogs}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {activityLogs.length === 0 ? (
                        <div className="py-12 text-center">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-500">Belum ada data activity log</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">User</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Action</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Keterangan</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Platform</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">IP Address</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.map((log: ActivityLog) => (
                                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                        <span className="text-xs font-medium text-green-700">
                                                            {(log.user_full_name || log.user_username || "?").charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {log.user_full_name || log.user_username || "Unknown"}
                                                        </p>
                                                        {log.user_username && (
                                                            <p className="text-xs text-gray-500">@{log.user_username}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge variant={getActionColor(log.action)}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm text-gray-600">{getActivityDescription(log)}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {log.platform === "web" ? (
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    ) : log.platform === "mobile" ? (
                                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                    <span className="text-sm text-gray-600 capitalize">{log.platform || "-"}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {log.ip_address || "-"}
                                                </code>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm text-gray-500">{formatDate(log.created_at)}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
