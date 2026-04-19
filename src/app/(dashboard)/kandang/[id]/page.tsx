"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmModal } from "@/components/ui/modal";
import Link from "next/link";
import { useKandang, useDeleteKandang, useSensorDataStats } from "@/hooks/useApi";

export default function KandangDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { data: kandang, loading, error } = useKandang(id as string);
    const { mutate: deleteKandang, loading: deleting } = useDeleteKandang();

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Sensor data stats (24 hours)
    const { data: sensorStats, loading: loadingStats } = useSensorDataStats(24);

    const canEdit = session?.user?.role === "admin" || session?.user?.role === "pemilik";

    if (status === "loading" || loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (error || !kandang) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">❌ {error || "Kandang tidak ditemukan"}</p>
                </div>
                <Link href="/kandang">
                    <Button variant="secondary">← Kembali ke Daftar Kandang</Button>
                </Link>
            </div>
        );
    }

    const sensor = kandang.latest_sensor;

    const handleDelete = async () => {
        const result = await deleteKandang(id as string);
        if (result.success) {
            router.push("/kandang");
        }
        setShowDeleteModal(false);
    };

    const getStatus = () => {
        if (!kandang.is_active) return "Inactive";
        if (!sensor) return "Normal";
        if (sensor.amoniak > 10 || sensor.suhu > 32) return "Danger";
        if (sensor.amoniak > 5 || sensor.suhu > 30) return "Warning";
        return "Normal";
    };

    const status_kandang = getStatus();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Delete Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus Kandang"
                message="Apakah Anda yakin ingin menghapus kandang ini? Semua data sensor terkait juga akan dihapus."
                itemName={kandang.nama}
                isLoading={deleting}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/kandang" className="hover:text-green-600">Kandang</Link>
                <span>/</span>
                <span className="text-gray-900">{kandang.nama}</span>
            </div>

            {/* Header Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">{kandang.nama}</h1>
                                <Badge
                                    variant={
                                        status_kandang === "Normal"
                                            ? "success"
                                            : status_kandang === "Warning"
                                                ? "warning"
                                                : status_kandang === "Danger"
                                                    ? "danger"
                                                    : "default"
                                    }
                                >
                                    {status_kandang}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    {kandang.kode || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {kandang.lokasi || "Tidak ada lokasi"}
                                </span>
                            </div>
                        </div>
                        {canEdit && (
                            <div className="flex gap-2">
                                <Link href={`/kandang/${id}/edit`}>
                                    <Button variant="secondary">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </Button>
                                </Link>
                                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            {kandang.is_active && sensor && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-red-50 text-red-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Suhu</p>
                                    <p className={`text-2xl font-bold ${sensor.suhu > 30 ? "text-red-600" : "text-gray-900"}`}>
                                        {sensor.suhu}°C
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Kelembaban</p>
                                    <p className="text-2xl font-bold text-gray-900">{sensor.kelembaban}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Amoniak</p>
                                    <p className={`text-2xl font-bold ${sensor.amoniak > 10 ? "text-red-600" : "text-gray-900"}`}>
                                        {sensor.amoniak} ppm
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-green-50 text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Populasi</p>
                                    <p className="text-2xl font-bold text-gray-900">{sensor.populasi?.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Kandang</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Kapasitas</label>
                                    <p className="text-gray-900">{kandang.kapasitas?.toLocaleString() || "-"} ekor</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                                    <Badge variant={kandang.is_active ? "success" : "danger"}>
                                        {kandang.is_active ? "Aktif" : "Non-aktif"}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Dibuat</label>
                                    <p className="text-gray-900">{formatDate(kandang.created_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Terakhir Diupdate</label>
                                    <p className="text-gray-900">{formatDate(kandang.updated_at)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Sensor Info */}
                    {kandang.is_active && sensor && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Sensor Terkini</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500">Pakan</p>
                                        <p className="text-lg font-medium text-gray-900">{sensor.pakan || 0} kg</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500">Minum</p>
                                        <p className="text-lg font-medium text-gray-900">{sensor.minum || 0} L</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500">Bobot Rata-rata</p>
                                        <p className="text-lg font-medium text-gray-900">{sensor.bobot || 0} kg</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* No Sensor Data */}
                    {kandang.is_active && !sensor && (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <p className="text-gray-500">Belum ada data sensor untuk kandang ini</p>
                                <Link href="/sensor-data" className="mt-4 inline-block">
                                    <Button variant="secondary">Input Data Sensor</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sensor Statistics - 24 Hours */}
                    {kandang.is_active && sensorStats && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <CardTitle>Statistik Sensor 24 Jam</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingStats ? (
                                    <div className="flex justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                            <p className="text-xs text-orange-600 font-medium">Rata-rata Suhu</p>
                                            <p className="text-lg font-bold text-orange-700">{sensorStats.avg_suhu?.toFixed(1) ?? "-"}°C</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-600 font-medium">Rata-rata Kelembaban</p>
                                            <p className="text-lg font-bold text-blue-700">{sensorStats.avg_kelembaban?.toFixed(1) ?? "-"}%</p>
                                        </div>
                                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                            <p className="text-xs text-yellow-600 font-medium">Rata-rata Amoniak</p>
                                            <p className="text-lg font-bold text-yellow-700">{sensorStats.avg_amoniak?.toFixed(1) ?? "-"} ppm</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-xs text-green-600 font-medium">Total Pakan</p>
                                            <p className="text-lg font-bold text-green-700">{sensorStats.total_pakan?.toFixed(1) ?? "-"} kg</p>
                                        </div>
                                        <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                                            <p className="text-xs text-cyan-600 font-medium">Total Minum</p>
                                            <p className="text-lg font-bold text-cyan-700">{sensorStats.total_minum?.toFixed(1) ?? "-"} L</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                            <p className="text-xs text-red-600 font-medium">Total Kematian</p>
                                            <p className="text-lg font-bold text-red-700">{sensorStats.total_death ?? 0} ekor</p>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <p className="text-xs text-purple-600 font-medium">Rata-rata Bobot</p>
                                            <p className="text-lg font-bold text-purple-700">{sensorStats.avg_bobot?.toFixed(2) ?? "-"} kg</p>
                                        </div>
                                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <p className="text-xs text-indigo-600 font-medium">Total Populasi</p>
                                            <p className="text-lg font-bold text-indigo-700">{sensorStats.total_populasi?.toLocaleString() ?? "-"} ekor</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-xs text-gray-500 font-medium">Jumlah Data</p>
                                            <p className="text-lg font-bold text-gray-700">{sensorStats.data_count ?? 0} record</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Quick Actions Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/sensor-data" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Input Data Sensor
                                </Button>
                            </Link>
                            <Link href="/predictions" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Lihat Prediksi ML
                                </Button>
                            </Link>
                            <Link href="/notifications" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    Notifikasi
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
