"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/hooks/useRole";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { status, isAdmin } = useRole();

    useEffect(() => {
        if (status === "authenticated" && !isAdmin) {
            router.replace("/?denied=admin");
        }
    }, [status, isAdmin, router]);

    if (status === "loading") {
        return (
            <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex justify-center py-16">
                <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <ShieldAlert className="w-7 h-7 text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Akses Ditolak</h2>
                    <p className="text-sm text-gray-500 mt-1.5">
                        Halaman ini khusus untuk Admin. Anda akan diarahkan kembali ke dashboard.
                    </p>
                    <Link
                        href="/"
                        className="inline-block mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        Ke Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
