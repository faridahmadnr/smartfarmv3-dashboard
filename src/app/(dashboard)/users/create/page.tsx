"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";
import { useCreateUser } from "@/hooks/useApi";

export default function CreateUserPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { mutate: createUser, loading: creating } = useCreateUser();

    const isAdmin = session?.user?.role === "admin";
    const isPemilik = session?.user?.role === "pemilik";

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        email: "",
        phone: "",
        role: isPemilik ? "peternak" : "peternak",
    });
    const [error, setError] = useState("");

    if (status === "loading") {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    // Only admin and pemilik can create users
    if (!isAdmin && !isPemilik) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Anda tidak memiliki akses untuk membuat user</p>
                </div>
                <Link href="/users">
                    <Button variant="secondary">← Kembali</Button>
                </Link>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.username.trim()) {
            setError("Username wajib diisi");
            return;
        }

        if (!formData.password || formData.password.length < 6) {
            setError("Password minimal 6 karakter");
            return;
        }

        if (!formData.full_name.trim()) {
            setError("Nama lengkap wajib diisi");
            return;
        }

        if (!formData.email.trim()) {
            setError("Email wajib diisi");
            return;
        }

        const payload: any = {
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: formData.role,
        };

        // If pemilik creating peternak, add pemilik_id
        if (isPemilik) {
            payload.pemilik_id = session?.user?.id;
        }

        const result = await createUser(payload);

        if (result.success) {
            router.push("/users");
        } else {
            setError(result.error || "Gagal membuat user");
        }
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/users" className="hover:text-green-600">Users</Link>
                <span>/</span>
                <span className="text-gray-900">Tambah User</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isPemilik ? "Tambah Peternak" : "Tambah User"}
                </h1>
                <p className="text-gray-500 mt-1">Isi data berikut untuk membuat akun pengguna baru</p>
            </div>

            {/* Form Card — full width */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Section: Akun */}
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Akun</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                                    <Input
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="contoh: budi_peternak"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                                    <Input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Minimal 6 karakter"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Profil */}
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Profil</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <Input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="Nama lengkap user"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Role — hanya untuk admin, tanpa pilihan admin */}
                        {isAdmin && (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hak Akses</h2>
                                <div className="max-w-xs">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <Select name="role" value={formData.role} onChange={handleChange}>
                                        <option value="pemilik">Pemilik</option>
                                        <option value="peternak">Peternak</option>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {isPemilik && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    User akan dibuat sebagai <strong>Peternak</strong> di bawah akun Anda.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link href="/users">
                                <Button type="button" variant="secondary">Batal</Button>
                            </Link>
                            <Button type="submit" disabled={creating}>
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Simpan User
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
