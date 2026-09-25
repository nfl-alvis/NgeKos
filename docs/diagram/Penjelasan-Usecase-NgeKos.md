# Penjelasan Use Case Diagram - Sistem NgeKos (Versi 3)

**File diagram:** `Use-case-v3.drawio` (tersinkronisasi ke `docs/diagram/Usecase-NgeKos.drawio`)  
**Struktur diagram:** Multi-page UML Use Case Diagram (3 Halaman Perspektif Peran)  
**Format:** Standar UML Use Case Diagram dengan relasi Asosiasi, `<<include>>`, dan `<<extend>>`

---

## 1. Ikhtisar Arsitektur Use Case Diagram

Diagram Use Case Sistem NgeKos versi 3 diorganisasikan ke dalam **3 halaman diagram terpisah** berdasarkan domain tanggung jawab aktor:

1. **Halaman 1 (Page-1): Perspektif Pengguna Publik & Penyewa (Guest, User, Tenant)**
   - Menangani alur pencarian kos publik, registrasi, booking, pembayaran sewa, pengelolaan profil, integrasi Telegram, hingga operasional penyewa aktif (check-in, check-out, bayar tagihan bulanan, komplain, perpanjangan sewa, dan komunikasi).
2. **Halaman 2 (Page-2): Perspektif Pemilik Kos (Owner)**
   - Menangani siklus bisnis pemilik kos mulai dari pendaftaran akun pemilik, autentikasi, manajemen properti, tipe kamar, unit kamar fisik, penyewa, invoice, persetujuan booking masuk, analitik dashboard, paket langganan (subscription), pengiriman pesan, hingga template pesan otomatis.
3. **Halaman 3 (Page-3): Perspektif Pengelola Platform (Admin)**
   - Menangani kontrol kualitas ekosistem platform, verifikasi listing kos baru, moderasi ulasan dan penanganan laporan pelanggaran, pengawasan akun pemilik dan penyewa, monitoring invoice, analitik pendapatan platform, serta *broadcast announcement* ke seluruh pengguna.

---

## 2. Daftar Aktor dan Hak Akses

Sistem NgeKos membagi peran pengguna menjadi 4 tingkatan aktor:

### 1. Guest (Pengunjung / Publik)
- **Definisi:** Pengguna yang belum login atau belum memiliki akun di platform NgeKos.
- **Kewenangan:**
  - Melihat katalog kos dan mencari kos.
  - Membuka detail properti kos, galeri foto, fasilitas, ulasan, dan aturan kos.
  - Melihat daftar paket langganan untuk pemilik kos.
  - Mendaftar akun baru (`Daftar Akun`) atau masuk ke akun terdaftar (`Login`).

### 2. User (Pengguna Terdaftar / Pencari Kos)
- **Definisi:** Pengguna umum yang telah terdaftar dan terautentikasi dalam sistem tetapi belum menjadi penyewa aktif di kos tertentu.
- **Kewenangan:**
  - Menjalankan seluruh kemampuan Guest.
  - Mengelola profil akun pribadi dan menghubungkan bot notifikasi Telegram.
  - Mengajukan permohonan booking sewa kos (`Booking Request`).
  - Mengelola daftar booking aktif dan riwayat pemesanan (`Mengelola Booking Saya`).
  - Melakukan pembayaran booking awal (`Membayar Booking`) dan mengulang pembayaran jika transaksi sebelumnya gagal (`Retry Pembayaran Gagal`).
  - Keluar dari sesi akun (`Logout`).

### 3. Tenant (Penyewa Aktif)
- **Definisi:** Pengguna yang telah berhasil melakukan pembayaran sewa kamar dan memiliki status kontrak sewa yang sedang aktif.
- **Kewenangan:**
  - Menjalankan hak akses User.
  - Mengakses data dan informasi sewa pribadi (`Melihat Data Sewa Sendiri`).
  - Memeriksa jadwal tagihan berkala dan membayar tagihan sewa bulanan (`Melihat & bayar Tagihan / Invoice`).
  - Melakukan konfirmasi kedatangan kamar (`Check-in`) dan proses serah terima pengembalian kamar saat masa sewa berakhir (`Check-out`).
  - Mengajukan perpanjangan masa kontrak sewa (`Perpanjang Sewa`).
  - Berkomunikasi langsung dengan pemilik kos (`Chat Pemilik`).
  - Menerima notifikasi tagihan dan pengumuman kos (`Melihat Notifikasi`).

### 4. Owner (Pemilik Kos)
- **Definisi:** Mitra pemilik atau pengelola properti kos yang menyewakan kamar kos melalui platform NgeKos.
- **Kewenangan:**
  - Mendaftar dan mengelola akun bisnis pemilik (`Register Owner`, `Login Owner`, `Logout Owner`).
  - Mengelola profil bisnis dan menghubungkan bot Telegram untuk notifikasi instan.
  - Menambahkan dan mengedit data properti bangunan kos (`Mengelola Property`).
  - Mengatur klasifikasi kamar dan harga sewa (`Mengelola Room Type`).
  - Mengatur inventaris dan nomor unit kamar fisik (`Mengelola Room`).
  - Meninjau dan menyetujui atau menolak pesanan sewa masuk (`Mengelola Booking Masuk`).
  - Mengelola data penghuni kos aktif dan arsip riwayat sewa (`Mengelola Tenant`).
  - Menerbitkan dan memantau status tagihan sewa bulanan (`Mengelola Invoice`).
  - Memantau performa okupansi dan grafik pendapatan kos (`Melihat Dashboard`).
  - Membeli atau memperpanjang paket kuota properti platform (`Mengelola Subscription`).
  - Mengirim pesan tagihan/pengumuman dan menyusun *template* pesan (`Mengirim Pesan ke Penyewa`, `Mengelola Template Pesan`).

### 5. Admin (Pengelola Platform)
- **Definisi:** Administrator internal sistem dengan hak akses tertinggi yang bertanggung jawab atas keamanan, legalitas, dan stabilitas ekosistem NgeKos.
- **Kewenangan:**
  - Masuk ke portal manajemen administrator (`Login Admin`, `Logout Admin`).
  - Memverifikasi kelayakan data dan foto properti kos baru yang diajukan Owner sebelum tayang di publik (`Memverifikasi Properti Kos`).
  - Memoderasi ulasan yang tidak pantas dan menginvestigasi laporan indikasi penipuan kos (`Memoderasi Ulasan & Laporan Kos`).
  - Mengelola dan menonaktifkan akun Owner atau Tenant yang melanggar ketentuan (`Mengelola Owner`, `Mengelola Tenant`).
  - Memantau properti kos terdaftar di seluruh platform (`Mengelola Property`).
  - Memeriksa riwayat seluruh transaksi dan penagihan sewa (`Mengelola Invoice`).
  - Memantau total metrik platform dan analitik perputaran uang (`Melihat Dashboard`, `Mengelola Pendapatan Platform`).
  - Mengirim pesan massal/pengumuman sistem ke semua pengguna (`Mengirim Pesan ke Semua User`).

---

## 3. Matriks Relasi Aktor dan Use Case

### 3.1 Matriks Halaman 1: Pengguna Publik & Penyewa (Guest, User, Tenant)

| No | Nama Use Case | Guest | User | Tenant | Relasi UML |
|---|---|:---:|:---:|:---:|---|
| 1 | **Daftar Akun** | V | - | - | Included by Login |
| 2 | **Login** | V | V | - | Includes Daftar Akun |
| 3 | **Logout** | - | V | V | `<<include>>` Login |
| 4 | **Mengelola Profil** | - | V | V | `<<include>>` Login |
| 5 | **Menghubungkan Akun Telegram** | - | - | - | `<<extend>>` Mengelola Profil |
| 6 | **Mencari Kost** | V | V | V | Extended by Memfilter Kost & Cari Kost Terdekat |
| 7 | **Memfilter Kost** | - | - | - | `<<extend>>` Mencari Kost |
| 8 | **Cari Kost Terdekat** | - | - | - | `<<extend>>` Mencari Kost |
| 9 | **Melihat Detail Kost** | V | V | V | Extended by Chat Pemilik |
| 10 | **Melihat Daftar Paket Langganan** | V | V | V | - |
| 11 | **Mengajukan Booking Request** | - | V | - | `<<include>>` Login |
| 12 | **Mengelola Booking Saya** | - | V | - | `<<include>>` Login |
| 13 | **Membayar Booking** | - | V | - | `<<include>>` Login, Extended by Retry Pembayaran |
| 14 | **Retry Pembayaran Gagal** | - | - | - | `<<extend>>` Membayar Booking |
| 15 | **Melihat Data Sewa Sendiri** | - | - | V | - |
| 16 | **Melihat & bayar Tagihan / Invoice** | - | - | V | `<<extend>>` Retry Pembayaran Gagal |
| 17 | **Melihat Notifikasi** | - | - | V | - |
| 18 | **Check-in** | - | - | V | - |
| 19 | **Check-out** | - | - | V | - |
| 20 | **Perpanjang Sewa** | - | - | V | - |
| 21 | **Chat Pemilik** | - | - | V | `<<extend>>` Melihat Detail Kost |

### 3.2 Matriks Halaman 2: Pemilik Kos (Owner)

| No | Nama Use Case | Aktor Terhubung | Relasi UML |
|---|---|:---:|---|
| 1 | **Register Owner** | Owner | `<<include>>` Login Owner |
| 2 | **Login Owner** | Owner | Base use case yang di-include seluruh fitur |
| 3 | **Logout Owner** | Owner | `<<include>>` Login Owner |
| 4 | **Mengelola Profil Owner** | Owner | `<<include>>` Login Owner, Extended by Telegram |
| 5 | **Menghubungkan Akun Telegram** | - | `<<extend>>` Mengelola Profil Owner |
| 6 | **Mengelola Property** | Owner | `<<include>>` Login Owner |
| 7 | **Mengelola Room Type** | Owner | `<<include>>` Login Owner |
| 8 | **Mengelola Room** | Owner | `<<include>>` Login Owner |
| 9 | **Mengelola Tenant** | Owner | `<<include>>` Login Owner |
| 10 | **Mengelola Invoice** | Owner | `<<include>>` Login Owner |
| 11 | **Mengelola Booking Masuk** | Owner | `<<include>>` Login Owner |
| 12 | **Melihat Dashboard** | Owner | `<<include>>` Login Owner |
| 13 | **Mengelola Notifikasi** | Owner | `<<include>>` Login Owner |
| 14 | **Mengelola Subscription** | Owner | `<<include>>` Login Owner |
| 15 | **Mengirim Pesan ke Penyewa** | Owner | `<<include>>` Login Owner |
| 16 | **Mengelola Template Pesan** | Owner | `<<include>>` Login Owner |

### 3.3 Matriks Halaman 3: Pengelola Platform (Admin)

| No | Nama Use Case | Aktor Terhubung | Relasi UML |
|---|---|:---:|---|
| 1 | **Login Admin** | Admin | Base use case yang di-include seluruh modul admin |
| 2 | **Logout Admin** | Admin | `<<include>>` Login Admin |
| 3 | **Mengelola Profil Admin** | Admin | `<<include>>` Login Admin |
| 4 | **Mengelola Owner** | Admin | `<<include>>` Login Admin |
| 5 | **Mengelola Property** | Admin | `<<include>>` Login Admin |
| 6 | **Memverifikasi Properti Kos** | Admin | `<<include>>` Login Admin |
| 7 | **Memoderasi Ulasan & Laporan Kos** | Admin | `<<include>>` Login Admin |
| 8 | **Mengelola Tenant** | Admin | `<<include>>` Login Admin |
| 9 | **Mengelola Invoice** | Admin | `<<include>>` Login Admin |
| 10 | **Melihat Dashboard** | Admin | `<<include>>` Login Admin |
| 11 | **Mengelola Notifikasi** | Admin | `<<include>>` Login Admin |
| 12 | **Mengelola Pendapatan Platform** | Admin | `<<include>>` Login Admin |
| 13 | **Mengirim Pesan ke Semua User** | Admin | `<<include>>` Login Admin |

---

## 4. Rincian Deskripsi Use Case (Per Halaman)

### 4.1 Halaman 1: Pengguna Publik & Penyewa

#### 1. Daftar Akun
- **Aktor:** Guest
- **Deskripsi:** Pengguna baru mengisi formulir pendaftaran nama, email, nomor HP, dan kata sandi untuk membuat akun di platform NgeKos.
- **Prakondisi:** Pengguna belum memiliki akun aktif dengan email yang sama.
- **Pascakondisi:** Akun pengguna tersimpan di database dengan status aktif.

#### 2. Login
- **Aktor:** Guest, User
- **Deskripsi:** Pengguna memasukkan kredensial email dan password untuk mendapatkan sesi autentikasi dan token JWT.
- **Relasi:** Menyertakan `<<include>>` Daftar Akun bagi pengguna baru.
- **Prakondisi:** Akun telah terdaftar di database.
- **Pascakondisi:** Sesi login pengguna aktif dan diarahkan sesuai hak akses.

#### 3. Logout
- **Aktor:** User, Tenant
- **Deskripsi:** Menghapus sesi login dan token JWT aktif dari peramban pengguna.
- **Relasi:** `<<include>>` Login (memerlukan sesi login aktif).
- **Pascakondisi:** Sesi berakhir dan diarahkan kembali ke halaman login/utama.

#### 4. Mengelola Profil
- **Aktor:** User, Tenant
- **Deskripsi:** Melihat dan memperbarui data personal seperti foto profil, nomor WhatsApp, serta ubah kata sandi.
- **Relasi:** `<<include>>` Login, diperluas oleh `<<extend>>` Menghubungkan Akun Telegram.
- **Pascakondisi:** Data profil pengguna diperbarui pada database.

#### 5. Menghubungkan Akun Telegram
- **Aktor:** User, Tenant
- **Deskripsi:** Menautkan akun Telegram pribadi dengan sistem melalui kode token bot agar pengguna menerima notifikasi instan tagihan dan booking via Telegram.
- **Relasi:** `<<extend>>` ke Mengelola Profil (kondisional saat pengguna memilih opsi tautkan Telegram).
- **Pascakondisi:** ID Telegram tersimpan di tabel pengguna untuk pengiriman pesan otomatis.

#### 6. Mencari Kost
- **Aktor:** Guest, User, Tenant
- **Deskripsi:** Menampilkan katalog kos aktif dengan kata kunci kota, nama kos, atau kampus/kantor terdekat.
- **Relasi:** Diperluas oleh `<<extend>>` Memfilter Kost dan `<<extend>>` Cari Kost Terdekat.
- **Pascakondisi:** Menampilkan daftar kartu properti kos yang sesuai.

#### 7. Memfilter Kost
- **Aktor:** Guest, User, Tenant
- **Deskripsi:** Menerapkan kriteria filter lanjutan seperti rentang harga sewa, tipe gender kos (putra/putri/campur), dan ketersediaan fasilitas khusus (AC, WiFi, kamar mandi dalam).
- **Relasi:** `<<extend>>` ke Mencari Kost.
- **Pascakondisi:** Hasil pencarian disaring lebih spesifik sesuai filter aktif.

#### 8. Cari Kost Terdekat
- **Aktor:** Guest, User, Tenant
- **Deskripsi:** Menggunakan titik koordinat GPS perangkat pengguna untuk mengurutkan properti kos berdasarkan jarak radius terdekat (geolokasi).
- **Relasi:** `<<extend>>` ke Mencari Kost.
- **Pascakondisi:** Daftar kos diurutkan dari jarak terdekat ke terjauh dalam satuan kilometer.

#### 9. Melihat Detail Kost
- **Aktor:** Guest, User, Tenant
- **Deskripsi:** Menampilkan informasi komprehensif suatu properti kos, meliputi spesifikasi kamar, galeri foto, peta lokasi, aturan sewa, ulasan penghuni, serta tombol booking dan chat.
- **Relasi:** Diperluas oleh `<<extend>>` Chat Pemilik.
- **Pascakondisi:** Halaman detail properti ditampilkan secara utuh.

#### 10. Melihat Daftar Paket Langganan
- **Aktor:** Guest, User, Tenant
- **Deskripsi:** Halaman publik informasi yang menyajikan paket langganan bagi calon pemilik kos yang ingin bermitra (Starter, Pro, Enterprise).
- **Pascakondisi:** Pengguna memahami fitur dan skema tarif kemitraan kos.

#### 11. Mengajukan Booking Request
- **Aktor:** User
- **Deskripsi:** Mengajukan permohonan sewa pada kamar kos yang dipilih dengan menentukan tanggal mulai sewa, durasi sewa, dan data penghuni.
- **Relasi:** `<<include>>` Login.
- **Prakondisi:** Kamar berstatus VACANT dan pengguna telah login.
- **Pascakondisi:** Booking baru tercatat dengan status PENDING dan Owner menerima pemberitahuan.

#### 12. Mengelola Booking Saya
- **Aktor:** User
- **Deskripsi:** Halaman bagi pencari kos untuk memantau status persetujuan booking (PENDING, APPROVED, REJECTED, EXPIRED).
- **Relasi:** `<<include>>` Login.
- **Pascakondisi:** Daftar status pemesanan disajikan secara transparan.

#### 13. Membayar Booking
- **Aktor:** User
- **Deskripsi:** Melakukan pelunasan pembayaran booking sewa yang telah disetujui pemilik kos melalui gerbang pembayaran (Virtual Account, QRIS, GoPay).
- **Relasi:** `<<include>>` Login, diperluas oleh `<<extend>>` Retry Pembayaran Gagal.
- **Prakondisi:** Booking berstatus APPROVED dan belum melewati batas waktu (24 jam).
- **Pascakondisi:** Transaksi diproses; jika berhasil, pengguna otomatis menjadi Tenant aktif.

#### 14. Retry Pembayaran Gagal
- **Aktor:** User, Tenant
- **Deskripsi:** Mengaktifkan ulang tagihan atau meminta tautan pembayaran baru ketika pembayaran sebelumnya dibatalkan, ditolak, atau mengalami *timeout*.
- **Relasi:** `<<extend>>` ke Membayar Booking; juga diperluas oleh `<<extend>>` Melihat & bayar Tagihan / Invoice.
- **Pascakondisi:** Tautan Snap Midtrans baru diterbitkan untuk dicoba kembali oleh pengguna.

#### 15. Melihat Data Sewa Sendiri
- **Aktor:** Tenant
- **Deskripsi:** Dasbor khusus penghuni aktif untuk melihat nomor kamar, masa aktif sewa, tanggal jatuh tempo bulan berikutnya, dan peraturan kos.
- **Prakondisi:** Pengguna memiliki kontrak sewa berstatus ACTIVE.
- **Pascakondisi:** Data rincian kamar dan masa tinggal ditampilkan.

#### 16. Melihat & bayar Tagihan / Invoice
- **Aktor:** Tenant
- **Deskripsi:** Memeriksa tagihan sewa berkala bulanan dan melakukan pembayaran invoice langsung sebelum tanggal jatuh tempo.
- **Relasi:** `<<extend>>` ke Retry Pembayaran Gagal jika terjadi kendala saat pembayaran invoice.
- **Pascakondisi:** Invoice berstatus PAID dan bukti bayar elektronik diterbitkan.

#### 17. Melihat Notifikasi
- **Aktor:** Tenant
- **Deskripsi:** Membaca pesan pemberitahuan sistem terkait pengingat jatuh tempo sewa, pengumuman darurat kos, atau respons komplain dari pemilik kos.
- **Pascakondisi:** Status notifikasi ditandai sebagai telah dibaca (*read*).

#### 18. Check-in
- **Aktor:** Tenant
- **Deskripsi:** Mengonfirmasi kehadiran fisik di kos pada hari pertama sewa, mengunggah kondisi awal kamar, dan mengaktifkan kunci kamar.
- **Prakondisi:** Tanggal mulai sewa telah tercapai dan pembayaran awal telah lunas.
- **Pascakondisi:** Status kehadiran tercatat dan masa hunian resmi berjalan.

#### 19. Check-out
- **Aktor:** Tenant
- **Deskripsi:** Mengajukan penyelesaian masa sewa dan pengembalian unit kamar secara resmi ke pemilik kos.
- **Prakondisi:** Masa sewa berakhir atau penyewa mengajukan penghentian sewa.
- **Pascakondisi:** Status kamar kembali disiapkan untuk inspeksi dan dibuka menjadi VACANT.

#### 20. Perpanjang Sewa
- **Aktor:** Tenant
- **Deskripsi:** Mengajukan penambahan durasi sewa (misal 1 bulan, 3 bulan, atau 1 tahun) sebelum masa sewa aktif saat ini kedaluwarsa.
- **Prakondisi:** Kontrak sewa aktif tersisa kurang dari 30 hari.
- **Pascakondisi:** Jadwal perpanjangan diajukan ke pemilik dan invoice perpanjangan diterbitkan.

#### 21. Chat Pemilik
- **Aktor:** Tenant
- **Deskripsi:** Mengirim pesan teks atau pertanyaan langsung ke pemilik kos untuk koordinasi sewa atau komplain fasilitas.
- **Relasi:** `<<extend>>` ke Melihat Detail Kost (dapat diakses dari profil kos).
- **Pascakondisi:** Pesan masuk ke obrolan pemilik kos.

---

### 4.2 Halaman 2: Pemilik Kos (Owner)

#### 1. Register Owner
- **Aktor:** Owner
- **Deskripsi:** Registrasi khusus calon pemilik kos dengan mengisi data nama bisnis, email usaha, dan nomor kontak.
- **Relasi:** `<<include>>` Login Owner.

#### 2. Login Owner
- **Aktor:** Owner
- **Deskripsi:** Gerbang autentikasi utama pemilik kos untuk masuk ke modul manajemen properti kos.
- **Relasi:** Merupakan base use case yang di-`<<include>>` oleh seluruh fungsionalitas di halaman Owner.

#### 3. Logout Owner
- **Aktor:** Owner
- **Deskripsi:** Mengakhiri sesi kerja pemilik kos pada peramban.
- **Relasi:** `<<include>>` Login Owner.

#### 4. Mengelola Profil Owner
- **Aktor:** Owner
- **Deskripsi:** Mengatur informasi identitas pemilik kos, nomor rekening pencairan sewa, dan data kontak.
- **Relasi:** `<<include>>` Login Owner, diperluas oleh `<<extend>>` Menghubungkan Akun Telegram.

#### 5. Menghubungkan Akun Telegram (Owner)
- **Aktor:** Owner
- **Deskripsi:** Mengintegrasikan bot Telegram milik pengelola untuk menerima pemberitahuan instan saat ada booking masuk, pembayaran invoice sewa, atau komplain penyewa.
- **Relasi:** `<<extend>>` ke Mengelola Profil Owner.

#### 6. Mengelola Property
- **Aktor:** Owner
- **Deskripsi:** Menambah bangunan kos baru, menentukan titik lokasi GPS, mengunggah foto properti, serta mendefinisikan aturan kos dan fasilitas umum.
- **Relasi:** `<<include>>` Login Owner.

#### 7. Mengelola Room Type
- **Aktor:** Owner
- **Deskripsi:** Mengelompokkan variasi kamar (misal: Deluxe AC, Standard Fan) beserta harga sewa bulanan, ukuran kamar, dan fasilitas per kamar.
- **Relasi:** `<<include>>` Login Owner.

#### 8. Mengelola Room
- **Aktor:** Owner
- **Deskripsi:** Mendaftarkan nomor kamar fisik, lantai, dan mengubah status kamar (VACANT, OCCUPIED, UNDER_MAINTENANCE).
- **Relasi:** `<<include>>` Login Owner.

#### 9. Mengelola Tenant
- **Aktor:** Owner
- **Deskripsi:** Memantau daftar seluruh penyewa aktif di setiap kamar, riwayat check-in/check-out, serta kontak darurat penghuni.
- **Relasi:** `<<include>>` Login Owner.

#### 10. Mengelola Invoice
- **Aktor:** Owner
- **Deskripsi:** Menerbitkan invoice sewa bulanan otomatis, memeriksa status pembayaran (PAID/UNPAID), dan mencatat konfirmasi manual jika ada.
- **Relasi:** `<<include>>` Login Owner.

#### 11. Mengelola Booking Masuk
- **Aktor:** Owner
- **Deskripsi:** Meninjau calon penyewa yang mengajukan sewa dan menekan tombol Setujui (*Approve*) atau Tolak (*Reject*).
- **Relasi:** `<<include>>` Login Owner.

#### 12. Melihat Dashboard
- **Aktor:** Owner
- **Deskripsi:** Menyajikan ringkasan grafik tingkat hunian kos (okupansi), total pendapatan kotor, tunggakan sewa, dan kamar kosong.
- **Relasi:** `<<include>>` Login Owner.

#### 13. Mengelola Notifikasi
- **Aktor:** Owner
- **Deskripsi:** Mengatur preferensi pemberitahuan sistem dan melihat histori pemberitahuan operasional.
- **Relasi:** `<<include>>` Login Owner.

#### 14. Mengelola Subscription
- **Aktor:** Owner
- **Deskripsi:** Memilih paket langganan sistem NgeKos (Starter, Pro, Enterprise) dan melakukan perpanjangan masa aktif langganan.
- **Relasi:** `<<include>>` Login Owner.

#### 15. Mengirim Pesan ke Penyewa
- **Aktor:** Owner
- **Deskripsi:** Mengirimkan pesan broadcast atau pesan langsung kepada penyewa terkait pengingat pembayaran atau informasi perbaikan fasilitas kos.
- **Relasi:** `<<include>>` Login Owner.

#### 16. Mengelola Template Pesan
- **Aktor:** Owner
- **Deskripsi:** Menyusun draf kalimat otomatis (seperti ucapan selamat datang, pengingat jatuh tempo H-3, aturan kebersihan) agar pengiriman pesan efisien.
- **Relasi:** `<<include>>` Login Owner.

---

### 4.3 Halaman 3: Pengelola Platform (Admin)

#### 1. Login Admin
- **Aktor:** Admin
- **Deskripsi:** Autentikasi sesi Administrator platform untuk membuka hak akses konsol admin.
- **Relasi:** Merupakan base use case yang di-`<<include>>` oleh seluruh fungsionalitas modul Admin.

#### 2. Logout Admin
- **Aktor:** Admin
- **Deskripsi:** Mengakhiri sesi hak akses administrator pada browser secara aman.
- **Relasi:** `<<include>>` Login Admin.

#### 3. Mengelola Profil Admin
- **Aktor:** Admin
- **Deskripsi:** Memperbarui data akun admin dan kata sandi keamanan internal.
- **Relasi:** `<<include>>` Login Admin.

#### 4. Mengelola Owner
- **Aktor:** Admin
- **Deskripsi:** Melihat daftar pemilik kos terdaftar, memeriksa status kemitraan, serta menonaktifkan akun pemilik yang melanggar ketentuan.
- **Relasi:** `<<include>>` Login Admin.

#### 5. Mengelola Property
- **Aktor:** Admin
- **Deskripsi:** Mengawasi semua properti kos yang beredar di ekosistem platform dan menangguhkan publikasi listing jika terbukti fiktif.
- **Relasi:** `<<include>>` Login Admin.

#### 6. Memverifikasi Properti Kos
- **Aktor:** Admin
- **Deskripsi:** Memeriksa kelengkapan bukti kepemilikan, akurasi alamat, dan foto bangunan sebelum menyetujui kos baru agar tampil di pencarian publik.
- **Relasi:** `<<include>>` Login Admin.

#### 7. Memoderasi Ulasan & Laporan Kos
- **Aktor:** Admin
- **Deskripsi:** Meninjau laporan pengguna mengenai kos bermasalah, menyembunyikan ulasan dengan bahasa kasar/spam, dan menindaklanjuti keluhan penipuan.
- **Relasi:** `<<include>>` Login Admin.

#### 8. Mengelola Tenant
- **Aktor:** Admin
- **Deskripsi:** Mengakses data direktori penyewa di seluruh platform untuk keperluan audit dan penanganan komplain.
- **Relasi:** `<<include>>` Login Admin.

#### 9. Mengelola Invoice
- **Aktor:** Admin
- **Deskripsi:** Memeriksa log seluruh perputaran transaksi sewa kamar dan tagihan paket langganan yang diproses sistem pembayaran.
- **Relasi:** `<<include>>` Login Admin.

#### 10. Melihat Dashboard
- **Aktor:** Admin
- **Deskripsi:** Melihat metrik performa platform secara global: pertumbuhan pengguna aktif, total volume transaksi (GMV), jumlah kos aktif, dan performa server.
- **Relasi:** `<<include>>` Login Admin.

#### 11. Mengelola Notifikasi
- **Aktor:** Admin
- **Deskripsi:** Mengatur alur pengiriman notifikasi otomatis serta sistem log alert kendala teknis.
- **Relasi:** `<<include>>` Login Admin.

#### 12. Mengelola Pendapatan Platform
- **Aktor:** Admin
- **Deskripsi:** Rekapitulasi pendapatan platform yang bersumber dari biaya langganan pemilik kos (subscription) dan *platform fee* per transaksi.
- **Relasi:** `<<include>>` Login Admin.

#### 13. Mengirim Pesan ke Semua User
- **Aktor:** Admin
- **Deskripsi:** Mengirim pengumuman pemeliharaan sistem (*maintenance*), pembaruan kebijakan privasi, atau informasi promosi massal kepada seluruh pengguna platform.
- **Relasi:** `<<include>>` Login Admin.

---

## 5. Ringkasan Relasi Dependensi UML

### 5.1 Relasi `<<include>>`
Relasi `<<include>>` menyatakan bahwa use case penyedia (sumber) secara mutlak mengeksekusi use case target sebagai prasyarat wajib jalannya fungsionalitas:
* **Pada Halaman Pengguna (Page-1):**
  - Seluruh fitur sensitif pengguna (`Logout`, `Mengajukan Booking Request`, `Mengelola Booking Saya`, `Membayar Booking`, `Mengelola Profil`) menyertakan **`Login`** sebagai syarat autentikasi.
  - Alur **`Login`** menyertakan **`Daftar Akun`** sebagai bagian dari alur pembuatan identitas bagi pengguna baru.
* **Pada Halaman Pemilik (Page-2):**
  - Seluruh 14 modul operasional pemilik kos secara eksplisit menyertakan **`Login Owner`** untuk memastikan otoritas pengelolaan aset properti.
* **Pada Halaman Administrator (Page-3):**
  - Seluruh 12 fitur konsol admin menyertakan **`Login Admin`** untuk memproteksi data sensitif platform dan fungsi moderasi.

### 5.2 Relasi `<<extend>>`
Relasi `<<extend>>` menyatakan penambahan fungsionalitas opsional atau kondisional pada use case dasar:
* **`Menghubungkan Akun Telegram` $\rightarrow$ `Mengelola Profil` / `Mengelola Profil Owner`:**
  - Bersifat opsional saat pengguna atau pemilik memilih untuk mengaktifkan notifikasi via bot Telegram.
* **`Memfilter Kost` & `Cari Kost Terdekat` $\rightarrow$ `Mencari Kost`:**
  - Opsi perluasan saat pencari kos membutuhkan filter harga/gender atau pengurutan lokasi berdasarkan GPS.
* **`Retry Pembayaran Gagal` $\rightarrow$ `Membayar Booking`:**
  - Alur alternatif yang dieksekusi hanya jika transaksi pembayaran sebelumnya mengalami penolakan, kedaluwarsa, atau kegagalan sistem.
* **`Melihat & bayar Tagihan / Invoice` $\rightarrow$ `Retry Pembayaran Gagal`:**
  - Fasilitas pelunasan ulang jika penyewa menghadapi kendala pembayaran tagihan sewa berkala.
* **`Chat Pemilik` $\rightarrow$ `Melihat Detail Kost`:**
  - Perluasan fitur komunikasi langsung yang dapat diakses langsung dari profil detail kos.
