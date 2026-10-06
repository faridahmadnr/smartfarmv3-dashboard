"use client";

import { Pencil, Trash2, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kandang } from "@/store/useKandangStore";

interface KandangCardProps {
    kandang: Kandang;
    onEdit: (kandang: Kandang) => void;
    onDelete: (kandang: Kandang) => void;
}

export function KandangCard({ kandang, onEdit, onDelete }: KandangCardProps) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Badges */}
            <div className="flex items-center justify-between mb-4">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {kandang.type}
                </span>
                <Badge variant={kandang.isActive ? "success" : "danger"}>
                    {kandang.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
            </div>

            {/* Name & ID */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{kandang.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ID: {kandang.id}</p>
            </div>

            {/* Kapasitas */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <LayoutGrid className="w-4 h-4 text-slate-400" />
                <span>Kapasitas: {kandang.capacity.toLocaleString("id-ID")} Ekor</span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-5">
                <button
                    onClick={() => onEdit(kandang)}
                    className="border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
                >
                    <Pencil className="w-4 h-4" />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(kandang)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                </button>
            </div>
        </div>
    );
}