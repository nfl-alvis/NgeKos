# NgeKos 🏠

> Platform modern marketplace dan manajemen sewa kos di Indonesia. Menghubungkan pencari kos dengan pemilik kos melalui informasi listing terverifikasi, alur pengajuan sewa transparan, dan sistem manajemen properti terpadu.

---

## 🌟 Fitur Utama

### 🔍 Untuk Pencari Kos (Seeker)
- **Katalog & Pencarian Akurat:** Filter berdasarkan kota, rentang harga sewa bulanan, gender (Putra, Putri, Campur), dan fasilitas.
- **Informasi Properti Lengkap:** Galeri foto resolusi tinggi (tampak depan, kamar, kamar mandi, area bersama), tipe kamar, ketersediaan unit, fasilitas, dan jarak ke kampus terdekat.
- **Alur Pengajuan Sewa Digital:** Pengajuan booking transparan dengan pemilihan tipe kamar, tanggal mulai sewa, durasi sewa, serta rincian biaya sewa dan deposit.
- **Dashboard Penyewa:** Monitoring status hunian, riwayat tagihan & pembayaran, kontrak sewa aktif, serta pengumuman dari pengelola kos.

### 🏢 Untuk Pemilik Kos (Owner)
- **Manajemen Properti & Kamar:** Kelola daftar kos, konfigurasi tipe kamar, penetapan tarif sewa bulanan, dan status unit kamar (Tersedia, Terisi).
- **Pengelolaan Pengajuan Masuk:** Tinjau dan setujui permohonan booking calon penyewa secara langsung.
- **Invoicing & Tagihan:** Manajemen tagihan sewa berkala dan pelacakan status pembayaran penyewa.
- **Statistik & Okupansi:** Metrik tingkat hunian kamar, pendapatan bulanan, dan ringkasan operasional properti.

### 🛡️ Untuk Administrator
- **Verifikasi Properti:** Tinjau kelayakan listing kos baru sebelum tayang secara publik di platform.
- **Manajemen Pengguna:** Pengawasan direktori pengguna (Pencari Kos & Pemilik Kos).
- **Audit Platform:** Pemantauan statistik listing aktif dan analitik operasional.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Bahasa:** [TypeScript 5](https://www.typescriptlang.org/)
- **Database & ORM:** PostgreSQL ([Supabase](https://supabase.com/)) via [Prisma ORM](https://www.prisma.io/)
- **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), Base UI (`@base-ui/react`), Radix UI Primitives, Lucide Icons
- **Internasionalisasi (i18n):** [next-intl](https://next-intl-docs.vercel.app/) (Bahasa Indonesia `id` default & Bahasa Inggris `en`)
- **Validasi Data:** [Zod](https://zod.dev/)
- **Pengujian:** [Vitest](https://vitest.dev/)

---

## 📁 Struktur Direktori

```text
ngekost/
├── prisma/               # Skema database Prisma, migrasi, dan skrip seeding
├── public/               # Aset statis publik (logo, ikon, gambar kampus)
├── src/
│   ├── app/              # Next.js App Router (rute halaman & API handlers)
│   │   ├── [locale]/     # Halaman aplikasi dengan dukungan multi-bahasa
│   │   │   ├── admin/    # Dashboard administrator
│   │   │   ├── kost/     # Halaman katalog & detail kos
│   │   │   ├── owner/    # Dashboard pemilik kos
│   │   │   └── tenant/   # Dashboard penyewa aktif
│   │   └── api/          # REST API endpoints (auth, properties, bookings, dll)
│   ├── components/       # Komponen UI, dialog, form, dan layout
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Konfigurasi routing & request next-intl
│   ├── lib/              # Utilitas data, konfigurasi prisma, dan helper
│   ├── messages/         # Kamus terjemahan (id.json & en.json)
│   └── server/           # Logika bisnis backend, service layer, dan unit test
└── package.json
```

---

## 🚀 Memulai (Getting Started)

### 1. Prasyarat
- **Node.js:** Versi 20.x atau 22.x
- **NPM:** Versi 10.x ke atas
- Database **PostgreSQL** aktif (misal: Supabase)

### 2. Instalasi Dependensi
```bash
git clone https://github.com/nfl-alvis/NgeKos.git
cd NgeKos
npm install
```

### 3. Konfigurasi Environment
Salin file konfigurasi contoh:
```bash
cp .env.example .env.local
```
Sesuaikan variabel environment di dalam `.env.local`:
```env
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:port/database"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Database Setup & Seed
Generate Prisma Client dan jalankan seeding data awal:
```bash
npm run prisma:generate
npm run prisma:seed
```

### 5. Jalankan Development Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🧪 Skrip Operasional

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Next.js development server (Turbopack) |
| `npm run build` | Membuat production build aplikasi |
| `npm run start` | Menjalankan production server |
| `npm run typecheck` | Memeriksa integritas tipe TypeScript (`tsc --noEmit`) |
| `npm test` | Menjalankan seluruh rangkaian unit test dengan Vitest |
| `npm run prisma:seed` | Mengisi database dengan data kos terverifikasi |

---

## 📄 Lisensi
Proyek ini dikembangkan untuk platform manajemen dan reservasi properti sewa kos NgeKos.
