# Daftar Endpoint NgeKos

Dokumen ini menginventaris endpoint aplikasi berdasarkan source di `src/app`.

## Konvensi

- `{locale}` bernilai `id` atau `en`.
- Contoh `/{locale}/dashboard` tersedia sebagai `/id/dashboard` dan `/en/dashboard`.
- `/` otomatis diarahkan ke `/id` oleh proxy `next-intl`.
- Mayoritas operasi dashboard masih memakai data demo, state React, atau `sessionStorage`; belum disimpan ke backend permanen.

## Ringkasan

| Kelompok | Jumlah |
|---|---:|
| Halaman publik, autentikasi, blog, kos, legal, booking, dan fallback | 18 |
| Dashboard pengguna biasa | 7 |
| Dashboard tenant | 9 |
| Dashboard owner | 10 |
| Panel admin | 18 |
| API | 1 |
| Metadata/SEO | 2 |
| **Total template endpoint** | **65** |

## 1. Halaman publik dan autentikasi

### 1. `/{locale}`

Beranda NgeKos: hero pencarian, kos terverifikasi unggulan, kota/kampus populer, statistik, dan FAQ singkat.

Pencarian hero dapat menghasilkan query `kota`, `q`, `lat`, dan `lon`. Saat ini halaman `/kost` baru memproses `kota`; `q`, `lat`, dan `lon` belum memengaruhi hasil listing.

### 2. `/{locale}/about`

Profil NgeKos, manfaat platform, fitur utama, dan CTA mencari kos atau menjadi mitra.

### 3. `/{locale}/bantuan`

Pusat bantuan dengan pencarian topik, kategori, accordion, kontak WhatsApp, dan email.

### 4. `/{locale}/faq`

FAQ terkait booking, pembayaran, pemilik kos, dan penggunaan platform.

### 5. `/{locale}/mitra`

Landing page calon owner/pengelola kos: manfaat, proses onboarding, statistik, CTA login owner, dan dashboard owner.

### 6. `/{locale}/karir`

Daftar lowongan dan proses rekrutmen. Tombol lamaran membuka email dengan subject jabatan yang dipilih.

### 7. `/{locale}/login`

Login demo pencari atau owner.

- `?role=owner` memilih mode owner.
- Tanpa query memilih mode pencari kos.
- Owner diarahkan ke `/owner`.
- Pencari diarahkan ke `/dashboard`.

### 8. `/{locale}/register`

Pendaftaran pengguna.

- `?role=owner` membuka wizard owner: WhatsApp → OTP demo → profil → properti pertama → sukses.
- Default membuka formulir pencari kos.
- Form pencari masih simulasi dan belum terhubung API.

## 2. Listing dan detail kos

### 9. `/{locale}/kost`

Listing properti aktif dan terverifikasi.

Query yang diproses:

- `kota={nama-kota}`
- `max={harga-maksimal}`
- `fas={fasilitas}` - boleh berulang
- `gender=mixed|male|female`
- `sort=rating|price-asc|price-desc`

Contoh:

```text
/id/kost?kota=Bandung&max=1500000&gender=female&sort=price-asc
```

### 10. `/{locale}/kost/{slug}`

Detail properti: galeri, alamat, rating, harga, fasilitas, tipe kamar, ketersediaan, DP/deposit, dan CTA booking. Slug tidak ditemukan menghasilkan 404.

### 11. `/{locale}/kost/{slug}/book`

Wizard pengajuan sewa: pilih kamar, tanggal mulai, durasi, data penyewa, konfirmasi, simulasi sukses, dan kontak owner melalui WhatsApp.

Query:

- `kamar={roomId}`
- `tanggal=YYYY-MM-DD`
- `bulan=1|3|6|12`

Contoh:

```text
/id/kost/kost-griya-cemara-dago/book?kamar=room-1&tanggal=2026-10-01&bulan=12
```

Pengiriman booking masih simulasi dan belum menambah data permanen.

## 3. Blog

### 12. `/{locale}/blog`

Indeks artikel dengan filter kategori client-side.

### 13. `/{locale}/blog/{slug}`

Detail artikel berdasarkan slug. Slug tidak dikenal menghasilkan 404.

Slug saat ini:

- `ceklist-aman-sewa-kost-pertama`
- `kost-vs-apartemen-hitung-biaya`
- `etika-tetangga-kos`
- `negosiasi-harga-sewa`
- `dekorasi-kamar-sewa`
- `keamanan-kos-tips`

### 14. `/{locale}/blog/kategori/{kategori}`

Daftar artikel berdasarkan kategori.

Kategori Indonesia: `Panduan`, `Keuangan`, `Gaya Hidup`, `Keamanan`.

Kategori Inggris: `Guides`, `Money`, `Lifestyle`, `Safety`.

Kategori tidak dikenal menghasilkan halaman kosong dengan status 200.

## 4. Legal

### 15. `/{locale}/legal/syarat-ketentuan`

Dokumen syarat dan ketentuan.

### 16. `/{locale}/legal/privasi`

Dokumen kebijakan privasi.

Template internalnya adalah `/{locale}/legal/{doc}`. Nilai selain dua dokumen tersebut menghasilkan 404.

## 5. Booking pengguna

### 17. `/{locale}/bookings`

Deep-link lama untuk Booking Saya: booking aktif, riwayat, filter semua/aktif/selesai, countdown pembayaran, detail, timeline, dan tombol bayar. Fitur yang sama juga tersedia pada `/dashboard/bookings`.

### 18. `/{locale}/bookings/{id}/bayar`

Simulasi pembayaran booking: ringkasan transaksi, countdown, metode Midtrans, pembayaran DP 35% atau satu bulan penuh, serta modal sukses. ID tidak ditemukan menampilkan pesan inline, bukan HTTP 404.

## 6. Dashboard pengguna biasa

### 19. `/{locale}/dashboard`

Dashboard pencari kos: statistik booking, favorit, pembayaran pending, ulasan, kos aktif, booking aktif, status pembayaran, aktivitas, rekomendasi, dan shortcut ke dashboard tenant.

### 20. `/{locale}/dashboard/bookings`

Proses booking aktif dan seluruh riwayat booking.

### 21. `/{locale}/dashboard/favorites`

Daftar kos favorit dan aksi menambah/menghapus favorit.

### 22. `/{locale}/dashboard/payments`

Transaksi booking dengan status pending, berhasil, gagal, atau refund.

### 23. `/{locale}/dashboard/reviews`

Ulasan milik pengguna: melihat, mengedit, dan menulis review untuk kos yang memenuhi syarat.

### 24. `/{locale}/dashboard/profile`

Profil pengguna: nama, telepon, tempat lahir, pekerjaan, aktivitas akun, status tenant, dan shortcut ke tenant dashboard. Penyimpanan masih simulasi.

### 25. `/{locale}/dashboard/settings`

Preferensi notifikasi, form perubahan password, dan area hapus akun. Preferensi masih state lokal; hapus akun belum terhubung handler.

## 7. Dashboard tenant

### 26. `/{locale}/tenant`

Redirect kompatibilitas route lama menuju `/{locale}/tenant/dashboard`.

### 27. `/{locale}/tenant/dashboard`

Dashboard penyewa aktif: kos/kamar yang ditempati, sewa bulanan, tagihan, sisa kontrak, pesan belum dibaca, aksi cepat, riwayat tagihan, grafik, pesan owner, fasilitas, dan riwayat perjanjian.

### 28. `/{locale}/tenant/property`

Detail Kos Saya: properti, alamat, kamar, masa sewa, fasilitas, kontak/WhatsApp owner, area sekitar, dan tautan halaman publik.

### 29. `/{locale}/tenant/room`

Detail Kamar Saya: nomor, tipe, lantai, ukuran, orientasi, fasilitas kamar, area bersama, pengaduan, dan kontrak.

### 30. `/{locale}/tenant/contract`

Kontrak sewa: periode, harga, deposit, durasi, ketentuan perpanjangan, riwayat, peraturan kos, pembayaran lunas, dan unduh ringkasan `.txt`.

### 31. `/{locale}/tenant/bills`

Tagihan berikutnya, total outstanding, riwayat invoice, aksi bayar, sinkronisasi status lintas halaman, dan pencatatan aktivitas pembayaran.

### 32. `/{locale}/tenant/payments`

Riwayat pembayaran sewa: metode, tanggal, nominal, status, total, rata-rata, dan ekspor CSV.

### 33. `/{locale}/tenant/complaints`

Daftar dan pembuatan pengaduan, kategori, detail masalah, catatan owner, serta stepper status:

```text
OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
```

### 34. `/{locale}/tenant/announcements`

Daftar pengumuman owner secara kronologis, waktu relatif, dan aksi tandai sudah dilihat.

## 8. Dashboard owner

### 35. `/{locale}/owner`

Dashboard owner: pendapatan, okupansi, tunggakan, booking baru, properti terbaik, booking pending, grafik, ulasan, aktivitas, performa properti, dan ekspor booking CSV.

### 36. `/{locale}/owner/bookings`

Booking masuk: filter status, detail pemohon/kamar/timeline/pembayaran, setujui, atau tolak dengan alasan.

### 37. `/{locale}/owner/invoices`

Pengelolaan tagihan tenant: ringkasan belum lunas, tunggakan, filter, tandai lunas, dan buat invoice manual. Perubahan masih state halaman.

### 38. `/{locale}/owner/messages`

Inbox owner: pencarian percakapan, thread, kirim pesan, template pesan, dan hapus percakapan.

### 39. `/{locale}/owner/notifications`

Notifikasi booking, pembayaran, langganan, tandai terbaca, dan tandai semua terbaca.

### 40. `/{locale}/owner/properties`

Daftar properti owner: status verifikasi, lokasi, jumlah kamar, okupansi, detail properti, dan batas paket trial.

### 41. `/{locale}/owner/properties/{slug}`

Detail pengelolaan properti: informasi/status verifikasi, tipe/unit kamar, serta perubahan status kamar menjadi kosong atau maintenance. Tab foto dan pengaturan masih placeholder. Slug tidak dikenal menampilkan teks 404 di dalam shell, bukan HTTP 404.

### 42. `/{locale}/owner/tenants`

Daftar tenant: filter properti/status pembayaran, detail kontak, perjanjian, invoice, dan shortcut pesan.

### 43. `/{locale}/owner/subscription`

Status dan pilihan paket, perbandingan fitur, ganti paket, batalkan langganan, dan grace period.

### 44. `/{locale}/owner/settings`

Profil owner, email Google read-only, pemilihan bahasa, dan simulasi penyimpanan.

## 9. Panel admin

### 45. `/{locale}/admin`

Dashboard admin: pendapatan, booking, okupansi, pengguna, grafik fee, properti populer, antrean verifikasi, transaksi terbaru, dan aksi cepat.

### 46. `/{locale}/admin/login`

Login admin demo melalui pemilih akun Google. Akun admin diarahkan ke `/admin/verification`; akun non-admin menampilkan error.

### 47. `/{locale}/admin/verification`

Antrean verifikasi properti: statistik, pencarian, pengurutan, detail, setujui, dan tolak dengan alasan.

### 48. `/{locale}/admin/verification/history`

Riwayat keputusan verifikasi: filter, pencarian, detail keputusan, admin pemroses, dan alasan penolakan.

### 49. `/{locale}/admin/properties`

Moderasi properti: pencarian, filter, buka halaman publik, nonaktifkan, aktifkan kembali, dan hapus dengan alasan.

### 50. `/{locale}/admin/rooms`

Monitoring status kamar per properti: kosong, terisi, dipesan, dan maintenance. Belum tersedia aksi perubahan status.

### 51. `/{locale}/admin/owners`

Pengelolaan owner: pencarian, filter status, tangguhkan, dan aktifkan kembali akun.

### 52. `/{locale}/admin/users`

Pengelolaan pencari kos: pencarian, filter kota, blokir, dan pulihkan akun.

### 53. `/{locale}/admin/bookings`

Monitoring booking: statistik, pemesan, properti, kamar, tanggal mulai, harga, status, pencarian, dan filter.

### 54. `/{locale}/admin/payments`

Monitoring transaksi Midtrans: ID transaksi/booking, pembayar, properti, metode, nominal, fee, status, dan waktu.

### 55. `/{locale}/admin/refunds`

Penanganan refund: tab diajukan/disetujui/ditolak, statistik terbuka, setujui, tolak, dan pencatatan keputusan.

### 56. `/{locale}/admin/reports`

Moderasi laporan properti, pengguna, review, dan konten; pencarian/filter; tandai selesai atau abaikan.

### 57. `/{locale}/admin/reviews`

Moderasi ulasan: statistik laporan/rating, filter ulasan ditandai, sembunyikan, dan tampilkan kembali.

### 58. `/{locale}/admin/finance`

Laporan keuangan: gross YTD, fee, settlement, refund, grafik gross/fee, distribusi metode, dan rentang 6/12 bulan.

### 59. `/{locale}/admin/content`

Ringkasan banner, kota populer, FAQ, dokumen kebijakan, dan status publikasi. Saat ini baca-saja.

### 60. `/{locale}/admin/notices`

Broadcast pengumuman untuk owner, pencari, atau semua pengguna; estimasi penerima, riwayat, dan validasi judul/isi.

### 61. `/{locale}/admin/admins`

Daftar akun admin, role, status, aktivitas terakhir, dan perubahan role menjadi `super`, `verifikator`, `keuangan`, atau `dukungan`. Halaman belum benar-benar memeriksa role super-admin sebelum menampilkan aksi.

### 62. `/{locale}/admin/audit`

Audit log dengan pencarian, filter kelompok operasi, dan ekspor CSV.

## 10. API

### 63. `GET /api/geocode`

Proxy server-side untuk autocomplete Geoapify agar API key tidak dikirim ke browser.

Query:

- `text` - minimal dua karakter
- `type` - opsional

Perilaku:

- Teks kosong/terlalu pendek → `{ "features": [] }`
- Memerlukan `GEOAPIFY_API_KEY`; jika tidak tersedia → HTTP 500
- Maksimal enam hasil, bias Indonesia, bahasa Indonesia
- Error upstream mempertahankan status Geoapify
- Tidak ada handler POST, PUT, PATCH, atau DELETE

## 11. Metadata dan SEO

### 64. `/robots.txt`

Mengizinkan crawl secara umum dan melarang:

- `/id/admin/`, `/en/admin/`
- `/id/owner/`, `/en/owner/`
- `/id/bookings/`, `/en/bookings/`

Catatan: `/dashboard` dan `/tenant` belum tercantum dalam `disallow`.

### 65. `/sitemap.xml`

Sitemap otomatis untuk halaman publik, listing/detail properti, artikel blog, dan kedua locale. Saat ini seluruh properti ikut dimasukkan, termasuk properti nonaktif atau belum terverifikasi.

## 12. Redirect, fallback, dan error handling

### `/`

Redirect locale default menuju `/id`.

### URL tanpa locale

Proxy `next-intl` menambahkan prefix locale.

### `/{locale}/{...rest}`

Catch-all untuk URL locale yang tidak dikenal dan menghasilkan 404.

### Locale selain `id` atau `en`

Menghasilkan 404 dari layout locale.

### `not-found.tsx`

Halaman 404 global.

### `error.tsx`

Error boundary dengan tombol mencoba lagi dan kembali ke beranda.

## 13. Catatan implementasi

1. Dashboard user, tenant, owner, dan admin belum memiliki guard autentikasi aktif agar dapat diakses langsung untuk demo/QA.
2. Banyak aksi masih berupa simulasi client-side atau `sessionStorage`, bukan database.
3. Listing `/kost` belum memproses query `q`, `lat`, dan `lon` yang dibuat pencarian beranda.
4. `robots.txt` belum memblokir `/dashboard` dan `/tenant`.
5. Sitemap memasukkan properti nonaktif/belum terverifikasi.
6. Beberapa halaman menampilkan pesan inline alih-alih HTTP 404, termasuk ID booking tidak dikenal dan slug owner property tidak dikenal.
