"use client";

import { useState } from "react";
import { HeartCrack, X, Minus, Plus } from "lucide-react";
import { useCreateDeathReport } from "@/hooks/useApi";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function DeathReportModal({ open, onClose, onSuccess }: Props) {
    const [count, setCount] = useState(1);
    const [notes, setNotes] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const { mutate, loading, error } = useCreateDeathReport();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await mutate({ count, notes: notes.trim() || undefined });
        if (result.success) {
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setCount(1);
                setNotes("");
                onSuccess?.();
                onClose();
            }, 1200);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="h-1.5 w-full bg-red-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-red-50 rounded-xl"><HeartCrack className="w-5 h-5 text-red-500" /></div>
                            <h2 className="text-base font-bold text-gray-900">Laporkan Kematian</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {submitted ? (
                        <div className="py-8 text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">✓</span>
                            </div>
                            <p className="font-semibold text-gray-800">{count} kematian dicatat</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Jumlah Kematian
                                </label>
                                <div className="flex items-center gap-3 justify-center">
                                    <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))}
                                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                        <Minus className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <input
                                        type="number" min={1} value={count}
                                        onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 text-center text-2xl font-bold text-gray-900 border-0 outline-none bg-transparent"
                                    />
                                    <button type="button" onClick={() => setCount(c => c + 1)}
                                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                        <Plus className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-1">ekor</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Catatan <span className="text-gray-300 font-normal normal-case">(opsional)</span>
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ditemukan pagi hari, kondisi kandang..."
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none text-gray-700 placeholder:text-gray-300"
                                />
                            </div>

                            {error && <p className="text-xs text-red-500">{error}</p>}

                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                                    {loading ? "Menyimpan..." : "Laporkan"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
