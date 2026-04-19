"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export function SessionExpiredOverlay() {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    signOut({ callbackUrl: "/login?reason=session_expired" });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-8 max-w-sm w-full mx-4 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Sesi Berakhir</h3>
                <p className="text-sm text-gray-500 mb-5">
                    Sesi Anda telah berakhir. Anda akan diarahkan ke halaman login.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                    Mengalihkan dalam {countdown} detik...
                </div>
            </div>
        </div>
    );
}
