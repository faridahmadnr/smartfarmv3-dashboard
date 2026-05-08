"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { useNotificationWebSocket } from "@/hooks/useApi";

interface ToastNotification {
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "danger";
    timestamp: Date;
}

interface NotificationContextType {
    connected: boolean;
    toasts: ToastNotification[];
    dismissToast: (id: string) => void;
    newNotificationCount: number;
    resetNewCount: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    connected: false,
    toasts: [],
    dismissToast: () => { },
    newNotificationCount: 0,
    resetNewCount: () => { },
});

export const useRealtimeNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [newNotificationCount, setNewNotificationCount] = useState(0);

    const handleNotification = useCallback((notification: any) => {
        const id = notification.id || `toast-${Date.now()}`;

        setToasts((prev) => {
            if (prev.some((t) => t.id === id)) return prev;
            const toast: ToastNotification = {
                id,
                title: notification.title || "Notifikasi Baru",
                message: notification.message || "",
                type: notification.notification_type === "death_forecast" ? "danger"
                    : notification.notification_type === "abnormal_classification" ? "warning"
                        : "info",
                timestamp: new Date(),
            };
            setTimeout(() => {
                setToasts((p) => p.filter((t) => t.id !== id));
            }, 8000);
            return [toast, ...prev].slice(0, 5);
        });
        setNewNotificationCount((prev) => prev + 1);
    }, []);

    const { connected } = useNotificationWebSocket(handleNotification);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const resetNewCount = useCallback(() => {
        setNewNotificationCount(0);
    }, []);

    return (
        <NotificationContext.Provider
            value={{ connected, toasts, dismissToast, newNotificationCount, resetNewCount }}
        >
            {children}

            {/* Toast Container */}
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto rounded-xl shadow-2xl border p-4 animate-slide-in-right ${toast.type === "danger"
                                    ? "bg-red-50 border-red-200"
                                    : toast.type === "warning"
                                        ? "bg-yellow-50 border-yellow-200"
                                        : "bg-blue-50 border-blue-200"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div
                                    className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${toast.type === "danger"
                                            ? "bg-red-100"
                                            : toast.type === "warning"
                                                ? "bg-yellow-100"
                                                : "bg-blue-100"
                                        }`}
                                >
                                    {toast.type === "danger" ? (
                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    ) : toast.type === "warning" ? (
                                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${toast.type === "danger" ? "text-red-800"
                                            : toast.type === "warning" ? "text-yellow-800"
                                                : "text-blue-800"
                                        }`}>
                                        {toast.title}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${toast.type === "danger" ? "text-red-600"
                                            : toast.type === "warning" ? "text-yellow-600"
                                                : "text-blue-600"
                                        }`}>
                                        {toast.message}
                                    </p>
                                </div>

                                {/* Dismiss */}
                                <button
                                    onClick={() => dismissToast(toast.id)}
                                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </NotificationContext.Provider>
    );
}
