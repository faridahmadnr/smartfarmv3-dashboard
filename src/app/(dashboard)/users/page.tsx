"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmModal } from "@/components/ui/modal";
import { RequireAdmin } from "@/components/auth/require-admin";
import { useRole } from "@/hooks/useRole";
import { useUsers, useDeleteUser, User } from "@/hooks/useApi";

function getRoleBadge(role: string) {
    switch (role) {
        case "admin":
            return <Badge variant="info">Admin</Badge>;
        case "owner":
        case "pemilik":
        case "peternak":
            return <Badge variant="success">Owner</Badge>;
        default:
            return <Badge>{role}</Badge>;
    }
}

function isOwnerRole(role: string) {
    return role === "owner" || role === "pemilik" || role === "peternak";
}

function UsersContent() {
    const { isAdmin } = useRole();
    const { data: apiData, loading, error, refetch } = useUsers();
    const { mutate: deleteUser, loading: isDeleting } = useDeleteUser();
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    const users = apiData?.items || [];

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const result = await deleteUser(deleteTarget.id);
        if (result.success) refetch();
        setDeleteTarget(null);
    };

    return (
        <div className="space-y-6">
            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Hapus User"
                message="Apakah Anda yakin ingin menghapus user ini?"
                itemName={deleteTarget?.full_name}
                isLoading={isDeleting}
            />

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
                    <p className="text-gray-500 mt-1">Kelola semua akun pengguna sistem</p>
                </div>
                {isAdmin && (
                    <Link href="/users/create">
                        <Button>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Tambah User
                        </Button>
                    </Link>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">Gagal mengambil data: {error}</p>
                </div>
            )}

            {/* Empty State */}
            {!error && users.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada user</h3>
                        <p className="text-gray-500 mb-4">Mulai dengan menambahkan user baru</p>
                        {isAdmin && (
                            <Link href="/users/create">
                                <Button>Tambah User</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            {users.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500">Total Users</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">{users.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500">Admin</div>
                            <div className="text-2xl font-bold text-blue-600 mt-1">
                                {users.filter((u) => u.role === "admin").length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500">Owner</div>
                            <div className="text-2xl font-bold text-green-600 mt-1">
                                {users.filter((u) => isOwnerRole(u.role)).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Users Table */}
            {users.length > 0 && (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">User</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Role</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Contact</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-green-700">
                                                            {user.full_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    {getRoleBadge(user.role)}
                                                    {isOwnerRole(user.role) && user.pemilik && (
                                                        <span className="text-xs text-gray-400">
                                                            Pemilik: {user.pemilik.full_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm text-gray-900">{user.email}</p>
                                                <p className="text-xs text-gray-500">{user.phone || "-"}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge variant={user.is_active ? "success" : "danger"}>
                                                    {user.is_active ? "Aktif" : "Nonaktif"}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/users/${user.id}`}>
                                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                    </Link>
                                                    {isAdmin && (
                                                        <button
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            onClick={() => setDeleteTarget(user)}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function UsersPage() {
    return (
        <RequireAdmin>
            <UsersContent />
        </RequireAdmin>
    );
}
