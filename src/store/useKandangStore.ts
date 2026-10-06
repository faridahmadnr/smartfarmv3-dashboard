import { create } from 'zustand';
import { kandangApi } from '@/lib/api';

export type KandangType = 'Broiler' | 'Layer';
export type KandangStatus = 'Aktif' | 'Nonaktif';

export interface Kandang {
  id: string;
  name: string;
  code: string;
  batch: string;
  type: KandangType;
  capacity: number;
  sensorCount: number;
  isActive: boolean;
}

export interface KandangPayload {
  name: string;
  code?: string;
  type: KandangType;
  capacity: number;
  isActive: boolean;
}

export interface KandangStore {
  selectedKandang: Kandang | null;
  kandangList: Kandang[];

  // ── Async state ─────────────────────────────────────────────────────────
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  setSelectedKandang: (kandang: Kandang) => void;

  // ── Modal state ─────────────────────────────────────────────────────────
  isFormModalOpen: boolean;
  isDeleteModalOpen: boolean;
  editingKandang: Kandang | null;
  deletingKandang: Kandang | null;

  openFormModal: (kandang?: Kandang | null) => void;
  closeFormModal: () => void;
  openDeleteModal: (kandang: Kandang) => void;
  closeDeleteModal: () => void;

  // ── CRUD actions (backend-backed) ───────────────────────────────────────
  fetchKandangList: () => Promise<void>;
  createKandang: (payload: KandangPayload) => Promise<boolean>;
  updateKandang: (id: string, payload: KandangPayload) => Promise<boolean>;
  deleteKandang: (id: string) => Promise<boolean>;
}

type ApiKandang = {
  id: string;
  nama: string;
  kode: string;
  lokasi?: string;
  kapasitas?: number;
  deskripsi?: string;
  is_active: boolean;
  pemilik_name?: string;
};

// Backend only stores an is_active flag; type/batch are derived for the UI.
function mapApiKandang(k: ApiKandang): Kandang {
  return {
    id: k.id,
    name: k.nama,
    code: k.kode,
    batch: k.kode,
    type: 'Broiler',
    capacity: k.kapasitas ?? 0,
    sensorCount: 0,
    isActive: k.is_active,
  };
}

function extractListData(response: unknown): ApiKandang[] {
  const res = response as { data?: unknown; items?: unknown } | null;
  if (!res) return [];

  const payload = Array.isArray(res.data) ? res.data : res.items;
  if (Array.isArray(payload)) return payload as ApiKandang[];

  const nested = (res.data as { items?: unknown } | undefined)?.items;
  if (Array.isArray(nested)) return nested as ApiKandang[];

  return [];
}

function extractSingleData(response: unknown): ApiKandang | null {
  const res = response as { data?: unknown } | null;
  if (!res) return null;
  const payload = res.data ?? response;
  if (payload && typeof payload === 'object' && 'id' in payload) {
    return payload as ApiKandang;
  }
  return null;
}

export const useKandangStore = create<KandangStore>((set, get) => ({
  selectedKandang: null,
  kandangList: [],

  isLoading: false,
  isSubmitting: false,
  error: null,

  setSelectedKandang: (kandang: Kandang) => set({ selectedKandang: kandang }),

  isFormModalOpen: false,
  isDeleteModalOpen: false,
  editingKandang: null,
  deletingKandang: null,

  openFormModal: (kandang = null) =>
    set({ isFormModalOpen: true, editingKandang: kandang }),
  closeFormModal: () =>
    set({ isFormModalOpen: false, editingKandang: null }),
  openDeleteModal: (kandang: Kandang) =>
    set({ isDeleteModalOpen: true, deletingKandang: kandang }),
  closeDeleteModal: () =>
    set({ isDeleteModalOpen: false, deletingKandang: null }),

  fetchKandangList: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await kandangApi.list({ per_page: 100 });
      const kandangList = extractListData(response).map(mapApiKandang);
      const currentSelected = get().selectedKandang;
      const selectedKandang = currentSelected
        ? kandangList.find((k) => k.id === currentSelected.id) ?? kandangList[0] ?? null
        : kandangList[0] ?? null;
      set({ kandangList, selectedKandang, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal mengambil data kandang',
      });
    }
  },

  createKandang: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const kode =
        payload.code?.trim() ||
        `KDG-${Date.now().toString().slice(-6)}`;
      const response = await kandangApi.create({
        nama: payload.name,
        kode,
        kapasitas: payload.capacity,
      });
      const created = extractSingleData(response);
      const newKandang: Kandang = created
        ? mapApiKandang(created)
        : {
            id: kode,
            name: payload.name,
            code: kode,
            batch: kode,
            type: payload.type,
            capacity: payload.capacity,
            sensorCount: 0,
            isActive: payload.isActive,
          };
      set((state) => ({
        kandangList: [...state.kandangList, newKandang],
        selectedKandang: state.selectedKandang ?? newKandang,
        isSubmitting: false,
      }));
      return true;
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Gagal membuat kandang',
      });
      return false;
    }
  },

  updateKandang: async (id, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await kandangApi.update(id, {
        nama: payload.name,
        kapasitas: payload.capacity,
        is_active: payload.isActive,
      });
      const updated = extractSingleData(response);
      set((state) => {
        const kandangList = state.kandangList.map((k) =>
          k.id === id
            ? updated
              ? mapApiKandang(updated)
              : { ...k, name: payload.name, capacity: payload.capacity, isActive: payload.isActive }
            : k
        );
        const selectedKandang =
          state.selectedKandang?.id === id
            ? kandangList.find((k) => k.id === id) ?? state.selectedKandang
            : state.selectedKandang;
        return { kandangList, selectedKandang, isSubmitting: false };
      });
      return true;
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Gagal memperbarui kandang',
      });
      return false;
    }
  },

  deleteKandang: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await kandangApi.delete(id);
      set((state) => {
        const kandangList = state.kandangList.filter((k) => k.id !== id);
        const selectedKandang =
          state.selectedKandang?.id === id
            ? kandangList[0] ?? null
            : state.selectedKandang;
        return { kandangList, selectedKandang, isSubmitting: false };
      });
      return true;
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Gagal menghapus kandang',
      });
      return false;
    }
  },
}));