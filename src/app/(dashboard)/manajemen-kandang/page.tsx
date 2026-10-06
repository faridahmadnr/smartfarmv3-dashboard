"use client";

import { useEffect } from "react";
import { Birdhouse, Plus } from "lucide-react";
import { useKandangStore } from "@/store/useKandangStore";
import { KandangCard } from "@/components/KandangCard";
import { KandangFormModal } from "@/components/modals/KandangFormModal";
import { DeleteKandangModal } from "@/components/modals/DeleteKandangModal";
import { Toast, useToast } from "@/components/ui/toast";

export default function ManajemenKandangPage() {
    const {
        kandangList,
        isLoading,
        error,
        fetchKandangList,
        openFormModal,
        openDeleteModal,
    } = useKandangStore();
    const { toast, show: showToast, hide: hideToast } = useToast();

    useEffect(() => {
        fetchKandangList();
    }, [fetchKandangList]);

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Kandang</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Kelola data kandang, kapasitas, dan status operasional
                    </p>
                </div>
                <button
                    onClick={() => openFormModal(null)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Kandang
                </button>
            </div>

            {/* ── Loading state ───────────────────────────────────────────── */}
            {isLoading && (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
            )}

            {/* ── Error state ─────────────────────────────────────────────── */}
            {!isLoading && error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700">Gagal mengambil data kandang: {error}</p>
                    <button
                        onClick={() => fetchKandangList()}
                        className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* ── Empty state ─────────────────────────────────────────────── */}
            {!isLoading && !error && kandangList.length === 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center shadow-sm">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                        <Birdhouse className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Belum ada kandang</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Mulai dengan menambahkan kandang baru
                    </p>
                    <button
                        onClick={() => openFormModal(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Kandang
                    </button>
                </div>
            )}

            {/* ── Grid ─────────────────────────────────────────────────────── */}
            {!isLoading && !error && kandangList.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {kandangList.map((kandang) => (
                        <KandangCard
                            key={kandang.id}
                            kandang={kandang}
                            onEdit={(k) => openFormModal(k)}
                            onDelete={(k) => openDeleteModal(k)}
                        />
                    ))}
                </div>
            )}

            {/* ── Modals ──────────────────────────────────────────────────── */}
            <KandangFormModal onNotify={showToast} />
            <DeleteKandangModal onNotify={showToast} />

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    );
}