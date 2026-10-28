"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { kandangApi, usersApi, sensorDataApi, notificationsApi, activityLogsApi, predictionsApi, deathReportsApi, dailyLogsApi, getNotificationWsUrl } from "@/lib/api";

// Suppress SESSION_EXPIRED errors — the overlay in the layout handles redirect
function parseError(err: unknown): string | null {
    if (err instanceof Error) {
        if (err.message === "SESSION_EXPIRED") return null;
        return err.message;
    }
    return "Failed to fetch";
}

type UnknownRecord = { [key: string]: unknown };

function asRecord(value: unknown): UnknownRecord | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as UnknownRecord)
        : null;
}

function extractList<T>(response: unknown): { items: T[]; total: number } {
    if (Array.isArray(response)) {
        return { items: response as T[], total: response.length };
    }

    const root = asRecord(response);
    const data = root?.data;

    if (Array.isArray(data)) {
        return { items: data as T[], total: data.length };
    }

    for (const container of [root, asRecord(data)]) {
        if (container && Array.isArray(container.items)) {
            const items = container.items as T[];
            const total = typeof container.total === "number" ? container.total : items.length;
            return { items, total };
        }
    }

    return { items: [], total: 0 };
}

function extractEntity<T>(response: unknown): T | null {
    const root = asRecord(response);
    if (!root) return null;
    if (root.data && typeof root.data === "object") return root.data as T;
    if ("id" in root) return root as T;
    return null;
}

export interface IncomingNotification {
    id?: string;
    title?: string;
    message?: string;
    notification_type?: string;
    kandang_id?: string;
}

interface NotificationPage {
    items: Notification[];
    unread_count: number;
    total: number;
    total_pages: number;
    page: number;
    limit: number;
}

function extractNotificationPage(response: unknown, fallbackPage: number, fallbackLimit: number): NotificationPage {
    const { items, total } = extractList<Notification>(response);
    const root = asRecord(response);
    const container = asRecord(root?.data) ?? root;

    return {
        items,
        unread_count: typeof container?.unread_count === "number"
            ? container.unread_count
            : items.filter((item) => !item.is_read).length,
        total: typeof container?.total === "number" ? container.total : total,
        total_pages: typeof container?.total_pages === "number" ? container.total_pages : 1,
        page: typeof container?.page === "number" ? container.page : fallbackPage,
        limit: typeof container?.limit === "number" ? container.limit : fallbackLimit,
    };
}

function extractTodayTotal(response: unknown): number {
    const root = asRecord(response);
    const data = root?.data;
    if (typeof data === "number") return data;
    const container = asRecord(data) ?? root;
    return typeof container?.total === "number" ? container.total : 0;
}

// Types
export interface Kandang {
    id: string;
    nama: string;
    kode: string;
    lokasi?: string;
    kapasitas?: number;
    deskripsi?: string;
    is_active: boolean;
    pemilik_id: string;
    pemilik?: {
        id: string;
        full_name: string;
    };
    created_at: string;
    updated_at: string;
    latest_sensor?: {
        suhu: number;
        kelembaban: number;
        amoniak: number;
        populasi?: number;
        pakan?: number;
        minum?: number;
        bobot?: number;
        death?: number;
        status?: string;
        timestamp: string;
    };
}

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    is_active: boolean;
    pemilik_id?: string;
    pemilik?: {
        id: string;
        full_name: string;
    };
    created_at: string;
    updated_at: string;
    last_login?: string;
}

export interface SensorData {
    id: string;
    kandang_id: string;
    kandang?: {
        id: string;
        nama: string;
    };
    timestamp: string;
    hari_ke: number;
    suhu: number;
    kelembaban: number;
    amoniak: number;
    pakan?: number;
    minum?: number;
    bobot?: number;
    populasi?: number;
    death?: number;
}

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: string | null;        // JSON string with extra details
    kandang_id?: string;
    kandang?: {
        id: string;
        nama: string;
    };
    is_read: boolean;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    user_username?: string;
    user_full_name?: string;
    action: string;
    resource: string;
    resource_id?: string;
    details?: string;
    platform?: string;
    ip_address?: string;
    created_at: string;
}

export interface SensorDataStats {
    avg_suhu: number;
    avg_kelembaban: number;
    avg_amoniak: number;
    total_pakan: number;
    total_minum: number;
    avg_bobot: number;
    total_populasi: number;
    total_death: number;
    data_count: number;
}

export interface ModelInfo {
    classification_model: {
        name: string;
        type: string;
        version: string;
        status: string;
        description: string;
        input_features: string[];
        output_classes: string[];
        metrics: Record<string, string>;
    };
    forecasting_model: {
        name: string;
        type: string;
        version: string;
        status: string;
        description: string;
        input_features: string[];
        window_size: string;
        output: string;
        metrics: Record<string, string>;
    };
}

// Kandang hooks
export function useMyKandang() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<Kandang | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await kandangApi.getMe(session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as Kandang);
                } else if ("id" in response) {
                    setData(response as unknown as Kandang);
                }
            }
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Users hooks
export function useUsers(params?: { role?: string; pemilik_id?: string }) {
    const { data: session, status } = useSession();
    const { role, pemilik_id } = params ?? {};
    const [data, setData] = useState<{ items: User[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await usersApi.list({ role, pemilik_id }, session.accessToken);
            setData(extractList<User>(response));
        } catch (err) {
            console.error("Users fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, role, pemilik_id]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useUser(id: string) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading" || !id) return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await usersApi.get(id, session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as User);
                } else if ("id" in response) {
                    setData(response as unknown as User);
                }
            }
        } catch (err) {
            console.error("User detail fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [id, session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Sensor Data hooks
export function useSensorData(params?: { page?: number; page_size?: number; start_date?: string; end_date?: string; kandang_id?: string }) {
    const { data: session, status } = useSession();
    const { page, page_size, start_date, end_date, kandang_id } = params ?? {};
    const [data, setData] = useState<{ items: SensorData[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);
    const prevKey = useRef<string>("");
    const hasData = useRef(false);

    useEffect(() => {
        const key = `${page}|${page_size}|${start_date}|${end_date}|${kandang_id}`;
        if (prevKey.current !== key) {
            prevKey.current = key;
            hasFetched.current = false;
        }
    }, [page, page_size, start_date, end_date, kandang_id]);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        if (hasData.current) {
            setIsFetching(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await sensorDataApi.list({ page, page_size, start_date, end_date, kandang_id }, session.accessToken);
            setData(extractList<SensorData>(response));
            hasData.current = true;
        } catch (err) {
            console.error("Sensor data fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    }, [session?.accessToken, status, page, page_size, start_date, end_date, kandang_id]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, isFetching, error, refetch };
}

// Notifications hooks
export function useNotifications(page: number = 1, limit: number = 20, kandangId?: string) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<NotificationPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await notificationsApi.list({ page, limit, kandang_id: kandangId }, session.accessToken);
            setData(extractNotificationPage(response, page, limit));
        } catch (err) {
            console.error("Notifications fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, page, limit, kandangId]);

    useEffect(() => {
        if (status === "loading") return;
        if (session?.accessToken) {
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, page, kandangId, refetch]);

    return { data, loading, error, refetch };
}

// Mutation hooks
export function useUpdateKandang() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: Parameters<typeof kandangApi.update>[1]): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await kandangApi.update(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useDeleteUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await usersApi.delete(id, session.accessToken);
                return { success: true };
            } catch (err) {
                setError(parseError(err));
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreateUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: Parameters<typeof usersApi.create>[0]): Promise<{ success: boolean; data?: User; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await usersApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as User };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to create";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreatePeternak() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: Parameters<typeof usersApi.create>[0]): Promise<{ success: boolean; data?: User }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await usersApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as User };
            } catch (err) {
                setError(parseError(err));
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useUpdateUser() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: Parameters<typeof usersApi.update>[1]): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await usersApi.update(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useCreateSensorData() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: Parameters<typeof sensorDataApi.create>[0]): Promise<{ success: boolean; data?: SensorData; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                const response = await sensorDataApi.create(data, session.accessToken);
                return { success: true, data: response as unknown as SensorData };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to create sensor data";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useMarkNotificationAsRead() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await notificationsApi.markAsRead(id, session.accessToken);
                return { success: true };
            } catch (err) {
                setError(parseError(err));
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useMarkAllNotificationsAsRead() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (): Promise<{ success: boolean }> => {
            if (!session?.accessToken) {
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                await notificationsApi.markAllAsRead(session.accessToken);
                return { success: true };
            } catch (err) {
                setError(parseError(err));
                return { success: false };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

// Activity Logs hooks
export function useActivityLogs(params?: { page?: number; per_page?: number; action?: string; resource?: string }) {
    const { data: session, status } = useSession();
    const { page, per_page, action, resource } = params ?? {};
    const [data, setData] = useState<{ items: ActivityLog[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            setError("No access token");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await activityLogsApi.list({ page, per_page, action, resource }, session.accessToken);
            setData(extractList<ActivityLog>(response));
        } catch (err) {
            console.error("Activity logs fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, page, per_page, action, resource]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useMyActivityLogs(params?: { page?: number; per_page?: number }) {
    const { data: session, status } = useSession();
    const { page, per_page } = params ?? {};
    const [data, setData] = useState<{ items: ActivityLog[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await activityLogsApi.getMyLogs({ page, per_page }, session.accessToken);
            setData(extractList<ActivityLog>(response));
        } catch (err) {
            console.error("My activity logs fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status, page, per_page]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Sensor Data additional hooks
export function useUpdateSensorData() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (id: string, data: {
            pakan?: number;
            minum?: number;
            bobot?: number;
            populasi?: number;
            death?: number;
        }): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await sensorDataApi.updateManual(id, data, session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to update sensor data";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export function useSensorDataStats(hours?: number) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<SensorDataStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await sensorDataApi.getStats(hours, session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as SensorDataStats);
                } else {
                    setData(response as unknown as SensorDataStats);
                }
            }
        } catch (err) {
            console.error("Sensor stats fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [hours, session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

// Model Info hooks
export function useModelInfo() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<ModelInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const refetch = useCallback(async () => {
        if (status === "loading") return;
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await predictionsApi.getModels(session.accessToken);
            if (response && typeof response === "object") {
                if ("data" in response && response.data) {
                    setData(response.data as ModelInfo);
                } else {
                    setData(response as unknown as ModelInfo);
                }
            }
        } catch (err) {
            console.error("Model info fetch error:", err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            refetch();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useReloadModels() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) {
                return { success: false, error: "No access token" };
            }

            setLoading(true);
            setError(null);

            try {
                await predictionsApi.reloadModels(session.accessToken);
                return { success: true };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to reload models";
                setError(errorMsg);
                return { success: false, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

// Death Reports hooks
export function useCreateDeathReport() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: { count: number; notes?: string }): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) return { success: false, error: "No access token" };
            setLoading(true);
            setError(null);
            try {
                await deathReportsApi.report(data, session.accessToken);
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Gagal melaporkan kematian";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

// Daily Logs hooks
export function useCreateDailyLog() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (data: { pakan?: number; minum?: number; populasi?: number; bobot?: number; notes?: string; date?: string }): Promise<{ success: boolean; error?: string }> => {
            if (!session?.accessToken) return { success: false, error: "No access token" };
            setLoading(true);
            setError(null);
            try {
                await dailyLogsApi.save(data, session.accessToken);
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Gagal menyimpan log harian";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setLoading(false);
            }
        },
        [session?.accessToken]
    );

    return { mutate, loading, error };
}

export interface DailyLog {
    id: string;
    kandang_id: string;
    date: string;
    pakan?: number;
    minum?: number;
    populasi?: number;
    bobot?: number;
    notes?: string;
    recorded_by?: string;
    created_at: string;
    updated_at: string;
}

export function useTodayDailyLog(kandangId?: string) {
    const { data: session, status } = useSession();
    const [data, setData] = useState<DailyLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!session?.accessToken) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await dailyLogsApi.getToday(kandangId, session.accessToken);
            setData(extractEntity<DailyLog>(res));
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, kandangId]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken) refetch();
        else setLoading(false);
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export interface DeathReportItem {
    id: string;
    kandang_id: string;
    count: number;
    notes?: string;
    timestamp: string;
    reported_by?: string;
    created_at: string;
}

export function useDeathReports(params?: { page?: number; per_page?: number; kandangId?: string }) {
    const { data: session, status } = useSession();
    const { page = 1, per_page = 10, kandangId } = params ?? {};
    const [data, setData] = useState<{ items: DeathReportItem[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!session?.accessToken) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await deathReportsApi.list(
                { per_page, page, kandang_id: kandangId },
                session.accessToken,
            );
            setData(extractList<DeathReportItem>(res));
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, page, per_page, kandangId]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken) refetch();
        else setLoading(false);
    }, [status, session?.accessToken, refetch]);

    return { data, loading, error, refetch };
}

export function useTodayDeathTotal(kandangId?: string) {
    const { data: session, status } = useSession();
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!session?.accessToken) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await deathReportsApi.getTodayTotal(kandangId, session.accessToken);
            setTotal(extractTodayTotal(res));
        } catch {
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken, kandangId]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated" && session?.accessToken) refetch();
        else setLoading(false);
    }, [status, session?.accessToken, refetch]);

    return { total, loading, refetch };
}

// WebSocket Notification hook
export function useNotificationWebSocket(
    onNotification?: (notification: IncomingNotification) => void
) {
    const { data: session, status } = useSession();
    const accessToken = session?.accessToken;
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onNotificationRef = useRef(onNotification);
    const connectRef = useRef<() => void>(() => {});

    // Keep callback ref up to date without re-triggering connect
    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    const connect = useCallback(() => {
        if (status !== "authenticated" || !accessToken) return;

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const wsUrl = getNotificationWsUrl(accessToken);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("🔔 Notification WebSocket connected");
                setConnected(true);

                // Start ping keep-alive every 30 seconds
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("ping");
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    // Ignore pong responses
                    if (event.data === "pong") return;

                    const message = JSON.parse(event.data) as { type?: string; data?: IncomingNotification };

                    // Only handle notification messages, ignore sensor_data etc.
                    if (message.type === "notification" && message.data && onNotificationRef.current) {
                        onNotificationRef.current(message.data);
                    }
                } catch {
                    // Non-JSON messages are fine
                }
            };

            ws.onclose = (event) => {
                console.log("🔔 Notification WebSocket disconnected", event.code);
                setConnected(false);

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }

                // Auto-reconnect after 5 seconds (unless intentionally closed)
                if (event.code !== 1000 && event.code !== 4001) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectRef.current();
                    }, 5000);
                }
            };

            ws.onerror = () => {
                // onerror is always followed by onclose which handles reconnection
            };

            wsRef.current = ws;
        } catch (err) {
            console.error("Failed to create WebSocket:", err);
        }
    }, [status, accessToken]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000);
                wsRef.current = null;
            }
        };
    }, [connect]);

    return { connected };
}
