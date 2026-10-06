"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useKandangStore } from "@/store/useKandangStore";
import { ToastType } from "@/components/ui/toast";

type Notify = (message: string, type?: ToastType) => void;

interface DeleteKandangModalProps {
    onNotify?: Notify;
}

export function DeleteKandangModal({ onNotify = () => {} }: DeleteKandangModalProps) {
    const {
        isDeleteModalOpen,
        deletingKandang,
        isSubmitting,
        closeDeleteModal,
        deleteKandang,
    } = useKandangStore();

    if (!isDeleteModalOpen || !deletingKandang) return null;

    const handleConfirm = async () => {
        if (isSubmitting) return;
        const success = await deleteKandang(deletingKandang.id);
        if (success) {
            onNotify(`Kandang "${deletingKandang.name}" berhasil dihapus`, "success");
            closeDeleteModal();
        } else {
            onNotify(
                useKandangStore.getState().error ?? "Gagal menghapus kandang",
                "error"
            );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteModal} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="h-1.5 w-full bg-red-500" />
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-red-50 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900">Hapus Kandang</h2>
                        </div>
                        <button
                            onClick={closeDeleteModal}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Warning box */}
                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-5">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Anda akan menghapus{" "}
                                <span className="font-semibold text-gray-900">
                                    &quot;{deletingKandang.name}&quot;
                                </span>{" "}
                                ({deletingKandang.id}).
                            </p>
                            <p className="text-xs text-red-600 mt-1.5 font-medium">
                                Tindakan ini tidak dapat dibatalkan. Seluruh data sensor yang
                                terhubung dapat ikut terhapus.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={closeDeleteModal}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}