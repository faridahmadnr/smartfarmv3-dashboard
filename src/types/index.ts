// API Response Types matching FastAPI backend

export type UserRole = 'admin' | 'pemilik' | 'peternak';

export interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    phone?: string;
    role: UserRole;
    is_active: boolean;
    pemilik_id?: string;
    created_by_id?: string;
    created_at: string;
    updated_at: string;
}

export interface LoginUserInfo {
    id: string;
    email: string;
    username: string;
    full_name: string;
    role: UserRole;
    pemilik_id?: string;
}

export interface LoginResponse {
    user: LoginUserInfo;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface Kandang {
    id: string;
    nama: string;
    kode: string;
    lokasi?: string;
    kapasitas?: number;
    deskripsi?: string;
    is_active: boolean;
    pemilik_id: string;
    pemilik_name?: string;
    created_at: string;
    updated_at: string;
}

export interface SensorData {
    id: string;
    kandang_id: string;
    timestamp: string;
    hari_ke: number;
    suhu: number;
    kelembaban: number;
    amoniak: number;
    pakan?: number;
    minum?: number;
    bobot?: number;
    populasi?: number;
    death: number;
    recorded_by?: string;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    kandang_id?: string;
    type: string;
    title: string;
    message: string;
    data?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export interface PredictionResult {
    classification?: {
        result: string;
        confidence: number;
    };
    forecasting?: {
        predicted_deaths: number;
    };
}

export interface DeathReport {
    id: string;
    kandang_id: string;
    count: number;
    notes?: string;
    timestamp: string;
    reported_by?: string;
    created_at: string;
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

// API Response wrapper
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    per_page: number;
    pages: number;
}
