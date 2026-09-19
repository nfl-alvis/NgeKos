# Penjelasan DFD - Sistem Ngekost

**File drawio:** `DFD-Ngekost.drawio` (2 halaman / tab)
**Generator:** `gen_dfd_ngekost.py` - data-driven, regenerate jangan edit XML manual
**Sumber:** PRD-Ngekost-FULL.md v3.5/v3.6, API.md v3.5, DATABASE.md v3.5, rute `src/app/[locale]` repo ngekost-v3
**Notasi:** Yourdon/DeMarco - kotak = entitas eksternal, elips biru = proses, kotak hijau terbuka (stored-data) = data store, panah berlabel = alur data.

---

## HALAMAN 1 - DFD Context (Level 0)

Satu proses tunggal `0 SISTEM NGEKOST` dikelilingi 10 lingkungan luar.

### Entitas internal (pengguna, kiri)

| Entitas | Alur masuk ke sistem | Alur keluar dari sistem |
|---|---|---|
| Owner (pemilik kost) | data registrasi & login, data kost/kamar, keputusan booking, langganan | hasil verifikasi, booking masuk, invoice, notifikasi |
| Guest (pencari kost) | pencarian & filter kost, data pengajuan booking | hasil pencarian, status booking, instruksi bayar |
| Tenant (penyewa aktif) | konfirmasi bayar tagihan bulanan, chat balik | invoice, pengingat menunggak, chat owner |
| Admin (verifikasi) | keputusan approve / reject property | antrean verifikasi (property pending) |

Sesuai enum `ActorType` di DATABASE.md (OWNER | GUEST | SYSTEM) plus Admin sebagai aktor internal halaman `admin/verification` yang ada di v3.

### Sistem eksternal (kanan)

| Sistem | Dipakai untuk | Endpoint / bukti di kode |
|---|---|---|
| Google OAuth | login/register Guest & Tenant (PKCE + state) | `src/components/GoogleButton.tsx`, API `/api/auth` |
| Geoapify | autocomplete pencarian lokasi | `src/app/api/geocode/route.ts` (proxy, kunci server-side) |
| Midtrans | pembayaran booking (DP / full) + webhook | `POST /api/bookings/:id/payment`, `POST /api/webhooks/midtrans/booking` |
| Telegram Bot | notifikasi & two-way messaging | model `TelegramConnection`, `Message` (channel TELEGRAM) |
| Email / SMTP | notifikasi & messaging channel kedua | enum `MessageChannel` EMAIL |

---

## HALAMAN 2 - DFD Level 1

8 proses + 6 data store. Nomor proses dirujuk dari tahap DATABASE.md (Stage 1–9).

### Proses

| Proses | Menjelaskan | Endpoint/API utama | Tulis ke | Baca dari |
|---|---|---|---|---|
| 1.0 Autentikasi & Registrasi | login email+password (bcrypt) Owner; login Google Guest/Tenant | `/api/auth/me` | D1 | D1 |
| 2.0 Cari & Filter Kost | listing publik (hanya `verified && active`), filter fasilitas/harga/gender/lokasi | `GET /api/public/properties` + `/api/geocode` | - | D2 |
| 3.0 Ajukan Booking | wizard 3 langkah (kamar → data penyewa → konfirmasi biaya), butuh akun Google | `POST /api/bookings` | D3 | D2 |
| 4.0 Keputusan Booking | owner approve/reject, TANPA gating subscription (v3.5); approve = BookingRequest→WAITING_PAYMENT + Room→BOOKING_PENDING satu transaksi | `POST /api/owner/bookings/:id/approve`, `/reject` | D2 (Room), D3 | D3 |
| 5.0 Tagihan Bulanan | dibuat saat FULLY_PAID: konversi Guest→Tenant + Invoice bulanan + RentalAgreement | `GET /api/invoices` | D4 | D3 |
| 6.0 Kelola Property | owner tambah/ubah/hapus property, room type, kamar (dibatasi limit tier); admin putuskan verifikasi | `POST/PATCH/DELETE /api/properties`, `/api/rooms` | D2, D5 | D5 |
| 7.0 Bayar Booking (Midtrans) | create transaksi (DP/final/full), retry selama paymentDeadline, expire via cron | `POST /api/bookings/:id/payment`, webhook midtrans | D3 | D3 |
| 8.0 Notifikasi & Pesan | broadcast notifikasi booking/pembayaran/overdue + chat dua arah Telegram/Email, catat ActivityLog | `POST /api/messages`, `GET /api/notifications`, `GET /api/activity-log` | D6 | D4, D6 |

### Data store (pemetaan ke 17 model DATABASE.md)

| Store | Model Prisma |
|---|---|
| D1 User & Guest | `User`, `Guest` |
| D2 Property, RoomType, Room | `Property`, `PropertyPhoto`, `RoomType`, `Room`, `DownPaymentPolicyType` |
| D3 BookingRequest & Payment | `BookingRequest`, `Payment` |
| D4 Tenant, Invoice, Agreement | `Tenant`, `Invoice`, `RentalAgreement` |
| D5 Subscription & Plan | `Subscription`, `SubscriptionPlan` |
| D6 Message, Notif, ActivityLog | `Message`, `MessageTemplate`, `Notification`, `TelegramConnection`, `ActivityLog` |

`Cron Expire Booking` (lingkungan sistem, kanan atas) memicu proses 7.0 memeriksa `paymentDeadline` yang lewat → Booking `EXPIRED`, Room kembali `VACANT`.

---

## Aturan bisnis yang membentuk diagram

1. **Listing publik ter-filter** - 2.0 hanya membaca D2 baris `verified=true AND active=true` (PRD v3.6); karena itu ada panah 6.0→admin approval sebelum kost muncul di pencarian.
2. **Tanpa subscription gate pada approve** (revisi v3.5) - 4.0 tidak membaca D5; gating subscription hanya membatasi 6.0 (kuota property/kamar).
3. **Sync Room ↔ BookingRequest wajib atomic** (v3.4) - digambar sebagai dua panah tulis 4.0→D2 dan 4.0→D3 dengan label status.
4. **Konversi Guest→Tenant hanya di FULLY_PAID** - panah 7.0→5.0, bukan 7.0→D4 langsung; DP_PAID/WAITING_SETTLEMENT masih domain D3.
5. **Payment FAILED ≠ booking batal** - retry membuat Payment baru oleh 7.0 selama deadline; dicatat oleh webhook/cron, bukan panah actor.

## Cara regenerate

```bash
cd docs/diagram
python3 gen_dfd_ngekost.py          # DFD-Ngekost.drawio
python3 gen_activity_ngekost.py     # Activity-Ngekost.drawio
# cek cepat layout (butuh venv cairosvg):
python3 preview_svg.py DFD-Ngekost.drawio /tmp/dfd_prev
```
