"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";
import { useUser, useUpdateUser, type User } from "@/hooks/useApi";
import { useRole } from "@/hooks/useRole";
import { normalizeRole, toApiRole, type UserRole } from "@/lib/roles";

function EditUserForm({ user, id }: { user: User; id: string }) {
    const router = useRouter();
    const { mutate: updateUser, loading: updating } = useUpdateUser();

    const [formData, setFormData] = useState({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: normalizeRole(user.role) as UserRole,
        is_active: user.is_active ?? true,
    });
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.full_name.trim()) {
            setError("Nama lengkap wajib diisi");
            return;
        }

        if (!formData.email.trim()) {
            setError("Email wajib diisi");
            return;
        }

        const payload = {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: toApiRole(formData.role),
            is_active: formData.is_active,
        };

        const result = await updateUser(id, payload);

        if (result.success) {
            router.push(`/users/${id}`);
        } else {
            setError(result.error || "Gagal mengupdate user");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/users" className="hover:text-green-600">Users</Link>
                <span>/</span>
                <Link href={`/users/${id}`} className="hover:text-green-600">{user.full_name || "Detail"}</Link>
                <span>/</span>
                <span className="text-gray-900">Edit</span>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Edit User</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Lengkap *
                                </label>
                                <Input
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Nama lengkap user"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    No. Telepon
                                </label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <Select name="role" value={formData.role} onChange={handleChange}>
                                    <option value="owner">Owner</option>
                                    <option value="admin">Admin</option>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <Select
                                    name="is_active"
                                    value={formData.is_active ? "true" : "false"}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
                                >
                                    <option value="true">Aktif</option>
                                    <option value="false">Non-aktif</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link href={`/users/${id}`}>
                                <Button type="button" variant="secondary">Batal</Button>
                            </Link>
                            <Button type="submit" disabled={updating}>
                                {updating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Simpan Perubahan
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

export default function EditUserPage() {
    const { id } = useParams();
    const { isAdmin, status } = useRole();
    const { data: user, loading: fetching, error: fetchError } = useUser(id as string);

    if (status === "loading" || fetching) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Anda tidak memiliki akses untuk mengedit user</p>
                </div>
                <Link href="/users">
                    <Button variant="secondary">← Kembali</Button>
                </Link>
            </div>
        );
    }

    if (fetchError && !user) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Gagal memuat data user</p>
                </div>
                <Link href="/users">
                    <Button variant="secondary">← Kembali</Button>
                </Link>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    return <EditUserForm user={user} id={id as string} />;
}