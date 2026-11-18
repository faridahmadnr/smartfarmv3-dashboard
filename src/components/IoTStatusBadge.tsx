"use client";

import { useIoTStatus } from "@/hooks/useApi";

interface IoTStatusBadgeProps {
    kandangId?: string;
}

export function IoTStatusBadge({ kandangId }: IoTStatusBadgeProps) {
    const { data, loading, error } = useIoTStatus(kandangId);
    const online = !loading && !error && data?.status === "online";
    const offline = !loading && !error && data?.status === "offline";
    const label = !kandangId
        ? "Pilih kandang"
        : loading
            ? "Memeriksa IoT..."
        : error || !data
            ? "Status IoT tidak tersedia"
            : data.status === "online"
                ? "Online (IoT)"
                : data.status === "offline"
                    ? "Offline (IoT)"
                    : "Belum ada data IoT";
    const dotClass = online
        ? "bg-emerald-500 animate-pulse"
        : offline
            ? "bg-red-500"
            : data?.status === "no_data" && !loading && !error
                ? "bg-amber-500"
                : "bg-gray-300";
    const title = error || (data?.last_seen
        ? `Data IoT terakhir: ${new Date(data.last_seen).toLocaleString("id-ID")}`
        : label);

    return (
        <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-100"
            title={title}
            aria-label={label}
        >
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="text-xs text-gray-500">{label}</span>
        </div>
    );
}
