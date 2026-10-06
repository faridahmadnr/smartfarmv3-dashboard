"use client";

import { useState } from "react";
import { Birdhouse, Loader2, X } from "lucide-react";
import { useKandangStore, Kandang, KandangType } from "@/store/useKandangStore";
import { ToastType } from "@/components/ui/toast";

type Notify = (message: string, type?: ToastType) => void;

interface FormProps {
    editingKandang: Kandang | null;
    onClose: () => void;
    onNotify: Notify;
}

function KandangForm({ editingKandang, onClose, onNotify }: FormProps) {
    const { createKandang, updateKandang, isSubmitting } = useKandangStore();
    const isEdit = !!editingKandang;

    const [name, setName] = useState(editingKandang?.name ?? "");
    const [type, setType] = useState<KandangType>(editingKandang?.type ?? "Broiler");
    const [capacity, setCapacity] = useState(
        editingKandang ? String(editingKandang.capacity) : ""
    );
    const [isActive, setIsActive] = useState(editingKandang?.isActive ?? true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isSubmitting) return;

        const payload = {
            name: name.trim(),
            type,
            capacity: parseInt(capacity) || 0,
            isActive,
        };

        const success =
            isEdit && editingKandang
                ? await updateKandang(editingKandang.id, payload)
                : await createKandang(payload);

        if (success) {
            onNotify(isEdit ? "Kandang berhasil diperbarui" : "Kandang berhasil ditambahkan", "success");
            onClose();
        } else {
            onNotify(
                useKandangStore.getState().error ?? "Terjadi kesalahan, coba lagi",
                "error"
            );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nama Kandang
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Kandang A"
                    required
                    disabled={isSubmitting}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700 placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                />
            </div>

            {/* Tipe */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Tipe Kandang
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {(["Broiler", "Layer"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setType(t)}
                            className={`py-2.5 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-60 ${
                                type === t
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kapasitas */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Kapasitas (ekor)
                </label>
                <input
                    type="number"
                    min={0}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="0"
                    required
                    disabled={isSubmitting}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700 placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                />
            </div>

            {/* Status */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Status Operasional
                </label>
                <select
                    value={isActive ? "Aktif" : "Nonaktif"}
                    onChange={(e) => setIsActive(e.target.value === "Aktif")}
                    disabled={isSubmitting}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700 disabled:bg-gray-50"
                >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEdit ? "Simpan Perubahan" : "Tambahkan"}
                </button>
            </div>
        </form>
    );
}

interface KandangFormModalProps {
    onNotify?: Notify;
}

export function KandangFormModal({ onNotify = () => {} }: KandangFormModalProps) {
    const { isFormModalOpen, editingKandang, closeFormModal } = useKandangStore();

    if (!isFormModalOpen) return null;

    const isEdit = !!editingKandang;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeFormModal} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="h-1.5 w-full bg-emerald-500" />
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <Birdhouse className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900">
                                {isEdit ? "Edit Kandang" : "Tambah Kandang"}
                            </h2>
                        </div>
                        <button
                            onClick={closeFormModal}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <KandangForm
                        key={editingKandang?.id ?? "new"}
                        editingKandang={editingKandang}
                        onClose={closeFormModal}
                        onNotify={onNotify}
                    />
                </div>
            </div>
        </div>
    );
}