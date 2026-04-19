"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = "success", duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 200);
        }, duration);
        return () => clearTimeout(t);
    }, [duration, onClose]);

    return (
        <div
            className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
                ${type === "success"
                    ? "bg-white border-green-200 text-green-800"
                    : "bg-white border-red-200 text-red-700"
                }`}
        >
            <div className={`w-1.5 h-5 rounded-full flex-shrink-0 ${type === "success" ? "bg-green-500" : "bg-red-500"}`} />
            <span>{message}</span>
            <button
                onClick={() => { setVisible(false); setTimeout(onClose, 200); }}
                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// Simple hook for managing one toast at a time
export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const show = (message: string, type: ToastType = "success") => {
        setToast({ message, type });
    };

    const hide = () => setToast(null);

    return { toast, show, hide };
}
