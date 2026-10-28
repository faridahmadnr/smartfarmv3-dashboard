"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { useKandangStore } from "@/store/useKandangStore";

export function KandangSwitcher() {
  const { selectedKandang, kandangList, setSelectedKandang, fetchKandangList, isLoading, error } = useKandangStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refetch saat tab kembali aktif (mis. kandang baru dibuat admin di sesi lain).
  useEffect(() => {
    const onFocus = () => fetchKandangList();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchKandangList]);

  // Selama belum ada kandang, poll berkala agar switcher terisi otomatis.
  useEffect(() => {
    if (selectedKandang) return;
    const id = setInterval(() => fetchKandangList(), 15000);
    return () => clearInterval(id);
  }, [selectedKandang, fetchKandangList]);

  if (!selectedKandang) {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-slate-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span>Memuat kandang...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm font-medium">
        <Building2 className="w-4 h-4 text-gray-300" />
        <span className="text-slate-400">{error ? "Gagal memuat kandang" : "Belum ada kandang"}</span>
        <button
          type="button"
          onClick={() => fetchKandangList()}
          title="Muat ulang daftar kandang"
          className="ml-1 p-1 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-sm text-slate-700 font-medium"
      >
        <Building2 className="w-4 h-4 text-emerald-600" />
        <span>
          {selectedKandang.name} [{selectedKandang.code}]
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
          {kandangList.map((kandang) => (
            <button
              key={kandang.id}
              onClick={() => {
                setSelectedKandang(kandang);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                selectedKandang.id === kandang.id
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-slate-700 hover:bg-gray-50"
              }`}
            >
              <Building2 className={`w-4 h-4 ${selectedKandang.id === kandang.id ? "text-emerald-600" : "text-gray-400"}`} />
              <div className="flex-1">
                <div>{kandang.name}</div>
                <div className="text-xs text-gray-500">{kandang.code}</div>
              </div>
              {selectedKandang.id === kandang.id && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
