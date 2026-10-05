# Handover & Progress Tracking — NgeKos

Dokumen ini adalah buku operan tugas antar AI Agent (Antigravity, Claude, Cursor, Windsurf, dsb).
Setiap agent yang masuk wajib membaca dokumen ini, dan wajib memperbaruinya sebelum sesi berakhir.

---

## 📌 Status Terakhir (Snapshot)
- **Terakhir Diperbarui:** 2026-10-05
- **Branch Git:** `main`
- **Status Build & Test:**
  - `npm run typecheck` → Clean (0 error)
  - `npm test` → 54 unit tests pass (`src/server/*.test.ts`)
  - `npm run lint` → 203 masalah pre-existing (0 di file yang diubah)

> ✅ **F-01 / F-02 / F-03 SUDAH DIPERBAIKI (2026-10-05).** Cookie sesi `nk_session` kini
> bertanda tangan HMAC-SHA256 dan **tidak lagi memuat `role`/`adminRole`**; role selalu
> dibaca dari database/store. CSRF ditutup lewat validasi Origin di `withApi`.
> Cookie ADMIN palsu kini 401. Laporan: [security_best_practices_report.md](security_best_practices_report.md).
>
> ⚠️ **TINDAKAN WAJIB SEBELUM PRODUKSI:** isi `SESSION_SECRET` di `.env.local`
> (`openssl rand -base64 48`). Saat ini diturunkan dari `SUPABASE_SECRET_KEY`, jadi rotasi
> secret itu akan mematikan seluruh sesi.
>
> ⚠️ **MASIH TERBUKA:** F-04 (tanpa security header/CSP), F-05 (password demo plaintext),
> F-06 (tanpa rate limit), F-07 (webhook Telegram), F-08 (`/api/geocode` tanpa auth).

---

## 🚀 Fitur & Modul yang Baru Selesai
1. **Multi-Agent Context & Handover System:**
   - [AGENTS.md](file:///home/spawn2pwn/Project/ngekost-v3/ngekost/AGENTS.md), [HANDOVER.md](file:///home/spawn2pwn/Project/ngekost-v3/ngekost/HANDOVER.md), [CLAUDE.md](file:///home/spawn2pwn/Project/ngekost-v3/ngekost/CLAUDE.md), dan [.cursorrules](file:///home/spawn2pwn/Project/ngekost-v3/ngekost/.cursorrules) telah disinkronkan ke [NGEKOST_CONTEXT_BLUEPRINT.md](file:///home/spawn2pwn/Project/ngekost-v3/ngekost/NGEKOST_CONTEXT_BLUEPRINT.md).
2. **Integrasi Telegram Bot Dua Arah:**
   - Webhook handler: `src/app/api/webhooks/telegram/route.ts`
   - Owner telegram link/bind: `/api/owner/telegram/connect`, `/api/owner/telegram/bind-manual`, `/api/owner/telegram/disconnect`
   - Percakapan real-time owner $\leftrightarrow$ pencari kos via Telegram.
3. **Backend API Endpoints Lengkap:**
   - Auth (`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/me`)
   - Properties & Kamar (`/api/properties`, `/api/properties/[id]/rooms`, dsb)
   - Booking & Invoice manual
   - Upload gambar ke Supabase Storage (`/api/storage/property-images`)
4. **Layout Halaman Login & Navbar:**
   - Modal role-selection di navbar ("Pencari Kos" vs "Pemilik Kos")
   - Halaman `/login` dan `/register` split-screen bersih tanpa navbar/footer global.

---

## ⏳ Task yang Sedang Berjalan / Next Steps (Rekomendasi untuk Agent Berikutnya)
- [ ] **Koneksi UI Dashboard Owner ke Telegram:**
  - Hubungkan tombol "Hubungkan Akun Telegram" di halaman profil/pengaturan owner dengan endpoint `/api/owner/telegram/connect` atau `/api/owner/telegram/bind-manual`.
- [ ] **End-to-End Test Alur Booking & Invoicing Manual:**
  - Verifikasi alur saat user mengajukan sewa $\rightarrow$ owner approve $\rightarrow$ kamar otomatis ter-reserve $\rightarrow$ invoice dibuat dan dibayar manual.
- [ ] **Aktivasi Google OAuth di Supabase Cloud (Menunggu User):**
  - Kode frontend dan callback sudah siap. User perlu mengaktifkan toggle Google di Dashboard Supabase jika ingin login via Google berfungsi.

---

## ⚠️ Catatan Penting & Blockers
- **MIDTRANS DITAHAN:** Jangan pasang payment gateway Midtrans sebelum diminta eksplisit oleh user. Flow pembayaran saat ini murni manual invoicing.
- **UI/FRONTEND JANGAN DIROMBAK:** Desain warm cream (`#F4F3EF`), accent (`#3A2618`), dan layout yang ada sudah baku. Jangan diubah-ubah.

---

## 📝 Format Pembaruan untuk AI Agent
Saat Anda (agent) selesai mengerjakan sebuah tugas, perbarui file ini:
1. Pindahkan item dari **Next Steps** ke **Fitur & Modul yang Baru Selesai**.
2. Cantumkan perubahan file penting yang telah dilakukan.
3. Tuliskan langkah selanjutnya yang logis untuk dikerjakan.
