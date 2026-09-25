# Penjelasan Activity Diagram - Sistem NgeKos (Sisi Pengguna)

**File drawio:** `Activity-NgeKos.drawio` (11 halaman / tab)
**Generator:** `gen_activity_ngekost.py` - data-driven, regenerate jangan edit XML manual
**Sumber:** PRD-NgeKos-FULL.md, API.md, DATABASE.md, skema database NgeKos
**Format layout:** swimlane vertikal hitam-putih, konsisten dengan standar UML
**Total:** 11 halaman, 189 vertex, 160 edge - semua lolos validator struktural (tanpa duplicate ID, tanpa dangling edge, tanpa node orphan).

> [!NOTE]
> Diagram ini difokuskan secara khusus pada alur pengguna biasa (Pencari Kos / Guest dan Penyewa / Tenant). Alur persetujuan atau penolakan booking oleh pemilik kos dan verifikasi administratif oleh admin sengaja ditiadakan agar diagram merepresentasikan pengalaman interaksi pengguna seutuhnya.

---

## Daftar Halaman

| # | Nama Tab | Lane | Use case / halaman terkait |
|---|---|---|---|
| 1 | Registrasi & Verifikasi OTP Email | User, Sistem, Resend | `register`, `auth/verify-otp`, `api/auth/register`, `api/auth/verify-otp` |
| 2 | Login Akun Pengguna | User, Sistem, Google | `login`, `api/auth/login`, `api/auth/google` |
| 3 | Cari & Filter Kost (Listing Publik) | User, Sistem | `kost` (katalog publik, filter harga, fasilitas, lokasi) |
| 4 | Detail Kos & Simpan Favorit | User, Sistem | `kost/[slug]`, `dashboard/favorites`, `api/me` |
| 5 | Ajukan Booking Sewa Kost | User, Sistem | `kost/[slug]/book`, `api/bookings` |
| 6 | Bayar Booking Sewa (Midtrans) | User, Sistem, Midtrans | `dashboard/bookings/[id]/pay`, Midtrans Snap |
| 7 | Konfirmasi Pembayaran & Status Tenant | Midtrans, Sistem, Tenant | `api/webhooks/midtrans`, `tenant/dashboard` |
| 8 | Bayar Tagihan Sewa Bulanan | Tenant, Sistem, Midtrans | `tenant/bills`, `api/payments/midtrans/charge` |
| 9 | Pengaduan Keluhan Kamar | Tenant, Sistem | `tenant/complaints`, `api/tenant/complaints` |
| 10 | Beri Ulasan dan Rating Kos | Tenant, Sistem | `kost/[slug]`, `tenant/dashboard`, `api/reviews` |
| 11 | Laporkan Kos Bermasalah | User, Sistem | `kost/[slug]`, `api/reports` |

---

## Notasi Visual

| Bentuk | Makna |
|---|---|
| Elips hitam penuh | Initial node (mulai) |
| Elips putih tebal | Final node (selesai) |
| Persegi rounded | Action / activity |
| Belah ketupat (rhombus) | Decision node, keluar dengan label `Ya` / `Tidak` / `[kondisi]` |
| Garis vertikal tipis | Pembatas lane |
| Batang hitam tebal horizontal | Fork/join node - aksi database dan pembaruan antarmuka paralel |
| Panah lewat sisi kanan | Jalur error / retry / kembali ke langkah sebelumnya |

## Aturan Layout

1. **Fork = 1 masuk, 2 keluar:** Aksi penulisan ke database berjalan bersamaan dengan pembaruan status / antarmuka pengguna di lane Sistem.
2. **Bar fork/join selalu di lane Sistem**, di bawah action, bentuk batang horizontal (`rotation=90`).
3. **Final node (elips putih) selalu di lane Sistem**, memastikan proses penutupan tercatat di sistem.
4. **Guard label format `[kondisi]`** sebagai label transisi yang jelas.
5. **Initial node selalu di lane aktor pemula**, mencerminkan aksi yang diinisiasi oleh pengguna atau pihak terkait.
6. **Setiap jalur yang berakhir di final node melewati action tampilan hasil** di lane Sistem lebih dulu.
7. Semua hitam-putih tanpa warna agar siap dicetak pada dokumen formal laporan.

---

## HALAMAN 1 - Registrasi & Verifikasi OTP Email

Lane: **User**, **Sistem**, **Resend**.
Endpoint: `POST /api/auth/register`, `POST /api/auth/verify-otp`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman register & isi data diri | User | Mengisi nama, email, nomor handphone, dan kata sandi |
| Submit form pendaftaran | User | Mengirim data ke server |
| Validasi data & generate OTP 8 digit | Sistem | Memeriksa keunikan email dan membuat kode verifikasi 8 digit |
| Kirim email berisi kode OTP 8 digit | Resend | Mengirim email transaksi melalui penyedia layanan Resend |
| Buka email & salin kode OTP | User | Mengambil kode verifikasi dari kotak masuk email |
| Input kode OTP 8 digit di halaman verifikasi | User | Memasukkan kode ke input form verifikasi |
| Validasi kode OTP ke server auth | Sistem | Memeriksa kecocokan kode dan masa kedaluwarsa |
| Decision: kode OTP valid & belum expired? | Sistem | Jika salah/kedaluwarsa, alur kembali ke input OTP. Jika valid, lanjut ke fork |
| Fork: Update akun ACTIVE & Buat session login | Sistem | Status akun diaktifkan di database dan session JWT dibentuk |
| Menampilkan dashboard pengguna | Sistem | Mengarahkan pengguna yang sudah terautentikasi ke dashboard |

---

## HALAMAN 2 - Login Akun Pengguna

Lane: **User**, **Sistem**, **Google**.
Endpoint: `POST /api/auth/login`, `GET /api/auth/google/start`, `GET /api/auth/google/callback`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman login | User | Mengakses halaman `/login` |
| Menampilkan pilihan metode login | Sistem | Menyediakan form email/password dan tombol Google OAuth |
| Decision: pilih metode? | User | Memilih antara kredensial email atau login sekali klik Google |
| Input email & password / Klik tombol Google | User | Menjalankan aksi sesuai opsi yang dipilih |
| Verifikasi kredensial / OAuth callback | Sistem / Google | Autentikasi hash kata sandi atau verifikasi token ID dari Google |
| Decision: kredensial valid? | Sistem | Jika gagal, kembali ke form login dengan pesan kesalahan. Jika sukses, lanjut ke fork |
| Fork: Buat session login & Set cookie JWT | Sistem | Menyimpan sesi pengguna dan memberikan cookie otorisasi |
| Menampilkan halaman beranda / dashboard | Sistem | Mengarahkan pengguna ke halaman tujuan utama |

---

## HALAMAN 3 - Cari & Filter Kost (Listing Publik)

Lane: **User**, **Sistem**.
Endpoint: `GET /api/kost`, `GET /api/properties`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman listing publik | User | Mengakses `/kost` tanpa perlu login |
| Menampilkan katalog kos terverifikasi | Sistem | Menampilkan daftar kos berstatus aktif dan lolos verifikasi |
| Isi filter kota, harga, fasilitas, tipe | User | Memilih preferensi pencarian |
| Query kos sesuai parameter filter | Sistem | Menjalankan pencarian dengan filter dinamis di database |
| Decision: ada hasil cocok? | Sistem | Jika tidak ada hasil, tampilkan pesan kosong dan beri opsi ubah filter. Jika ada, tampilkan kartu kos |
| Pilih salah satu kos yang diminati | User | Memilih kartu kos untuk melihat informasi lengkap |
| Menampilkan halaman detail kos | Sistem | Membuka rincian kos pada rute `/kost/[slug]` |

---

## HALAMAN 4 - Detail Kos & Simpan Favorit

Lane: **User**, **Sistem**.
Endpoint: `GET /kost/[slug]`, `POST /api/me/favorites`, `DELETE /api/me/favorites`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman detail kos | User | Mengakses halaman kos spesifik |
| Menampilkan foto, fasilitas, harga, ulasan | Sistem | Menyajikan informasi komprehensif properti |
| Klik ikon hati (Simpan Favorit) | User | Menandai kos sebagai favorit |
| Cek status login pengguna | Sistem | Memeriksa token otentikasi aktif |
| Decision: sudah login? | Sistem | Jika belum login, tampilkan modal login langsung di tempat. Jika sudah, lanjut ke fork |
| Fork: Simpan kos ke tabel favorites & Ubah ikon | Sistem | Menulis data favorit ke database dan mengubah status visual ikon |
| Menampilkan daftar favorit di dashboard | Sistem | Memperbarui daftar favorit pengguna di `/dashboard/favorites` |

---

## HALAMAN 5 - Ajukan Booking Sewa Kost

Lane: **User**, **Sistem**.
Endpoint: `POST /api/bookings`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Klik Ajukan Sewa & pilih tipe kamar | User | Memulai proses booking dari halaman detail kos |
| Menampilkan formulir pengajuan sewa | Sistem | Menyajikan formulir pemilihan tanggal dan data penghuni |
| Pilih tanggal mulai, durasi & lengkapi data | User | Menentukan periode sewa dan melengkapi identitas |
| Submit pengajuan sewa kos | User | Mengirim data permohonan sewa |
| Validasi ketersediaan kamar & data pemesan | Sistem | Memeriksa apakah kamar masih berstatus VACANT |
| Decision: kamar tersedia? | Sistem | Jika kamar penuh, tampilkan pesan penolakan dan arahkan ke pemilihan kamar lain. Jika tersedia, lanjut ke fork |
| Fork: Buat record Booking PENDING & Ringkasan | Sistem | Merekam data booking baru dan menampilkan rincian biaya sewa |
| Menampilkan status booking diajukan | Sistem | Mengarahkan pengguna ke halaman status booking |

---

## HALAMAN 6 - Bayar Booking Sewa (Midtrans)

Lane: **User**, **Sistem**, **Midtrans**.
Endpoint: `GET /dashboard/bookings/[id]/pay`, `POST /api/payments/midtrans/charge`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman booking & klik Bayar Sekarang | User | Membuka rincian tagihan sewa awal |
| Cek batas waktu bayar (payment deadline) | Sistem | Memverifikasi apakah booking belum melewati batas 24 jam |
| Decision: masih dalam batas waktu bayar? | Sistem | Jika waktu habis, ubah status menjadi expired. Jika masih aktif, generate Snap token |
| Buka popup Snap pembayaran | Midtrans | Memunculkan antarmuka pembayaran multi-channel Midtrans |
| Pilih metode bayar & selesaikan transfer | User | Membayar lewat Virtual Account, QRIS, atau e-Wallet |
| Proses status bayar | Midtrans | Mengevaluasi status pembayaran secara langsung |
| Decision: pembayaran berhasil settlement? | Midtrans | Jika gagal, tampilkan opsi retry. Jika berhasil, kirim notifikasi pembayaran sukses |
| Menampilkan notifikasi pembayaran diterima | Sistem | Mengonfirmasi bahwa dana telah berhasil diverifikasi |

---

## HALAMAN 7 - Konfirmasi Pembayaran & Status Tenant

Lane: **Midtrans**, **Sistem**, **Tenant**.
Endpoint: `POST /api/webhooks/midtrans`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Kirim webhook notifikasi pembayaran settlement | Midtrans | Mengirim payload HTTP POST ke server NgeKos |
| Validasi signature & nominal transaksi | Sistem | Memeriksa keabsahan signature hash Midtrans |
| Decision: data webhook valid? | Sistem | Jika tidak valid, kembalikan response 400 Bad Request. Jika valid, lanjut ke fork |
| Fork: Update Booking & RentalAgreement aktif | Sistem | Mengubah status booking menjadi CONFIRMED dan menerbitkan perjanjian sewa |
| Fork: Buat akun Tenant & kunci Room OCCUPIED | Sistem | Memberikan hak akses tenant dan mengubah status kamar menjadi OCCUPIED |
| Buka dashboard tenant (/tenant/dashboard) | Tenant | Penyewa mengakses area khusus penyewa |
| Menampilkan data kamar, kontrak & fasilitas | Sistem | Menyajikan informasi lengkap kamar dan masa berlaku sewa |

---

## HALAMAN 8 - Bayar Tagihan Sewa Bulanan

Lane: **Tenant**, **Sistem**, **Midtrans**.
Endpoint: `GET /tenant/bills`, `POST /api/payments/midtrans/charge`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman tagihan (/tenant/bills) | Tenant | Memeriksa kewajiban pembayaran berkala |
| Menampilkan daftar invoice belum lunas | Sistem | Menyajikan rincian invoice sewa bulan berjalan |
| Klik tombol Bayar Tagihan | Tenant | Memilih tagihan yang hendak dibayarkan |
| Generate Snap token & buat record Payment | Sistem | Menyiapkan sesi transaksi pembayaran pada Midtrans |
| Tampilkan popup Midtrans Snap | Midtrans | Membuka antarmuka pemilihan kanal pembayaran |
| Pilih metode bayar & selesaikan bayar | Tenant | Melakukan pembayaran melalui transfer bank atau dompet digital |
| Kirim webhook notifikasi ke Sistem | Midtrans | Memberi tahu status pembayaran kepada server |
| Validasi signature & status transaksi | Sistem | Memastikan transaksi berstatus settlement |
| Decision: transaksi sukses settlement? | Sistem | Jika gagal/pending, beri kesempatan bayar ulang. Jika sukses, lanjut ke fork |
| Fork: Update Invoice PAID & Kirim receipt bukti bayar | Sistem | Menandai invoice lunas dan mengirimkan bukti pembayaran |
| Menampilkan halaman tagihan lunas | Sistem | Memperbarui daftar tagihan dengan status lunas |

---

## HALAMAN 9 - Pengaduan Keluhan Kamar

Lane: **Tenant**, **Sistem**.
Endpoint: `POST /api/tenant/complaints`, `GET /tenant/complaints`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka menu pengaduan (/tenant/complaints) | Tenant | Membuka antarmuka laporan masalah fasilitas kamar |
| Menampilkan form pengaduan keluhan | Sistem | Menyediakan form pemilihan kategori dan deskripsi |
| Pilih kategori keluhan & isi judul deskripsi | Tenant | Menjelaskan kendala teknis atau keluhan kamar |
| Submit tiket pengaduan | Tenant | Mengirim tiket ke pengelola |
| Validasi sewa aktif & simpan tiket OPEN | Sistem | Memastikan pelapor adalah penyewa aktif dan menyimpan tiket dengan status OPEN |
| Fork: Memasukkan data ke DB & Tampilkan konfirmasi | Sistem | Menyimpan tiket pengaduan dan memberi tahu tiket berhasil terkirim |
| Lihat pembaruan status tiket di dashboard | Tenant | Memantau perkembangan perbaikan |
| Menampilkan status IN_PROGRESS / RESOLVED | Sistem | Menyajikan perkembangan tindak lanjut keluhan |

---

## HALAMAN 10 - Beri Ulasan dan Rating Kos

Lane: **Tenant**, **Sistem**.
Endpoint: `POST /api/reviews`, `GET /kost/[slug]`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Buka halaman sewa & klik Beri Ulasan | Tenant | Membuka form penilaian dari kamar yang disewa |
| Menampilkan modal rating & ulasan | Sistem | Menyediakan pilihan bintang 1-5 dan kolom ulasan teks |
| Pilih bintang 1-5 & tulis pengalaman kos | Tenant | Mengisi ulasan jujur mengenai kondisi kos dan pelayanan |
| Submit ulasan | Tenant | Mengirimkan ulasan ke sistem |
| Validasi status sewa & cek ulasan ganda | Sistem | Memeriksa apakah penyewa sah dan belum pernah mengulas |
| Decision: belum pernah ulas kos ini? | Sistem | Jika sudah pernah, cegah ulasan ganda. Jika belum pernah, lanjut ke fork |
| Fork: Simpan review & hitung rata-rata rating | Sistem | Memasukkan ulasan ke database dan memperbarui agregasi rating kos |
| Fork: Tampilkan ulasan di listing kos | Sistem | Menampilkan testimoni di halaman publik kos |
| Menampilkan pesan terima kasih atas ulasan | Sistem | Memberikan konfirmasi bahwa ulasan telah berhasil disimpan |

---

## HALAMAN 11 - Laporkan Kos Bermasalah

Lane: **User**, **Sistem**.
Endpoint: `POST /api/reports`, `GET /kost/[slug]`.

| Langkah | Aktor / Lane | Keterangan |
|---|---|---|
| Klik tombol Laporkan Kos | User | Menemukan indikasi ketidaksesuaian atau penipuan di halaman detail kos |
| Menampilkan modal pelaporan kos | Sistem | Menyediakan pilihan kategori pelanggaran dan deskripsi bukti |
| Pilih alasan laporan & isi kronologi | User | Memilih jenis pelanggaran dan melampirkan keterangan |
| Submit laporan | User | Mengirimkan laporan |
| Validasi input & simpan status OPEN | Sistem | Memverifikasi kelengkapan form dan mencatat tiket pelaporan |
| Fork: Memasukkan data ke database & Konfirmasi | Sistem | Menyimpan laporan ke database dan menampilkan respon instan |
| Menampilkan notifikasi laporan akan ditinjau | Sistem | Mengonfirmasi bahwa laporan telah masuk ke antrean investigasi |
