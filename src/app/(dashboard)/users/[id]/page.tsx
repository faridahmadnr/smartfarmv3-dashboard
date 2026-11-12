"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmModal } from "@/components/ui/modal";
import Link from "next/link";
import { useUser, useDeleteUser } from "@/hooks/useApi";

export default function UserDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { data: user, loading, error } = useUser(id as string);
    const { mutate: deleteUser, loading: deleting } = useDeleteUser();

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const isAdmin = session?.user?.role === "admin";

    if (status === "loading" || loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">❌ {error || "User tidak ditemukan"}</p>
                </div>
                <Link href="/users">
                    <Button variant="secondary">← Kembali ke Daftar User</Button>
                </Link>
            </div>
        );
    }

    const handleDelete = async () => {
        const result = await deleteUser(id as string);
        if (result.success) {
            router.push("/users");
        }
        setShowDeleteModal(false);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return <Badge variant="info">Admin</Badge>;
            case "pemilik":
                return <Badge variant="success">Pemilik</Badge>;
            case "peternak":
                return <Badge variant="default">Peternak</Badge>;
            default:
                return <Badge>{role}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Delete Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus User"
                message="Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
                itemName={user.full_name}
                isLoading={deleting}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/users" className="hover:text-green-600">Users</Link>
                <span>/</span>
                <span className="text-gray-900">{user.full_name}</span>
            </div>

            {/* Header Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.full_name}</h1>
                                {getRoleBadge(user.role)}
                                <Badge variant={user.is_active ? "success" : "danger"}>
                                    {user.is_active ? "Aktif" : "Nonaktif"}
                                </Badge>
                            </div>
                            <p className="text-gray-500">@{user.username}</p>
                        </div>
                        {isAdmin && (
                            <div className="flex flex-wrap gap-2">
                                <Link href={`/users/${id}/edit`}>
                                    <Button variant="secondary">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </Button>
                                </Link>
                                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi User</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                                    <p className="text-gray-900">{user.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">No. Telepon</label>
                                    <p className="text-gray-900">{user.phone || "-"}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Terdaftar</label>
                                    <p className="text-gray-900">{formatDate(user.created_at)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Terakhir Diupdate</label>
                                    <p className="text-gray-900">{formatDate(user.updated_at)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Role Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Hak Akses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {user.role === "admin" && (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Akses penuh ke semua fitur</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Kelola semua user dan kandang</span>
                                        </div>
                                    </>
                                )}
                                {user.role === "pemilik" && (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Kelola kandang milik sendiri</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Tambah dan kelola peternak</span>
                                        </div>
                                    </>
                                )}
                                {user.role === "peternak" && (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Lihat kandang yang ditugaskan</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Input data sensor harian</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/activity-logs" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Lihat Activity Log
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
