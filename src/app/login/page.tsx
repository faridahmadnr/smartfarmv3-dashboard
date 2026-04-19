"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionExpired = searchParams.get("reason") === "session_expired";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Username atau password salah");
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Image
                        src="/smartfarmv2-logo.png"
                        alt="SmartFarm Logo"
                        width={80}
                        height={80}
                        className="mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">Broilabs</h1>
                    <p className="text-gray-500 mt-1">Masuk ke dashboard Anda</p>
                </div>

                {/* Session expired banner */}
                {sessionExpired && (
                    <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                        Sesi Anda telah berakhir. Silakan login kembali.
                    </div>
                )}

                {/* Login Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            id="username"
                            label="Username atau Email"
                            type="text"
                            placeholder="Masukkan username atau email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                        >
                            Masuk
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-6">
                    © 2026 Broilabs. Sistem Monitoring Peternakan Cerdas.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
