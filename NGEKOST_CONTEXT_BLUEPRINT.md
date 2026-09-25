# Context & Blueprint Proyek NgeKos

Dokumen ini berisi rangkuman lengkap arsitektur, histori keputusan, implementasi backend, konfigurasi database, autentikasi, aturan bisnis, dan panduan melanjutkan pekerjaan untuk AI Agent / Developer berikutnya (Antigravity).

---

## 1. Ringkasan Proyek
- **Nama Aplikasi:** NgeKos
- **Domain:** Marketplace & Manajemen Sewa Kost di Indonesia
- **Lokasi Codebase:** `/home/spawn2pwn/Project/ngekost-v3/ngekost`
- **Tech Stack Utama:**
  - Framework: Next.js `16.3.3` (App Router, Turbopack)
  - Runtime & Language: Node `v22.23.1`, TypeScript `5.9.3`
  - Library UI: React `19.2.8`, TailwindCSS `v4`, Base UI (`@base-ui/react`), Radix Primitives
  - I18n: `next-intl` v4 (`id` default, `en`)
  - Database: PostgreSQL (Supabase) via Prisma ORM `6.12.0`
  - Driver Adapter: `@prisma/adapter-pg` + `pg`
  - Authentication: Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`)
  - Object Storage: Supabase Storage (Bucket: `property-images`)
  - Schema Validation: Zod `3.25.7`
  - Test Harness: Vitest `5.0.1`

---

## 2. Instruksi & Batasan Khusus dari User
1. **JANGAN MEROMBAK UI/FRONTEND:**
   - Desain yang sudah ada dijaga ketat (warna warm cream `#F4F3EF`, accent `#3A2618`, rounded-lg, flat minimalis tanpa 3D).
   - Jangan mengubah tata letak halaman yang sudah ada kecuali sebatas integrasi fungsional backend (action form, submit handler, session check).
2. **TRANSAKSI MIDTRANS BELUM DIBUAT:**
   - Pembayaran gateway Midtrans **DITAHAN** terlebih dahulu atas permintaan user.
   - Flow pembayaran saat ini murni CRUD/manual invoice di level backend (status pending, verified, tagihan sewa). Integrasi Midtrans baru akan dibuat setelah seluruh backend CRUD stabil.
3. **ENDPOINT LOGIN & REGISTER:**
   - Endpoint login & register dibakukan via:
     - `POST /api/auth/login` (menerima `email`, `password`, dan `role: "seeker" | "owner"`)
     - `POST /api/auth/register` (menerima `fullName`, `email`, `password`, `phone`, `role`, `locale`)
     - `POST /api/auth/logout`
     - `GET /auth/callback` (OAuth Google callback handler)
   - Halaman pendaftaran telah resmi di-rename dari `/daftar` menjadi `/register`. Akses ke `/daftar` otomatis dialihkan via `308 Permanent Redirect` ke `/register`.

---

## 3. Alur Navbar & Halaman Login Terbaru
1. **Popup Masuk di Navbar:**
   - Tombol "Masuk" pada navbar memicu popup modal role selection dengan dua opsi:
     - **Pencari Kos** $\rightarrow$ me-redirect ke `/{locale}/login?role=seeker`
     - **Pemilik Kos** $\rightarrow$ me-redirect ke `/{locale}/login?role=owner`
2. **Layout Halaman Login (`/login`):**
   - **Tanpa Navbar dan Tanpa Footer:** Rute `/login` dan `/register` telah dikecualikan di `src/components/ConditionalNavbar.tsx` dan `src/components/ConditionalFooter.tsx`.
   - **Split Screen (Dua Kolom):**
     - **Sisi Kiri:** Foto hunian kost (`/images/about-hero-wide.jpg` placeholder) berjarak/ber-padding dari tepi layar (`p-4 lg:p-6`), memiliki sudut membulat halus (`rounded-lg`), dan overlay teks deskripsi role.
     - **Sisi Kanan:** Form login terpusat berisi Logo NgeKos, title role spesifik, tombol "Lanjutkan dengan Google", divider "atau", form email & password, tombol submit "Masuk", dan link ke `/register`.

---

## 4. Konfigurasi Environment (`.env.local`)
Variabel yang terpasang dan aktif di `.env.local`:
```env
DATABASE_URL="postgresql://postgres.jvkxjlwfylwgvbkubwln:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.jvkxjlwfylwgvbkubwln:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://jvkxjlwfylwgvbkubwln.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="property-images"
GEOAPIFY_API_KEY="..."
```
*Catatan:* Simbol khusus pada password database sudah di-URL-encode agar driver PostgreSQL tidak mengalami error `ERR_INVALID_URL`.

---

## 5. Arsitektur Database & Migrasi (Prisma + Supabase)
Schema file: `prisma/schema.prisma`
Migrasi SQL: `prisma/migrations/`
- **`20260917102500_init`**:
  - Membuat 28 tabel domain utama:
    - `profiles` (FK cascade ke `auth.users(id)` Supabase)
    - `properties`, `property_images`, `facilities`, `property_facilities`
    - `room_types`, `room_units`
    - `favorites`, `bookings`, `booking_status_history`
    - `rental_agreements`, `invoices`, `payments`
    - `reviews`, `complaints`, `complaint_history`
    - `announcements`, `announcement_reads`, `notifications`
    - `conversations`, `messages`, `property_verifications`, `reports`, `audit_logs`
    - `blog_posts`, `faq_entries`, `popular_cities`
  - Trigger PostgreSQL `handle_new_auth_user()` pada event `after insert or update on auth.users` untuk menyinkronkan profil otomatis.
  - Mengaktifkan Row Level Security (RLS) di PostgreSQL.
  - Bucket Supabase Storage `property-images` terdaftar publik dengan policy mutasi restricted ke folder `auth.uid()`.
- **`20260917105200_property_min_price`**:
  - Menambahkan kolom `min_monthly_price` dan indeks pencarian publik.
- **`20260917105700_seed_facilities`**:
  - Seeding 13 fasilitas kost master (wifi, ac, bathroom-in, parking, kitchen, dll).

### Seed Data
Tersedia script `npm run prisma:seed` (`prisma/seed.ts` via `tsx`) yang telah men-seed 10 properti kost riil (Kost Griya Cemara Dago, Kost Putri Mawar, Kost Pangeran Diponegoro, dll) lengkap dengan tipe kamar dan status unit kamar.

---

## 6. Struktur Backend & API Endpoints
Semua endpoint berada di `src/app/api/`:
- **Auth:**
  - `POST /api/auth/register`: Pendaftaran user baru via Supabase Auth.
  - `POST /api/auth/login`: Autentikasi email/password dengan validasi kecocokan role profil.
  - `POST /api/auth/logout`: Sign out session.
  - `GET /api/me`: Mengambil DTO profil pengguna yang sedang login.
  - `PATCH /api/me`: Mengubah preferensi notifikasi / profil.
  - `GET /auth/callback`: Pertukaran kode OAuth Google & email confirmation, validasi role mismatch.
- **Properties & Rooms:**
  - `GET /api/properties`: Listing publik kost terverifikasi (filter: kota, gender, maxPrice, fasilitas, search `q`, sort). Menerima query `mine=true` untuk melihat properti milik owner sendiri.
  - `POST /api/properties`: Pembuatan kost baru oleh owner.
  - `GET /api/properties/[id]`: Detail properti (menerima UUID maupun slug, e.g. `kost-griya-cemara-dago`).
  - `PATCH /api/properties/[id]`: Update properti oleh owner.
  - `DELETE /api/properties/[id]`: Soft-delete properti.
  - `POST /api/properties/[id]/room-types`: Tambah tipe kamar.
  - `POST /api/properties/[id]/rooms`: Tambah nomor unit kamar.
  - `PATCH /api/properties/[id]/rooms/[roomId]`: Ubah status unit kamar (`AVAILABLE` / `MAINTENANCE`).
  - `POST /api/properties/[id]/submit-verification`: Pengajuan verifikasi kost ke tim admin.
- **Bookings:**
  - `GET /api/bookings`: Daftar booking pengguna/owner.
  - `POST /api/bookings`: Pengajuan sewa kamar (durasi 1, 3, 6, 12 bulan).
  - `GET /api/bookings/[id]`: Detail permohonan booking.
  - `PATCH /api/bookings/[id]`: Transisi status (Owner: `APPROVED_AWAITING_PAYMENT` mengunci unit menjadi `RESERVED`, atau `REJECTED`. Seeker: `CANCELLED`).
- **Invoices & Pembayaran Manual:**
  - `GET /api/invoices`: Daftar tagihan sewa.
  - `POST /api/invoices`: Pembuatan tagihan oleh owner.
  - `PATCH /api/invoices/[id]`: Pelunasan manual tagihan atau pembatalan.
- **Operasional & Interaksi:**
  - `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/[propertyId]`
  - `GET /api/reviews`, `POST /api/reviews`, `PATCH /api/reviews/[id]`, `DELETE /api/reviews/[id]`
  - `GET /api/complaints`, `POST /api/complaints`, `PATCH /api/complaints/[id]`
  - `GET /api/announcements`, `POST /api/announcements`, `POST /api/announcements/[id]/read`
  - `GET /api/notifications`, `PATCH /api/notifications`
  - `GET /api/admin/verifications`, `PATCH /api/admin/verifications/[id]`
- **Storage:**
  - `POST /api/storage/property-images`: Upload foto properti ke Supabase Storage (validasi magic bytes PNG/JPEG/WebP, max 5MB).
  - `DELETE /api/storage/property-images/[id]`: Hapus foto dari storage dan database.

---

## 7. Status Integrasi Google OAuth (PENTING)
- **Status di Kode:** Kode frontend dan backend callback sudah 100% siap menangani OAuth via `supabase.auth.signInWithOAuth({ provider: 'google', ... })`.
- **Status di Supabase Cloud:** Saat ini Google Provider di Supabase Dashboard masih berstatus nonaktif:
  ```json
  {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
  ```
- **Tindakan yang Dibutuhkan:** User perlu menyalakan toggle Google di Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Providers $\rightarrow$ Google dan mengisi Client ID & Client Secret dari Google Cloud Console.

---

## 8. Verifikasi & Command Operasional
Proyek berada dalam status bersih, lolos build dan test:
- `npm run typecheck` $\rightarrow$ Clean (0 error)
- `npm test` $\rightarrow$ 20 unit tests passed (`src/server/*.test.ts`)
- `npm run lint` $\rightarrow$ 0 error (18 warning bawaan Next/Image)
- `npm run build` $\rightarrow$ 145 route (static & dynamic) compiled sukses
- Git branch: `main` (semua commit telah ter-push ke `origin/main`)

### Perintah Berguna:
- Menjalankan dev server:
  ```bash
  node node_modules/next/dist/bin/next dev -p 3000
  # atau
  npm run dev
  ```
- Menjalankan migrasi prisma:
  ```bash
  npm run prisma:deploy
  ```
- Menjalankan seed data:
  ```bash
  npm run prisma:seed
  ```
- Menjalankan test:
  ```bash
  npm test
  ```
