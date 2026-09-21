# Penjelasan Activity Diagram - Sistem Ngekost

**File drawio:** `Activity-Ngekost.drawio` (11 halaman / tab)
**Generator:** `gen_activity_ngekost.py` - data-driven, regenerate jangan edit XML manual
**Sumber:** PRD-Ngekost-FULL.md v3.5/v3.6, API.md v3.5, DATABASE.md v3.5, Daftar-Fitur-Gratis-vs-Premium.md, Penjelasan-Usecase-Ngekost.md
**Format layout:** swimlane vertikal hitam-putih, konsisten dengan `gen_activity_diagrams.py` (proyek TumbuhKita)

**Total:** 11 halaman, 167 node alur (start/end/action/decision) + 24 elemen swimlane = 191 vertex, 171 edge - semua lolos validator struktural (tanpa duplicate ID, tanpa dangling edge, tanpa node orphan). Kolom "Node" di tabel bawah menghitung node alur saja.

---

## Daftar Halaman

| # | Nama Tab | Lane | Use case / halaman terkait |
|---|---|---|---|
| 1 | Autentikasi Owner (Register & Login) | Owner, Sistem | `admin/login` area owner dashboard, `daftar`, `login` |
| 2 | Autentikasi Guest (Register & Login) | Guest, Sistem, Google | `kost/[slug]/book` (CtA Booking memicu OAuth) |
| 3 | Autentikasi Tenant (Register & Login) | Tenant, Sistem, Google | Telegram `/start` connect |
| 4 | Cari & Filter Kost (Listing Publik) | Guest, Sistem | `kost` (listing + `LocationSearchPopup` via Geoapify) |
| 5 | Ajukan Booking Request | Guest, Sistem | `kost/[slug]/book` wizard 3 langkah |
| 6 | Approve Booking (Tidak Digating) | Owner, Sistem | `owner/bookings` (approve) |
| 7 | Reject Booking (Tidak Digating) | Owner, Sistem | `owner/bookings` (reject) |
| 8 | Bayar Booking & Retry Pembayaran | Guest, Sistem, Midtrans | `bookings/[id]/bayar` |
| 9 | Webhook Midtrans & Konversi Guest → Tenant | Midtrans, Sistem | `api/webhooks/midtrans/booking` |
| 10 | Tambah Property Baru (Digating) | Owner, Sistem | `owner/properties` |
| 11 | Verifikasi Property (Admin) | Admin, Sistem | `admin/verification`, `admin/verification/history` (baru, sesuai rute v3) |


---

## Notasi Visual

| Bentuk | Makna |
|---|---|
| Elips hitam penuh | Initial node (mulai) |
| Elips putih tebal | Final node (selesai) |
| Persegi rounded | Action / activity |
| Belah ketupat (rhombus) | Decision node, keluar dengan label `Ya` / `Tidak` |
| Garis vertikal tipis | Pembatas lane |
| Batang hitam tebal horizontal | Fork/join node - HANYA saat alur menyentuh database |
| Panah lewat sisi kanan | Jalur error / retry / kembali (routing samping, tiap edge punya offset sendiri agar tidak tumpang tindih) |

## Aturan Layout (divalidkan terhadap referensi "Contoh Teman Saya yang sudah benar")

Referensi dianalisis dari file `Activity Diagram-Contoh Teman Saya yang sudah benar.drawio` (15 alur, tiap alur = pasangan lane) + artikel UML (Visual Paradigm notation guide, viz-note fork-vs-decision). Aturan yang dipatuhi diagram ini:

1. **Fork = 1 masuk, 2 keluar: aksi database ∥ tampilkan halaman/pesan.** Masuknya dari SATU sumber (action atau decision) - cabang decision yang saling eksklusif TIDAK BOLEH dilebur ke fork (itu artinya 'keduanya jalan bareng', ngawur). Audit 11/11 halaman: 10 fork, semuanya 1-in/2-out dengan tepat satu cabang `memasukkan data ke database`; 0 pelanggaran.
   - Revisi: halaman 1 dulu menggabungkan decision login DAN decision register ke satu fork → login benar tak menulis DB, kini jalur login langsung ke `masuk dashboard`, hanya jalur register masuk fork. Halaman 11 dulu menggabungkan cabang approve+reject ke fork → kini decision `terverifikasi?` memilih dulu: approve → fork (DB ∥ tampilkan+notif), reject → jalur samping kembali ke antrean (pola sama dgn decision pembayaran di referensi).
2. **Bar fork/join selalu di lane Sistem**, di bawah action, bentuk `5x160 rotation=90`.
3. **Final node (elips putih) selalu di lane Sistem** - konsisten dengan referensi (15/15 alur); action terakhir aktor (`lihat …`) tetap di lane aktor, lalu alur pindah ke Sistem untuk berakhir.
4. **Guard label format `[kondisi]`** sebagai edge label terpisah.
5. Satu initial node di lane aktor (bukan Sistem), mengikuti referensi.
6. **Setiap jalur yang berakhir di final node wajib melewati action `menampilkan …`/`memuat ulang …` di lane Sistem lebih dulu** - pola referensi 15/15: node sebelum END selalu tampilan hasil (halaman sukses, halaman data, pesan), bukan aksi aktor dan bukan join langsung. Aksi `lihat …` milik aktor diletakkan di tengah alur, bukan sebagai penutup.

Semua hitam-putih, tanpa warna - aman untuk dicetak di laporan grayscale. Kalau nanti butuh penanda gating berwarna merah seperti di use case diagram, cukup ubah konstanta `ST_ACTION` di generator.

---

## HALAMAN 1 - Register Owner & Trial 30 Hari

Lane: **Owner**, **Sistem**. Endpoint: `POST /api/auth/register`.

| Langkah kunci | Detail dari sumber |
|---|---|
| Validasi input & email unik | `User.email` `@unique` (DATABASE Bab 2); gagal → 422 `VALIDATION_ERROR` |
| Hash password | bcrypt (`User.passwordHash`), PRD Bab 7 Security |
| Buat Subscription TRIAL | `t_uc10` Auto-Mulai Trial 30 Hari - dipicu tepat saat register, `trialEndsAt = now + 30 hari`, `gracePeriodDays` default 7 |

Decision tunggal (`Input valid & email belum terdaftar?`) dengan loop kembali ke pengisian form. Trial dibuat di transaksi yang sama dengan `User` supaya tidak ada owner tanpa Subscription.

---

## HALAMAN 2 - Login Owner

Lane: **Owner**, **Sistem**. Endpoint: `POST /api/auth/login`.

Setelah JWT terbit, sistem memuat status `Subscription` untuk menampilkan banner langganan. Ini penting: melihat status subscription dan memperpanjangnya **tidak boleh dikunci** (Daftar-Fitur bagian 1) - kalau dikunci, owner `EXPIRED` tidak akan bisa membayar untuk keluar dari kondisi itu.

---

## HALAMAN 3 - Cari & Filter Kost (Listing Publik)

Lane: **Guest**, **Sistem**. Endpoint: `GET /api/public/properties`, `GET /api/public/properties/:slug`.

| Langkah kunci | Detail |
|---|---|
| Tanpa login | Guest belum perlu akun sama sekali (PRD Bab 4 poin 2) |
| Pagination wajib | `page`, `limit` default 20, maks 50 (API Stage 7) |
| Kecualikan Room MAINTENANCE / OCCUPIED | Business rule PRD Bab 8 poin 4; `BOOKING_PENDING` juga tidak tersedia |
| Ketersediaan real-time | Diferensiasi utama (PRD Bab 2 poin 10) - `Room.status` field tersendiri, bukan hasil verifikasi manual |

Ada dua decision: `Ada hasil?` (loop ke ubah filter) dan `Buka detail kost?` (guest boleh kembali menelusuri). Halaman ini berakhir tepat sebelum klik "Booking" - lanjutannya di halaman 4.

---

## HALAMAN 4 - Login Google (Verifikasi Identitas Guest)

Lane: **Guest**, **Sistem**, **Google**. Endpoint: `GET /api/auth/google/start`, `GET /api/auth/google/callback`.

Ini halaman dengan aktor eksternal pertama. Urutan sesuai Google Sign-In Policy v3.6:

| Langkah | Aturan wajib |
|---|---|
| Bangun URL OAuth | PKCE `code_verifier` + parameter `state` disimpan sebagai cookie `HttpOnly`/`SameSite=Lax` |
| Decision: state cocok? | Tidak cocok → 400 `OAUTH_STATE_MISMATCH` (indikasi CSRF) |
| Tukar code | `redirect_uri` harus **persis** sama dengan yang terdaftar di Google Cloud Console, jangan dibentuk dari header `Host` |
| Verifikasi ID token | Server-side selalu: signature terhadap JWKS Google, `iss`, `aud` = `GOOGLE_CLIENT_ID`, `exp` |
| Decision: token valid & email_verified? | Gagal → 401 `GOOGLE_TOKEN_INVALID` atau 403 `EMAIL_NOT_VERIFIED` |
| Upsert Guest | Kunci utama `googleSub` (claim `sub`), fallback `email` lalu backfill `googleSub` untuk akun lama |

Login Google menggantikan OTP SMS/WhatsApp karena OTP berbiaya per pesan (PRD Bab 13 poin 5, sudah SELESAI). Nomor HP tetap diminta di form booking sebagai data kontak, tapi **tidak diverifikasi** dan bukan identitas.

---

## HALAMAN 5 - Ajukan Booking Request

Lane: **Verified Guest**, **Sistem**. Endpoint: `POST /api/bookings`.

Tiga decision berurutan, semuanya di dalam satu `prisma.$transaction()`:

| Decision | Gagal → |
|---|---|
| Token guest valid? | 401 `UNAUTHORIZED` |
| Room `VACANT` & `property.isActive`? | 409 `ROOM_UNAVAILABLE` |
| Ada booking aktif duplikat (guestId + roomId sama)? | 409 `DUPLICATE_ACTIVE_BOOKING` |

Yang paling sering salah digambar orang: **`Room.status` TETAP `VACANT` di tahap ini.** Kamar baru terkunci saat owner approve (halaman 6), bukan saat guest submit. Selama `PENDING_APPROVAL`, kamar masih tampil tersedia di listing publik karena belum ada komitmen apa pun.

Efek samping: `approvalDeadline = now + 24 jam`, `accessToken` digenerate lalu **disimpan hashed** (`accessTokenHash`) - raw token dikembalikan hanya sekali di response ini. Notification `NEW_BOOKING` ke owner, ActivityLog `BOOKING_CREATED` dengan `actorType = GUEST`.

Cek duplikat dilakukan di application logic dalam transaction, bukan unique index, karena kombinasi status aktif ada banyak dan Prisma tidak mendukung partial unique index native.

---

## HALAMAN 6 - Approve Booking (Tidak Digating)

Lane: **Owner**, **Sistem**. Endpoint: `POST /api/owner/bookings/:id/approve`.

Halaman paling penting di seluruh set ini, dan yang paling mudah salah kalau mengacu dokumen versi lama.

| Langkah kunci | Detail |
|---|---|
| Cek ownership | `booking.property.ownerId === session.userId` → gagal 403 `OWNERSHIP_VIOLATION` |
| **TANPA subscription gate** | Node eksplisit, bukan decision. Revisi v3.5 menghapus gating di approve - booking adalah pendapatan riil yang menunggu, memblokirnya kontraproduktif (PRD Bab 7). Status `WAITING_OWNER_SUBSCRIPTION` **dihapus total** dari `BookingStatus` |
| Decision status | Harus masih `PENDING_APPROVAL` → gagal 409 `INVALID_BOOKING_STATE` / 410 `BOOKING_EXPIRED` |
| `prisma.$transaction` + row-level lock | Anti double-booking wajib di level database (`SELECT ... FOR UPDATE`), bukan sekadar pengecekan status di kode |
| Decision Room `VACANT`? | Gagal → rollback + 409 `ROOM_ALREADY_LOCKED` |
| Transisi ganda satu transaction | `Room.status VACANT → BOOKING_PENDING` **dan** `Booking → WAITING_PAYMENT` di transaction yang **sama** - kalau dipisah, kamar bisa "nyangkut" desync (DATABASE v3.4 implementation requirement) |
| `paymentDeadline` | `approvedAt + 30 menit`, dihitung dari **approve**, bukan dari submit. Contoh: submit 10:00, approve 10:30 → deadline 11:00 |

Yang **tidak** dilakukan di sini: membuat record `Payment`. `Payment` merepresentasikan payment attempt individual dan baru dibuat saat guest memanggil `POST /payment` (halaman 8) - desain ini membuat retry natural tanpa logic "attempt pertama atau bukan".

Tiga jalur error semuanya routing lewat sisi kanan dan kembali ke daftar booking.

---

## HALAMAN 7 - Reject Booking (Tidak Digating)

Lane: **Owner**, **Sistem**. Endpoint: `POST /api/owner/bookings/:id/reject`.

Sama seperti approve, **tanpa** subscription gate - supaya booking tidak menggantung 24 jam tanpa owner bisa bertindak apa pun. Lebih sederhana karena tidak ada penguncian kamar: `Room.status` tetap `VACANT` (kamar memang belum pernah terkunci). Menyimpan `rejectedAt` + `rejectionReason` opsional, lalu notifikasi ke guest.

---

## HALAMAN 8 - Bayar Booking & Retry Pembayaran

Lane: **Verified Guest**, **Sistem**, **Midtrans**. Endpoint: `POST /api/bookings/:id/payment`.

| Langkah kunci | Detail |
|---|---|
| Decision `paymentDeadline` | Lewat deadline → booking sudah `CANCELLED` oleh cron, guest tidak bisa bayar lagi |
| Nominal server-side | `purpose = FULL_PAYMENT_UPFRONT` untuk MVP (`downPaymentPolicyType = NONE` satu-satunya yang aktif) |
| **Payment baru per attempt** | Setiap percobaan menghasilkan record `Payment` baru dengan `midtransOrderId` unik (misal `BOOKING-{id}-ATTEMPT-2`), **bukan overwrite** yang `FAILED`. Riwayat semua attempt tersimpan |
| Payment `FAILED` ≠ Booking `CANCELLED` | Booking **tetap** `WAITING_PAYMENT`, guest boleh retry selama masih dalam deadline |

Loop retry digambar eksplisit lewat routing sisi kanan kembali ke "Klik Bayar". Perhatikan bahwa transisi status yang sesungguhnya tidak terjadi di halaman ini - frontend hanya **memulai** transaksi Midtrans. Perubahan status nyata ada di halaman 9.

---

## HALAMAN 9 - Webhook Midtrans & Konversi Guest → Tenant

Lane: **Midtrans**, **Sistem**. Endpoint: `POST /api/webhooks/midtrans/booking`.

Halaman terpadat (21 node, 26 edge) karena memuat rantai validasi 5 langkah yang **wajib berurutan** (API v3.3):

| # | Validasi | Gagal → |
|---|---|---|
| 1 | Signature Midtrans valid? | Tolak, tidak ada perubahan status |
| 2 | `orderId` cocok `Payment.midtransOrderId`? | Tolak |
| 3 | `gross_amount` == `Payment.amount`? | Tolak - jangan percaya `transaction_status: settlement` tanpa cross-check nominal, ini menyangkut uang riil |
| 4 | `Payment.status` masih `PENDING`? (idempotency) | Abaikan event duplikat, balas 200 OK |
| 5 | `transaction_status` = settlement/capture? | `Payment → FAILED`, booking tetap `WAITING_PAYMENT` |

**Webhook Midtrans adalah satu-satunya source of truth status pembayaran.** Tidak ada endpoint yang bisa dipanggil frontend untuk menyatakan "saya sudah bayar".

Setelah lolos semua validasi, satu `prisma.$transaction()` mengerjakan:

1. `Payment → PAID`, `BookingRequest → FULLY_PAID`
2. **Identity matching**: cek apakah sudah ada Tenant/Guest dengan `googleSub` sama (fallback `email`) - cegah satu orang tercatat sebagai beberapa identitas. `phoneNumber` **tidak** dipakai sebagai kunci karena opsional & tidak diverifikasi (v3.6)
3. Buat `Tenant` (atau pakai yang sudah ada) + `RentalAgreement`
4. `Room.status → OCCUPIED` - di transaction yang sama, wajib
5. Generate `Invoice` pertama, `BookingRequest → CONVERTED_TO_TENANT`
6. Commit, ActivityLog `PAYMENT_SUCCESS` dengan `actorType = SYSTEM`
7. Notifikasi ke owner & tenant lewat Notification Service (bukan panggil Telegram/Email API langsung)

Idempotency (langkah 4) mencegah invoice ter-generate dua kali saat Midtrans retry.

---

## HALAMAN 10 - Tambah Property Baru (Digating)

Lane: **Owner**, **Sistem**. Endpoint: `POST /api/properties`.

Satu-satunya halaman dengan subscription gate nyata - kontras langsung dengan halaman 6 dan 7. Dua decision gating berurutan di `withSubscriptionGate()`:

| Decision | Gagal → |
|---|---|
| Status `TRIAL` / `ACTIVE` / `GRACE_PERIOD`? | 403 `SUBSCRIPTION_EXPIRED` |
| Jumlah property < `plan.maxProperties`? | 403 `SUBSCRIPTION_EXPIRED` (limit tier tercapai) |

Keduanya diarahkan ke halaman perpanjang/ganti paket, bukan dead end - owner harus selalu punya jalan keluar untuk membayar. Pola yang sama berlaku untuk `POST /api/rooms` (dicek ke `maxRooms`) dan `GET /api/dashboard/summary` (`advancedAnalyticsEnabled`).

---

## Aturan Bisnis Kunci yang Tercermin di Diagram

1. **Approve/reject booking tidak pernah digating** (PRD v3.5) - halaman 6 & 7 punya node eksplisit "TANPA subscription gate", bukan decision. Ini keputusan desain yang sengaja ditonjolkan supaya tidak salah diimplementasikan.
2. **Gating hanya pada scaling kapasitas & analitik lanjutan** - hanya halaman 10 yang punya decision gating.
3. **`Room.status` berubah saat approve, bukan saat submit** - halaman 5 punya node eksplisit "Room tetap VACANT", halaman 6 yang melakukan lock.
4. **Anti double-booking = atomic transaction + row-level lock** - digambar sebagai langkah nyata di halaman 6, bukan diasumsikan aman oleh urutan kode.
5. **Transisi `Room.status` dan `BookingRequest.status` selalu satu transaction** - halaman 6 dan 9 menggambarkannya sebagai satu node gabungan, bukan dua langkah terpisah.
6. **Webhook Midtrans satu-satunya source of truth pembayaran** - halaman 8 (guest) hanya memulai transaksi; halaman 9 (webhook) yang mengubah status.
7. **Payment attempt `FAILED` tidak membatalkan booking** - loop retry eksplisit di halaman 8.
8. **Idempotency webhook** - decision langkah 4 di halaman 9.
9. **Identity matching pakai `googleSub`, bukan nomor HP** - decision di halaman 9.

---

## Yang Sengaja Tidak Dibuat

| Alur | Alasan |
|---|---|
| `DP_PAID → WAITING_SETTLEMENT → FULLY_PAID` | Guardrail PRD Bab 7 & DATABASE Bab 8 melarang implementasi sampai settlement policy final (deadline pelunasan, konsekuensi lewat deadline, DP hangus/refundable). Stage 7 MVP hanya `downPaymentPolicyType = NONE`. Menggambarnya akan menjanjikan fitur yang belum boleh jalan |
| Refund | Transisi `REFUNDED` lewat rekonsiliasi manual di luar sistem; tidak ada endpoint self-service (PRD Bab 7) |
| Tenant portal / login penuh | Future scope, di luar Stage 1–9 (PRD Bab 13 poin 7) |
| CRUD lurus tanpa percabangan | List tenant, mark notification read, dsb - tidak bernilai sebagai activity diagram |

---

## Rencana Lanjutan (Tier 2 & 3, belum dibuat)

**Tier 2 - sangat direkomendasikan:**

| # | Alur | Aturan utama |
|---|---|---|
| 11 | Tambah Room Baru via RoomType | Gated `maxRooms`; `POST /api/rooms` wajib `roomTypeId` sejak Stage 5 |
| 12 | Cron: Auto-Expire Booking 24 Jam | `PENDING_APPROVAL` lewat `approvalDeadline` → `EXPIRED` + notifikasi |
| 13 | Cron: Auto-Cancel Payment Timeout 30 Menit | `WAITING_PAYMENT` → `CANCELLED`, Room kembali `VACANT`, satu transaction |
| 14 | Checkout / Perpanjang Subscription | Harga selalu server-side dari `planId`; checkout **tidak** mengubah `Subscription.status` |
| 15 | Cron: Siklus Hidup Subscription | `TRIAL → ACTIVE / GRACE_PERIOD (7 hari) → EXPIRED`; `EXPIRED` bisa kembali `ACTIVE`, bukan `CANCELLED` |
| 16 | Kirim Pesan Manual | Validasi recipient milik owner; cek `TelegramConnection = CONNECTED` → 409 `TELEGRAM_NOT_CONNECTED` |
| 17 | Connect Akun Telegram | `connectToken` single-use, expired 10 menit, deep-link `/start` |

**Tier 3 - opsional:** Generate & mark-paid Invoice, Tandai Kamar Maintenance, Hapus Property/Room + active dependency check (409 `ACTIVE_DEPENDENCY_EXISTS`), Lihat Analitik Lanjutan (gated), Cancel Subscription (tetap `ACTIVE` sampai `currentPeriodEnd`).

---

## Keputusan Desain yang Perlu Diratifikasi

1. **Gaya hitam-putih murni** dipilih agar konsisten dengan diagram TumbuhKita dan aman dicetak grayscale. Kalau ingin penanda merah untuk langkah digating (seperti use case diagram), ubah style di generator.
2. **Halaman 3 dan 4 dipisah** meski keduanya alur guest - halaman 3 berakhir tepat sebelum klik "Booking", halaman 4 mulai dari situ. Alternatifnya digabung jadi satu halaman panjang.
3. **Lane "Google" dan "Midtrans"** digambar sebagai lane terpisah (bukan catatan), supaya jelas langkah mana yang berada di luar kendali sistem.
4. **Fitur pesan** (halaman 16, Tier 2) akan digambar tanpa decision subscription - asumsi kirim pesan manual gratis. Ini masih ambigu di `Daftar-Fitur-Gratis-vs-Premium.md` bagian 4 dan perlu keputusanmu.

---

## Cara Pakai

1. Buka `Activity-Ngekost.drawio` di draw.io (app.diagrams.net) atau ekstensi Draw.io di VS Code.
2. Sepuluh tab di bawah kanvas = sepuluh halaman, bisa diekspor per halaman (PNG/PDF/SVG).
3. Untuk merevisi: **edit tabel `PAGES` di `gen_activity_ngekost.py`**, lalu jalankan `python3 gen_activity_ngekost.py`. Jangan edit XML-nya langsung - perubahan manual akan hilang saat regenerate.
4. Validasi struktural setelah regenerate:
   `python3 ~/.hermes/skills/creative/drawio-diagrams/scripts/validate_drawio.py Activity-Ngekost.drawio`

Format data satu halaman: `rows` adalah daftar baris, setiap baris berisi tuple `(tipe, label, indeks_lane)` dengan tipe `start` / `end` / `action` / `decision`. `edges` berisi `(key_sumber, key_tujuan, label)` dan opsional `"side"` untuk routing lewat sisi kanan. Key node otomatis `r{baris}-{kolom}`.
