"use client";

import { useState, useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { dailyLogsApi } from "@/lib/api";

interface DailyLogItem {
    id: string;
    date: string;
    pakan?: number | null;
    minum?: number | null;
    populasi?: number | null;
    bobot?: number | null;
    notes?: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    editItem?: DailyLogItem | null;
}

export function DailyLogModal({ open, onClose, onSuccess, editItem }: Props) {
    const { data: session } = useSession();
    const isEdit = !!editItem;

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [date, setDate] = useState(todayStr);
    const [pakan, setPakan] = useState("");
    const [minum, setMinum] = useState("");
    const [populasi, setPopulasi] = useState("");
    const [bobot, setBobot] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (editItem) {
            setDate(editItem.date?.slice(0, 10) ?? todayStr);
            setPakan(editItem.pakan?.toString() ?? "");
            setMinum(editItem.minum?.toString() ?? "");
            setPopulasi(editItem.populasi?.toString() ?? "");
            setBobot(editItem.bobot?.toString() ?? "");
            setNotes(editItem.notes ?? "");
        } else {
            setDate(todayStr);
            setPakan(""); setMinum(""); setPopulasi(""); setBobot(""); setNotes("");
        }
        setError(null);
    }, [editItem, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const payload = {
                date,
                pakan: pakan ? parseFloat(pakan) : undefined,
                minum: minum ? parseFloat(minum) : undefined,
                populasi: populasi ? parseInt(populasi) : undefined,
                bobot: bobot ? parseFloat(bobot) : undefined,
                notes: notes.trim() || undefined,
            };
            if (isEdit && editItem) {
                await dailyLogsApi.update(editItem.id, payload, session.accessToken);
            } else {
                await dailyLogsApi.save(payload, session.accessToken);
            }
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                onSuccess?.();
                onClose();
            }, 1200);
        } catch {
            setError("Gagal menyimpan log harian");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="h-1.5 w-full bg-emerald-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900">
                                {isEdit ? "Edit Log Harian" : "Input Log Harian"}
                            </h2>
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
                            <p className="font-semibold text-gray-800">{isEdit ? "Log harian diperbarui" : "Log harian tersimpan"}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Tanggal */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    max={todayStr}
                                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Pakan (kg)</label>
                                    <input type="number" min={0} step="0.1" value={pakan}
                                        onChange={e => setPakan(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Minum (liter)</label>
                                    <input type="number" min={0} step="0.1" value={minum}
                                        onChange={e => setMinum(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Populasi (ekor)</label>
                                    <input type="number" min={1} value={populasi}
                                        onChange={e => setPopulasi(e.target.value)}
                                        placeholder="—"
                                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                                        Bobot (gram) <span className="text-gray-300 font-normal">opsional</span>
                                    </label>
                                    <input type="number" min={0} step="0.1" value={bobot}
                                        onChange={e => setBobot(e.target.value)}
                                        placeholder="—"
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
                                    {loading ? "Menyimpan..." : isEdit ? "Perbarui" : "Simpan"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
