# Laporan Audit Keamanan — Ngekost v3

Tanggal: 2026-10-05
Auditor: Hermes Agent (skill `security-best-practices` / `references/javascript-typescript-nextjs-web-server-security.md`)
Target: repo `ngekost`, Next.js 16.3.3 (App Router, Turbopack), TypeScript, Prisma + Supabase
Metode: static audit seluruh route handler + pengujian langsung terhadap dev server (`next dev -p 3000`)
Batas pengujian: non-destruktif. Tidak ada data produksi yang dimodifikasi permanen; satu notifikasi uji CSRF dibuat lewat admin Notice lalu dibersihkan dari DB.

---

## Ringkasan Eksekutif

Satu temuan **Critical** membuat aplikasi ini praktis tanpa autentikasi server-side. Cookie sesi `nk_session` hanya berisi JSON yang di-base64url (bukan ditandatangani, bukan dienkripsi), dan nilainya dipakai langsung sebagai objek `Profile` lengkap dengan `role` dan `adminRole`. Siapa pun yang bisa membuat cookie ADMIN palsu di browser-nya sendiri lalu memperoleh akses penuh ke API admin, tanpa password, tanpa Supabase, tanpa satu pun kredensial asli.

Di atas itu ada CSRF penuh pada semua endpoint state-changing yang berbasis cookie, absennya security header, dan beberapa masalah lain: kredensial demo plaintext yang tertanam di source, tidak adanya rate limiting pada login, dan webhook Telegram yang menerima update dari siapa pun.

| ID | Severity | Ringkasan |
|----|----------|-----------|
| F-01 | **Critical (DIPERBAIKI 2026-10-05)** | Cookie sesi tanpa tanda tangan → privilege escalation ke ADMIN penuh |
| F-02 | **High (DIPERBAIKI 2026-10-05)** | CSRF pada seluruh API (tidak ada Origin/token check) |
| F-03 | **High (DIPERBAIKI 2026-10-05)** | Middleware hanya cek *keberadaan* cookie, bukan validitasnya |
| F-04 | **High** | Tidak ada satu pun security header (CSP, nosniff, frame-ancestors) |
| F-05 | **Medium** | Kredensial demo plaintext + password tersimpan tanpa hash |
| F-06 | **Medium** | Tidak ada rate limiting pada login/register/OTP/webhook |
| F-07 | **Medium** | Webhook Telegram tidak mewajibkan secret token |
| F-08 | **Medium** | `/api/geocode` tanpa auth → penyeralahgunaan kuota API berbayar |
| F-09 | **Low** | `/api/me` melakukan upsert profil dari user_metadata (role dari metadata) |
| F-10 | **Low** | Log error webhook membocorkan pesan internal, dan GET webhook membocorkan status |

---

## Status Perbaikan (2026-10-05)

Perbaikan #1 sudah diterapkan dan diverifikasi: **F-01, F-02, dan F-03 tertutup**.
F-04 sampai F-10 masih terbuka.

### Yang diubah

| File | Perubahan |
|------|-----------|
| `src/server/session-token.ts` (baru) | Token sesi HMAC-SHA256 (`payload.signature`) berisi hanya `userId`, `email`, `exp`. Verifikasi `timingSafeEqual`, cek kedaluwarsa, validasi skema payload. Rahasia dari `SESSION_SECRET`, fallback turunan `SUPABASE_SECRET_KEY`. |
| `src/server/user-store.ts` | `setSessionCookie` menulis token bertanda tangan; `role`/`adminRole` tidak lagi masuk cookie. `getSessionCookie` memverifikasi tanda tangan dan mengembalikan null bila gagal. `profileFromSession` jadi fail-closed (SEEKER) tanpa sumber otoritatif. |
| `src/server/auth.ts` | `getAuthContext` memakai `resolveAuthoritativeProfile`: role hanya dari database atau store akun lokal. Kegagalan DB tidak lagi jatuh ke kredensial cookie. `adminRole` fallback dihapus dari jalur Supabase. |
| `src/server/http.ts` | `withApi` memvalidasi Origin untuk method non-safe; allowlist = `APP_ORIGIN` + `NEXT_PUBLIC_SITE_URL` + origin request sendiri + `x-forwarded-host`. Handler tanpa argumen `Request` ditolak (fail-closed). |
| `src/proxy.ts` | Middleware memakai `verifySessionToken` alih-alih `request.cookies.has()`. |
| `src/server/session-token.test.ts` (baru) | 10 test: replay payload unsigned, tanda tangan salah, payload di-tamper, kedaluwarsa, kebocoran field role. |
| `src/server/http.test.ts` | 7 test proteksi Origin: same-origin, cross-site, simple request tanpa Origin, method aman, fail-closed, `APP_ORIGIN` dari env. |
| `.env.example` | Dokumentasi `SESSION_SECRET` dan `APP_ORIGIN`. |

`npm test` 54/54 pass (dari 37), `npm run typecheck` clean, ESLint bersih pada semua file yang diubah.

### Bukti verifikasi (dev server, `next dev -p 3000`)

Cookie ADMIN palsu versi lama (`base64url(JSON)` tanpa tanda tangan):

```
GET /api/me           -> 401 UNAUTHENTICATED   (sebelumnya 200 + role ADMIN)
GET /api/admin/users  -> 401 UNAUTHENTICATED   (sebelumnya 200 + daftar user)
/id/dashboard         -> 307 ke /id/login      (sebelumnya 200, 151.035 byte HTML)
```

Sesi admin asli:

```
login -> 200, Set-Cookie nk_session (168 char, bertanda tangan)
payload cookie: {userId, email, exp}          <- tidak ada role/adminRole
GET /api/me          -> 200 role=ADMIN adminRole=SUPER   <- dari DB/store, bukan cookie
GET /api/admin/users -> 200, 15 user
```

Penolakan tak terduga:

```
tanda tangan diubah 1 karakter   -> 401
payload unsigned (eksploit lama)  -> 401
POST cross-site + cookie valid   -> 403 INVALID_ORIGIN
POST tanpa header Origin         -> 403 INVALID_ORIGIN
```

Regresi register: register seeker baru -> 201 + cookie; `/api/me` langsung -> 200 SEEKER; login ulang -> 200; logout -> 200.

### Status deploy (diperbarui 2026-10-05)

`SESSION_SECRET` sudah diisi di `.env.local` (64 karakter) dan terverifikasi benar-benar
dipakai menandatangani cookie, bukan turunan `SUPABASE_SECRET_KEY`:

```
matches SESSION_SECRET (explicit): True
matches sha256(...SUPABASE_SECRET_KEY): False
matches sha256(...dev-only fallback): False
nk_session=<redacted>; Path=/; Max-Age=604800; HttpOnly; SameSite=lax
```

Flag `Secure` tidak muncul pada respons di atas karena verifikasi berjalan di HTTP
localhost. Di produksi HTTPS flag itu otomatis aktif lewat
`secure: process.env.NODE_ENV === "production"`.

Yang masih perlu dibereskan sebelum produksi:

| Item | Kondisi sekarang | Dampak |
|------|------------------|--------|
| `APP_ORIGIN` | belum diisi | CSRF allowlist jatuh ke `NEXT_PUBLIC_SITE_URL` + origin request. Untuk single-origin ini tetap aman, tapi isi env ini agar origin dikunci eksplisit. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Dipakai untuk link verifikasi email (`src/app/api/auth/register/route.ts:43`), `robots.txt`, dan `sitemap.xml`. Kalau tidak diubah ke domain produksi, email konfirmasi mengarah ke localhost. |
| `TELEGRAM_WEBHOOK_SECRET` | belum diisi | F-07 tetap terbuka penuh di produksi. Bot Telegram bisa diperintah siapa pun. |
| `MIDTRANS_IS_PRODUCTION` | `false` | Endpoint masih sandbox. Wajib `true` + key produksi saat itu. |
| `NODE_ENV` | tidak di-set di file | Pastikan platform deploy menyetel `NODE_ENV=production`, kalau tidak flag `Secure` pada cookie tidak aktif. |

### Catatan penting

- **SESSION_SECRET belum diisi di `.env.local`.** Sesi saat ini ditandatangani dengan rahasia turunan dari `SUPABASE_SECRET_KEY`, jadi tetap berfungsi, tapi setiap kali `SUPABASE_SECRET_KEY` dirotasi semua sesi ikut mati. Isi `SESSION_SECRET` dengan `openssl rand -base64 48` sebelum produksi.
- **Origin wajib untuk semua POST dari browser.** Form HTML biasa tidak bisa mengirim header `Origin` yang sama dengan nilainya sendiri. Semua fetch di repo memakai `fetch()` dengan `content-type: application/json` yang memicup preflight sehingga `Origin` terkirim - alur yang sudah diuji lolos. Kalau nanti ada integrasi pihak ketiga yang POST tanpa `Origin`, itu akan ditolak dengan 403 yang bisa dibaca sebagai bug; alurnya harus pakai `fetch` JSON.
- **Logout tidak merevoke token** (stateless, tanpa blacklist). Token yang sudah terbit masih valid sampai `exp`. Ini perilaku pre-existing, bukan regresi, tetapi layak ditangani terpisah bila revocation dibutuhkan.
- Sesi yang terbit sebelum deploy ini otomatis tidak berlaku (payload lama tidak bertanda tangan), jadi semua pengguna diminta login ulang sekali.

---

## F-01 — Cookie sesi tanpa tanda tangan (CRITICAL)

**Rule:** NEXT-SESS-002 / NEXT-AUTH-001
**Lokasi:** `src/server/user-store.ts:116-138`, dikonsumsi di `src/server/auth.ts:14-45`

Kode:

```ts
// src/server/user-store.ts:116
export async function setSessionCookie(user: SessionPayload) {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(user)).toString("base64url");
  cookieStore.set("nk_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSessionCookie(): Promise<SessionPayload | null> {
  // ...
  const json = Buffer.from(cookie.value, "base64url").toString("utf-8");
  return JSON.parse(json) as SessionPayload;   // <-- tanpa verifikasi
}
```

`getAuthContext()` (src/server/auth.ts:18) langsung memakai `profileFromSession(session)` sebagai `Profile` yang trusted, termasuk `role` dan `adminRole`. Query DB hanya berjalan kalau `session.userId` berupa UUID yang benar-benar ada di tabel `profile`; untuk ID non-UUID (atau UUID yang tidak ada) code path `catch`/`dbProfile == null` jatuh kembali ke payload cookie attacker.

**PoC (terverifikasi, dijalankan terhadap dev server):**

```
$ # cookie ADMIN palsu, dibuat dari nol tanpa kredensial apa pun
$ python3 -c "
import base64, json
p = {'userId':'attacker-forged-0001','email':'attacker@evil.test',
     'fullName':'Attacker Forged','role':'ADMIN','adminRole':'SUPER'}
print('nk_session=' + base64.urlsafe_b64encode(json.dumps(p).encode()).decode().rstrip('='))"

$ curl -s -H "Cookie: $FORGED" http://localhost:3000/api/me
{"success":true,"data":{"id":"attacker-forged-0001","email":"attacker@evil.test",
 "role":"ADMIN","adminRole":"SUPER", ...}}

$ curl -s -H "Cookie: $FORGED" http://localhost:3000/api/admin/users
{"success":true,"data":[{"id":"ff1b8718-...","email":"maguireharry339@gmail.com",
 "fullName":"Harry Maguire","role":"SEEKER","status":"ACTIVE", ...}, ...]}
```

`GET /api/admin/users` memerlukan `requireUser(["ADMIN"])` (src/app/api/admin/users/route.ts:6) dan tetap lolos. Diff: 151.035 byte HTML halaman dashboard ter-render penuh untuk cookie palsu, sedangkan permintaan anonim hanya 32 byte (redirect).

Tanpa password yang benar, cookie palsu sudah cukup: penyerang tidak pernah menyentuh Supabase, tidak pernah melewati `verifyLocalPassword`, dan tidak perlu akun apa pun. Seberapa luas dampaknya — daftar pengguna, pengumuman massal, moderasi review, verifikasi, perpindahan role, konfirmasi pembayaran — semuanya berada di balik `requireUser` yang keliru karena mempercayai cookie.

Catatan verifikasi: `PATCH /api/me` menolak body `{"role":"ADMIN"}` (schema `.strict()` di src/server/validation.ts:115), jadi eskalasi via request body bukan vektor. Vektor tunggalnya adalah memalsukan cookie-nya sendiri.

---

## F-02 — CSRF pada seluruh API (HIGH)

**Rule:** NEXT-CSRF-001
**Lokasi:** `src/server/http.ts:92-105` (`withApi`), semua `src/app/api/**/route.ts`

`withApi` hanya menangkap error; tidak ada pemeriksaan Origin, Referer, atau token CSRF. Semua endpoint state-changing menggunakan cookie `nk_session` dengan `sameSite: "lax"`, yang tetap mengirim cookie pada POST lintas situs yang di-*initiate* form.

**PoC (terverifikasi):**

```
$ curl -X POST http://localhost:3000/api/admin/notices \
    -H "Content-Type: application/json" -H "Origin: https://evil.example" \
    -H "Cookie: $FORGED_ADMIN" \
    -d '{"target":"semua","title":"CSRF Proof Notice","body":"..."}'
{"success":true,"data":{"count":13,"title":"CSRF Proof Notice","target":"semua"}}

$ # dan via simple request (tanpa preflight):
$ curl -X POST ... -H "Content-Type: text/plain" -H "Origin: https://evil.example" ...
{"success":true,"data":{"count":13,"title":"CSRF Simple Req","target":"semua"}}
```

Origin `https://evil.example` diterima tanpa pemeriksaan. Notifikasi dibuat untuk 13 pengguna aktif. Dampak: setiap aksi admin yang públicamente Reachabel bisa dipicu dari halaman penyerang milik pihak ketiga.

---

## F-03 — Middleware hanya memeriksa keberadaan cookie (HIGH)

**Rule:** NEXT-AUTH-002
**Lokasi:** `src/proxy.ts:20-30`

```ts
const hasSession = !!user || request.cookies.has("nk_session");
```

`request.cookies.has()` hanya memastikan ada *sesuatu* dengan nama itu — tidak memvalidasi tanda tangan, tidak memverifikasi ke database. Dikombinasikan dengan F-01, halaman yang dilindungi (`/id/dashboard`, `/id/admin`, `/id/owner`) ter-render untuk cookie palsu. Middleware memberi rasa aman yang tidak ada.

---

## F-04 — Tidak ada security header (HIGH)

**Rule:** NEXT-HEADERS-001 / NEXT-CSP-001
**Lokasi:** `next.config.ts` (tidak ada `headers()`), `src/proxy.ts` (tidak ada set header)

Respons terverifikasi pada `GET /id/dashboard`:

```
X-Powered-By: Next.js
Cache-Control: no-cache, must-revalidate
x-nextjs-prerender: 1
```

Tidak ada `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, maupun `Permissions-Policy`. Halaman admin bisa di-embed di iframe (clickjacking), dan tidak ada batasan script. Satu-satunya `dangerouslySetInnerHTML` di repo ada di `src/components/ui/chart.tsx:94` (shadcn chart wrapper, isinya konfigurasi chart lokal — bukan temuan XSS), tapi CSP tetapTtNeeded sebagai defense-in-depth.

Catatan: `X-Powered-By` masih bernilai default di Next.js 16 — hilangkan dengan `poweredByHeader: false`.

---

## F-05 — Kredensial demo plaintext + password tanpa hash (MEDIUM)

**Rule:** NEXT-SECRETS-001
**Lokasi:** `src/server/user-store.ts:19-67`, `:95-102`

```ts
const userStore = new Map<string, StoredUser>([
  ["admin@ngekost.id", { ... passwordHash: "Password123!", role: "ADMIN", adminRole: "SUPER" }],
  ["owner@ngekost.id", { ... passwordHash: "Password123!", telegramChatId: "8169372099", telegramUsername: "spawn2pwn" }],
  ["ngekostygocrudemo@uberip.com", { ... passwordHash: "NgekostDemo#2026" }],
  ["informatikappg@gmail.com", { ... passwordHash: "Password123!" }],
]);

export function verifyLocalPassword(email, password) {
  const user = findLocalUser(email);
  if (!user) return null;
  if (user.passwordHash === password) return user;   // plaintext compare
  return null;
}
```

Password disimpan apa adanya — field bernama `passwordHash`stores plaintext. Register lokal (`registerLocalUser`, :73) juga menaruh password mentah. Akun admin dengan kredensial yang tertulis di source adalah temuan yang berdiri sendiri di luar F-01: siapa pun yang membaca repo (atau clone fork) punya akses admin.

---

## F-06 — Tidak ada rate limiting (MEDIUM)

**Rule:** NEXT-DOS-001
**Lokasi:** `src/app/api/auth/login/route.ts`, `register`, `resend-otp`, `verify-otp`, `src/app/api/webhooks/telegram/route.ts`

Tidak ada throttle/throttle logika di seluruh `src/` (grep `ratelimit|throttle` → 0 hasil). Pengujian 12 percobaan login gagal beruntun langsung diproses; respons 422 → 401 tanpa jeda maupun blokir.

```
$ for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"admin@ngekost.id","password":"wrong-'$i'"}' \
    http://localhost:3000/api/auth/login; done
422 422 422 422 422 422 422 422 422 401 401 401
```

Dengan kredensial demo yang diketahui (F-05), brute force seperti ini tidak perlu dihinder. `resend-otp` juga tidak dibatasi sehingga bisa dipakai untuk membanjiri email ke alamat pihak ketiga.

---

## F-07 — Webhook Telegram tanpa verifikasi secret (MEDIUM)

**Rule:** NEXT-WEBHOOK-001
**Lokasi:** `src/app/api/webhooks/telegram/route.ts:6-14`

```ts
const { webhookSecret } = getTelegramConfig();
if (webhookSecret) {                       // <-- hanya dievaluasi bila env diset
  const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (incomingSecret !== webhookSecret) return 401;
}
const update = await request.json();        // tanpa validasi skema
```

Secret bersifat opsional; bila `TELEGRAM_WEBHOOK_SECRET` tidak diisi, endpoint terbuka penuh. Body tidak divalidasi sebelum diteruskan ke `processTelegramWebhookUpdate`.

**PoC (terverifikasi):**

```
$ curl -X POST http://localhost:3000/api/webhooks/telegram \
    -H "Content-Type: application/json" \
    -d '{"update_id":999999,"message":{"message_id":1,"chat":{"id":1},"text":"/start"}}'
{"ok":true,"result":{"handled":true,"action":"antispam_guidance_sent"}}
```

Bot bisa diperintah oleh siapa pun. Dan `GET` handler mengembalikan `{"status":"Telegram webhook endpoint is active"}`  — memudahkan reconnaissance.

---

## F-08 — `/api/geocode` terbuka tanpa autentikasi (MEDIUM)

**Rule:** NEXT-DOS-001 / NEXT-SSRF-001 (partial)
**Lokasi:** `src/app/api/geocode/route.ts:4`

Endpoint ini adalah proxy ke Geoapify berbayar dengan kunci API yang dijaga di server (`process.env.GEOAPIFY_API_KEY`, src/app/api/geocode/route.ts:11). Tanpa auth maupun rate limit, siapa pun bisa memakai kuota akun Anda; parameter `text` juga diteruskan tanpa batas panjang (maksimal dari sisi upstream).

```
$ curl "http://localhost:3000/api/geocode?text=Jakarta"   # tanpa cookie
{"features":[{"name":"Daerah Khusus Ibukota Jakarta", ...}]}
```

---

## F-09 — Role profil diturunkan dari user_metadata (LOW)

**Rule:** NEXT-AUTH-001
**Lokasi:** `src/server/auth.ts:10-12,61-73`, `src/app/auth/callback/route.ts:9,60-79`

`requestedRole()` membaca `user.user_metadata?.role`, dan `prisma.profile.upsert` pada `create` memakainya sebagai `role`. Metadata Supabase bisa diubah oleh pengguna sendiri melalui dashboard/Identity API pada banyak konfigurasi proyek, sehingga role bukan sumber kebenaran yang tepercaya. `src/app/auth/callback/route.ts:9` juga menerima `?role=owner` dari query string dan—when `intent=register`—menulisnya ke profil (callback:71). Setelah F-01 diperbaiki, ini jalur eskalasi sekunder yang perlu ditutup.

---

## F-10 — Kebocoran detail pada log dan respons (LOW)

**Rule:** NEXT-LOG-001 / NEXT-ERROR-001

- `src/app/api/webhooks/telegram/route.ts:21-23` — `err?.message` dikembalikan ke klien dalam body JSON.
- `src/app/api/webhooks/telegram/route.ts:27-29` — GET handler mengonfirmasi keberadaan endpoint.
- `src/app/api/geocode/route.ts:56,102` — `String(err)` dikembalikan ke klien, berpotensi memuat URL internal beserta nama host dan, pada beberapa kasus, kunci API di pathname (`...apiKey=...`).
- `src/app/api/auth/resend-otp/route.ts:21` — `error.message` mentah dari Supabase diteruskan ke klien; pesan Supabase biasanya membocorkan apakah email terdaftar.

---

## Yang sudah benar (untuk dipertahankan)

- Zod dipakai konsisten di setiap route yang menerima input, dengan `.strict()` dan batas panjang/tipe. Tidak ada SQL string-building di repo (selnya Prisma parameterize).
- Tidak ada `eval`/`new Function`/`child_process` di `src/`.
- Upload gambar memvalidasi MIME lewat magic bytes (`detectImageMime`), memakai nama acak (`randomUUID()`), batas 5 MB, dan penyimpanan di luar `public/`.
- Verifikasi signature Midtrans memakai `crypto.timingSafeEqual` (src/server/midtrans.ts:149).
- Otorisasi lintas-pemilik di booking/invoice dikunci di service layer (`getBooking` src/server/booking-service.ts:107) — pengujian dengan cookie SEEKER palsu tetap menghasilkan 403 yang benar pada booking orang lain.
- `Cache-Control: no-store` disetel pada respons API sensitif (src/server/http.ts:30).
- `.env*` di-gitignore, hanya `.env.example` yang ter-commit; tidak ada `NEXT_PUBLIC_` yang sensitif.

---

## Urutan perbaikan yang disarankan

1. **Ganti mekanisme sesi.** Berhenti memercayai payload cookie. T-signed: gunakan Supabase session cookie sebagai satu-satunya sumber kebenaran, atau tambahkan HMAC-SHA256 (secret dari env) pada payload dan verifikasi dengan `timingSafeEqual` saat baca. Hilangkan `role`/`adminRole` dari cookie sepenuhnya —authorize dari DB setiap request.
2. **Perbaiki middleware** agar memakai `getAuthContext()`/verifikasi cookie, bukan `request.cookies.has()`.
3. **Tambahkan proteksi CSRF.** Validasi header `Origin` terhadap allowlist (`APP_ORIGIN`) di `withApi` untuk semua method non-GET, plus token double-submit untuk browser form. Ini menutup F-02 sekaligus membatasi dampak F-01.
4. **Security header** di `next.config.ts` via `headers()`: CSP (script-src ketat), `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, plus `poweredByHeader: false`.
5. **Hash password demo** dengan bcrypt/argon2 dan pindahkan kredensial demo ke `.env.local`/seed, bukan source.
6. **Rate limit** pada `auth/login`, `auth/register`, `auth/resend-otp`, `geocode`, dan webhook (IP + email, sliding window).
7. **Paksa** `TELEGRAM_WEBHOOK_SECRET` di env + validasi skema body; ubah GET menjadi 404.
8. **Tutup `/api/geocode`** dengan auth minimal (atau kuota harian per IP) dan sanitasi pesan error.

Setiap langkah harus diuji ulang terhadap regression test auth yang ada (`src/server/http.test.ts`, `telegram-service.test.ts`, `storage.test.ts`, `booking-identifier.test.ts`) plus `npm run typecheck` dan `npm test`.