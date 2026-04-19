"use client";

import { useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useCreateDailyLog, useTodayDailyLog } from "@/hooks/useApi";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function DailyLogModal({ open, onClose, onSuccess }: Props) {
    const { data: todayLog } = useTodayDailyLog();
    const { mutate, loading, error } = useCreateDailyLog();

    const [pakan, setPakan] = useState("");
    const [minum, setMinum] = useState("");
    const [populasi, setPopulasi] = useState("");
    const [bobot, setBobot] = useState("");
    const [notes, setNotes] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await mutate({
            pakan: pakan ? parseFloat(pakan) : undefined,
            minum: minum ? parseFloat(minum) : undefined,
            populasi: populasi ? parseInt(populasi) : undefined,
            bobot: bobot ? parseFloat(bobot) : undefined,
            notes: notes.trim() || undefined,
        });
        if (result.success) {
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setPakan(""); setMinum(""); setPopulasi(""); setBobot(""); setNotes("");
                onSuccess?.();
                onClose();
            }, 1200);
        }
    };

    if (!open) return null;

    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="h-1.5 w-full bg-emerald-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 rounded-xl"><BookOpen className="w-5 h-5 text-emerald-500" /></div>
                            <h2 className="text-base font-bold text-gray-900">Input Log Harian</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-5 ml-11">{today}</p>

                    {todayLog && (
                        <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-700">
                            Data hari ini sudah ada. Input baru akan memperbarui data yang ada.
                        </div>
                    )}

                    {submitted ? (
                        <div className="py-8 text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">✓</span>
                            </div>
                            <p className="font-semibold text-gray-800">Log harian tersimpan</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Pakan (kg)</label>
                                    <input type="number" min={0} step="0.1" value={pakan}
                                        onChange={e => setPakan(e.target.value)}
                                        placeholder={todayLog?.pakan?.toString() ?? "0.0"}
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Minum (liter)</label>
                                    <input type="number" min={0} step="0.1" value={minum}
                                        onChange={e => setMinum(e.target.value)}
                                        placeholder={todayLog?.minum?.toString() ?? "0.0"}
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Populasi (ekor)</label>
                                    <input type="number" min={1} value={populasi}
                                        onChange={e => setPopulasi(e.target.value)}
                                        placeholder={todayLog?.populasi?.toString() ?? ""}
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                                        Bobot (gram) <span className="text-gray-300 font-normal">opsional</span>
                                    </label>
                                    <input type="number" min={0} step="0.1" value={bobot}
                                        onChange={e => setBobot(e.target.value)}
                                        placeholder={todayLog?.bobot?.toString() ?? "—"}
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Catatan <span className="text-gray-300 font-normal">(opsional)</span>
                                </label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Catatan kondisi kandang hari ini..."
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none text-gray-700 placeholder:text-gray-300"
                                />
                            </div>

                            {error && <p className="text-xs text-red-500">{error}</p>}

                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                                    {loading ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
