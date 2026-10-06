# Dokumentasi Integrasi UI Navbar

## Ringkasan Perubahan
Modifikasi Navbar untuk menyesuaikan UI baru dengan `KandangSwitcher` dan status IoT.

### File Baru/Dimodifikasi
- `src/store/useKandangStore.ts`: Store Zustand untuk manajemen state kandang.
- `src/components/KandangSwitcher.tsx`: Komponen dropdown pemilih kandang.
- `src/components/layout/navbar.tsx`: Rombakan layout navbar.

## Alur State Management (Zustand)
- `useKandangStore` menyimpan `kandangList` (mock) dan `selectedKandang`.
- Komponen `KandangSwitcher` mengambil data dari store dan memperbarui `selectedKandang` saat opsi dipilih.

## Titik Integrasi API (Checklist)

### 1. Kandang (Backend Integration)
- [ ] Ubah `mockKandangList` di `src/store/useKandangStore.ts` menjadi data yang di-fetch dari API: `GET /api/kandang`.
- [ ] Implementasikan `loading` state di `useKandangStore` saat fetch data awal.

### 2. Status IoT (Backend Integration)
- [ ] Ubah status "Online (IoT Synced)" di `src/components/layout/navbar.tsx` agar tidak statis.
- [ ] Integrasikan status ini dengan endpoint `GET /api/system/status` atau melalui WebSocket (`/ws/iot-status`).
- [ ] Sesuaikan warna indikator (hijau/merah) berdasarkan status koneksi real-time.

### 3. Notifikasi
- [ ] Pastikan endpoint notifikasi `notificationsApi` di `navbar.tsx` tetap relevan dengan struktur data backend FastAPI.

---

# Dokumentasi UI Manajemen Kandang

## Ringkasan Perubahan
Slicing UI fitur "Manajemen Kandang" beserta komponen modal CRUD (Create, Read, Update, Delete) menggunakan data dummy dari store Zustand, sehingga UI dapat di-render tanpa backend.

## File Baru/Dimodifikasi
- `src/app/(dashboard)/manajemen-kandang/page.tsx`: Halaman utama dengan header, tombol "+ Tambah Kandang", grid responsif kartu kandang, dan empty state.
- `src/components/KandangCard.tsx`: Kartu kandang menampilkan badge tipe (Broiler/Layer), badge status (Aktif/Nonaktif), nama, ID, kapasitas, jumlah sensor, serta tombol aksi Edit & Hapus.
- `src/components/modals/KandangFormModal.tsx`: Modal form Tambah/Edit kandang (Nama, Tipe Kandang, Kapasitas, Status Operasional) dengan header ikon dan tombol Batal & Tambahkan/Simpan.
- `src/components/modals/DeleteKandangModal.tsx`: Modal konfirmasi hapus dengan peringatan beraksen merah.
- `src/store/useKandangStore.ts`: Penambahan tipe `Kandang` yang diperluas (`type`, `capacity`, `sensorCount`, `isActive`), state modal, dan aksi dummy CRUD.
- `src/components/layout/sidebar.tsx`: Penambahan menu navigasi "Manajemen Kandang" untuk semua role.

## Alur State Management (Zustand)
- `useKandangStore` menyimpan `kandangList` (dummy) dan `selectedKandang`.
- State modal: `isFormModalOpen`, `isDeleteModalOpen`, `editingKandang`, `deletingKandang`.
- Aksi UI: `openFormModal(kandang?)`, `closeFormModal()`, `openDeleteModal(kandang)`, `closeDeleteModal()`.
- Aksi data dummy: `addKandang()`, `updateKandang()`, `deleteKandang()`.
- Tombol Edit/Hapus pada `KandangCard` memanggil aksi store untuk membuka modal terkait.

## Titik Integrasi API (Checklist)

### 4. Kandang CRUD (Backend Integration)
- [ ] Ubah `mockKandangList` di `src/store/useKandangStore.ts` menjadi hasil `GET /api/kandang` (atau `kandangApi` di `src/lib/api.ts`).
- [ ] Ganti aksi `addKandang` menjadi `POST /api/kandang`.
- [ ] Ganti aksi `updateKandang` menjadi `PUT /api/kandang/{id}`.
- [ ] Ganti aksi `deleteKandang` menjadi `DELETE /api/kandang/{id}`.
- [ ] Tambahkan state `loading` & `error` pada store, serta tampilkan toast saat sukses/gagal.
- [ ] Sinkronkan `selectedKandang` dengan `KandangSwitcher` setelah operasi CRUD.
