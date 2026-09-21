#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator activity diagram Ngekost - gaya Siedu.

Referensi visual: Activity Diagram Siedu.drawio
  - swimlane asli (node parent-nya lane)
  - start = ellipse terisi; end = UML endState
  - fork/join = batang horizontal (bar 5x160, rotation=90) HANYA di lane Sistem
  - pola fork: kiri "memasukkan data ke database" || kanan "menampilkan halaman/pesan"
  - edge orthogonal; guard label [dalam kurung siku]
  - login + register DIGABUNG per role (Owner / Guest / Tenant)

Cara pakai: python3 gen_activity_ngekost.py
JANGAN edit file .drawio hasilnya - regenerate.
"""
import xml.sax.saxutils as sax
import xml.etree.ElementTree as ET

# ---------------------------------------------------------------- styles (Siedu)
ST_LANE     = "swimlane;whiteSpace=wrap;html=1;startSize=23;horizontal=1;fontStyle=1;fontSize=12;fillColor=#f5f5f5;strokeColor=#000000;"
ST_START    = "ellipse;html=1;fillColor=#000000;strokeColor=#000000;"
ST_END      = "ellipse;html=1;shape=endState;fillColor=strokeColor;"
ST_ACTION   = "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=11;"
ST_DECISION = "rhombus;whiteSpace=wrap;html=1;shapeInside=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=10;"
ST_FORK     = "html=1;points=[];perimeter=orthogonalPerimeter;fillColor=#000000;strokeColor=#000000;rotation=90;"
ST_EDGE     = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontSize=10;"
ST_TITLE    = "text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;fontSize=18;fontStyle=1;"

LANE_H_PAD = 23          # swimlane header
ACT_W, ACT_H = 150, 60
DEC_W, DEC_H = 120, 80
SE_WH = 30               # start/end
FORK_W, FORK_H = 5, 160  # unrotated; rotation=90 → batang horizontal 160x5
GAP_Y = 30
LANE_GAP = 0             # Siedu: lanes menempel
Y0 = 80                  # top of lanes
TITLE_Y = 30

ACTOR_W = 320
SYS_W   = 480            # muat 2 action 150 + padding
EXT_W   = 300            # Google / Midtrans


def esc(s):
    return sax.escape(s).replace("\n", "&#xa;")


def lane_widths(lanes):
    w = []
    for name in lanes:
        n = name.lower()
        if n in ("sistem", "system"):
            w.append(SYS_W)
        elif n in ("google", "midtrans", "resend"):
            w.append(EXT_W)
        else:
            w.append(ACTOR_W)
    return w


# ---------------------------------------------------------------- pages
# rows: list of nodes on a band. node = (type, label, lane)
#   type: start | end | action | decision | fork | join
#   fork/join: label diabaikan, selalu di lane Sistem (cari index "Sistem")
#   dua action di lane Sistem yang sama pada 1 row = cabang paralel fork
# edges: (src, dst, label[, "side"])
#   label guard otomatis dibungkus [] jika belum
PAGES = [
    dict(name="1. Registrasi & Verifikasi OTP Email",
         title="Registrasi Akun dan Verifikasi OTP Email",
         lanes=["User", "Sistem", "Resend"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman register\n& isi data diri", 0)],
        [("action", "submit form pendaftaran", 0)],
        [("action", "validasi data &\ngenerate OTP 8 digit", 1)],
        [("action", "kirim email berisi\nkode OTP 8 digit", 2)],
        [("action", "buka email &\nsalin kode OTP", 0)],
        [("action", "input kode OTP 8 digit\ndi halaman verifikasi", 0)],
        [("action", "validasi kode OTP\nke server auth", 1)],
        [("decision", "kode OTP valid\n& belum expired?", 1)],
        [("fork", "", 1)],
        [("action", "update status akun\nmenjadi ACTIVE", 1),
         ("action", "buat session login\n& token autentikasi", 1)],
        [("join", "", 1)],
        [("action", "menampilkan dashboard\npengguna", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r6-0", "salah / expired", "side"),
        ("r8-0", "r9-0", "valid"),
        ("r9-0", "r10-0", ""),
        ("r9-0", "r10-1", ""),
        ("r10-0", "r11-0", ""),
        ("r10-1", "r11-0", ""),
        ("r11-0", "r12-0", ""),
        ("r12-0", "r13-0", ""),
    ]),

    dict(name="2. Login Akun Pengguna",
         title="Login Akun Pengguna (Email & Google OAuth)",
         lanes=["User", "Sistem", "Google"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman login", 0)],
        [("action", "menampilkan pilihan\nmetode login", 1)],
        [("decision", "pilih metode?", 0)],
        [("action", "input email\n& password", 0)],
        [("action", "klik tombol\nLogin dengan Google", 0)],
        [("action", "verifikasi password\n(bcrypt / hash)", 1)],
        [("action", "redirect ke Google\nOAuth consent", 2)],
        [("action", "pilih akun Google\n& beri izin", 0)],
        [("action", "terima callback &\nverifikasi ID token", 1)],
        [("decision", "kredensial valid?", 1)],
        [("fork", "", 1)],
        [("action", "buat session login\n& set cookie JWT", 1),
         ("action", "menampilkan pesan\nsukses login", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nberanda / dashboard", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "email/password"),
        ("r3-0", "r5-0", "google oauth"),
        ("r4-0", "r6-0", ""),
        ("r5-0", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r6-0", "r10-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r2-0", "gagal", "side"),
        ("r10-0", "r11-0", "sukses"),
        ("r11-0", "r12-0", ""),
        ("r11-0", "r12-1", ""),
        ("r12-0", "r13-0", ""),
        ("r12-1", "r13-0", ""),
        ("r13-0", "r14-0", ""),
        ("r14-0", "r15-0", ""),
    ]),

    dict(name="3. Cari & Filter Kost (Listing Publik)",
         title="Cari dan Filter Kost",
         lanes=["User", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman\nlisting publik", 0)],
        [("action", "menampilkan katalog\nkos terverifikasi", 1)],
        [("action", "isi filter kota,\nharga, fasilitas, tipe", 0)],
        [("action", "query kos sesuai\nparameter filter", 1)],
        [("decision", "ada hasil cocok?", 1)],
        [("action", "tampilkan notifikasi\n'kos tidak ditemukan'", 1)],
        [("action", "tampilkan kartu kos\n+ info ketersediaan", 1)],
        [("action", "pilih salah satu kos\nyang diminati", 0)],
        [("action", "menampilkan halaman\ndetail kos", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", "tidak"),
        ("r6-0", "r3-0", "ubah filter", "side"),
        ("r5-0", "r7-0", "ya"),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
    ]),

    dict(name="4. Detail Kos & Simpan Favorit",
         title="Melihat Detail Kos dan Menyimpan Favorit",
         lanes=["User", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman\ndetail kos (/kost/slug)", 0)],
        [("action", "menampilkan foto,\nfasilitas, harga, ulasan", 1)],
        [("action", "klik ikon hati\n(Simpan Favorit)", 0)],
        [("action", "cek status login\npengguna", 1)],
        [("decision", "sudah login?", 1)],
        [("action", "tampilkan modal login\ndi tempat", 1)],
        [("fork", "", 1)],
        [("action", "simpan kos ke tabel\nfavorites pengguna", 1),
         ("action", "ubah tampilan ikon\nmenjadi aktif", 1)],
        [("join", "", 1)],
        [("action", "menampilkan daftar\nfavorit di dashboard", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", "belum"),
        ("r6-0", "r3-0", "login berhasil", "side"),
        ("r5-0", "r7-0", "sudah"),
        ("r7-0", "r8-0", ""),
        ("r7-0", "r8-1", ""),
        ("r8-0", "r9-0", ""),
        ("r8-1", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r11-0", ""),
    ]),

    dict(name="5. Ajukan Booking Sewa Kost",
         title="Ajukan Booking Sewa Kost",
         lanes=["User", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "klik Ajukan Sewa &\npilih tipe kamar", 0)],
        [("action", "menampilkan formulir\npengajuan sewa", 1)],
        [("action", "pilih tgl mulai, durasi\n& lengkapi data pemesan", 0)],
        [("action", "submit pengajuan\nsewa kos", 0)],
        [("action", "validasi ketersediaan\nkamar & data pemesan", 1)],
        [("decision", "kamar tersedia?", 1)],
        [("action", "tampilkan pesan\nkamar penuh", 1)],
        [("fork", "", 1)],
        [("action", "buat record Booking\nstatus PENDING", 1),
         ("action", "menampilkan ringkasan\npengajuan booking", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nstatus booking diajukan", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", "tidak"),
        ("r7-0", "r1-0", "pilih kamar lain", "side"),
        ("r6-0", "r8-0", "ya"),
        ("r8-0", "r9-0", ""),
        ("r8-0", "r9-1", ""),
        ("r9-0", "r10-0", ""),
        ("r9-1", "r10-0", ""),
        ("r10-0", "r11-0", ""),
        ("r11-0", "r12-0", ""),
    ]),

    dict(name="6. Bayar Booking Sewa (Midtrans)",
         title="Bayar Booking Sewa (Midtrans)",
         lanes=["User", "Sistem", "Midtrans"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman booking\n& klik Bayar Sekarang", 0)],
        [("action", "cek batas waktu bayar\n(payment deadline)", 1)],
        [("decision", "masih dalam batas\nwaktu bayar?", 1)],
        [("action", "tampilkan status\nbooking expired", 1)],
        [("action", "generate Snap token\n& record Payment baru", 1)],
        [("action", "buka popup Snap\npembayaran", 2)],
        [("action", "pilih metode bayar\n(VA / QRIS / GoPay)", 0)],
        [("action", "selesaikan transfer\ndi channel terkait", 0)],
        [("action", "proses status bayar\n(settlement / pending)", 2)],
        [("decision", "pembayaran berhasil\nsettlement?", 2)],
        [("action", "tampilkan opsi\ncoba bayar lagi", 1)],
        [("action", "menampilkan notifikasi\npembayaran diterima", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "tidak"),
        ("r4-0", "r13-0", ""),
        ("r3-0", "r5-0", "ya"),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r11-0", "gagal"),
        ("r11-0", "r1-0", "retry", "side"),
        ("r10-0", "r12-0", "berhasil"),
        ("r12-0", "r13-0", ""),
    ]),

    dict(name="7. Konfirmasi Pembayaran & Status Tenant",
         title="Konfirmasi Pembayaran dan Konversi Menjadi Tenant",
         lanes=["Midtrans", "Sistem", "Tenant"], rows=[
        [("start", "", 0)],
        [("action", "kirim webhook notifikasi\npembayaran settlement", 0)],
        [("action", "validasi signature\n& nominal transaksi", 1)],
        [("decision", "data webhook valid?", 1)],
        [("action", "tolak webhook (400)", 1)],
        [("fork", "", 1)],
        [("action", "update Booking & buat\nRentalAgreement aktif", 1),
         ("action", "buat akun Tenant &\nkunci Room OCCUPIED", 1)],
        [("join", "", 1)],
        [("action", "buka dashboard tenant\n(/tenant/dashboard)", 2)],
        [("action", "menampilkan data kamar,\nkontrak & fasilitas", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "tidak"),
        ("r4-0", "r10-0", ""),
        ("r3-0", "r5-0", "ya"),
        ("r5-0", "r6-0", ""),
        ("r5-0", "r6-1", ""),
        ("r6-0", "r7-0", ""),
        ("r6-1", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
    ]),

    dict(name="8. Bayar Tagihan Sewa Bulanan",
         title="Pembayaran Tagihan Sewa Bulanan oleh Tenant",
         lanes=["Tenant", "Sistem", "Midtrans"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman tagihan\n(/tenant/bills)", 0)],
        [("action", "menampilkan daftar\ninvoice belum lunas", 1)],
        [("action", "klik tombol\nBayar Tagihan", 0)],
        [("action", "generate Snap token\n& buat record Payment", 1)],
        [("action", "tampilkan popup\nMidtrans Snap", 2)],
        [("action", "pilih metode bayar\n(VA / QRIS / GoPay)", 0)],
        [("action", "selesaikan bayar\ndi channel terkait", 0)],
        [("action", "kirim webhook notifikasi\nke Sistem", 2)],
        [("action", "validasi signature\n& status transaksi", 1)],
        [("decision", "transaksi sukses\nsettlement?", 1)],
        [("fork", "", 1)],
        [("action", "update Invoice PAID\n& Payment VERIFIED", 1),
         ("action", "kirim receipt bukti\nbayar ke tenant", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\ntagihan lunas", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r2-0", "gagal / pending", "side"),
        ("r10-0", "r11-0", "sukses"),
        ("r11-0", "r12-0", ""),
        ("r11-0", "r12-1", ""),
        ("r12-0", "r13-0", ""),
        ("r12-1", "r13-0", ""),
        ("r13-0", "r14-0", ""),
        ("r14-0", "r15-0", ""),
    ]),

    dict(name="9. Pengaduan Keluhan Kamar",
         title="Pengaduan Keluhan Kamar oleh Tenant",
         lanes=["Tenant", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka menu pengaduan\n(/tenant/complaints)", 0)],
        [("action", "menampilkan form\npengaduan keluhan", 1)],
        [("action", "pilih kategori keluhan\n& isi judul deskripsi", 0)],
        [("action", "submit tiket\npengaduan", 0)],
        [("action", "validasi sewa aktif\n& simpan tiket OPEN", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "tampilkan konfirmasi\ntiket terkirim", 1)],
        [("join", "", 1)],
        [("action", "lihat pembaruan status\ntiket di dashboard", 0)],
        [("action", "menampilkan status\nIN_PROGRESS / RESOLVED", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r6-0", "r7-1", ""),
        ("r7-0", "r8-0", ""),
        ("r7-1", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r11-0", ""),
    ]),

    dict(name="10. Beri Ulasan dan Rating Kos",
         title="Memberikan Ulasan dan Rating Kos oleh Tenant",
         lanes=["Tenant", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman sewa\n& klik Beri Ulasan", 0)],
        [("action", "menampilkan modal\nrating & ulasan", 1)],
        [("action", "pilih bintang 1-5 &\ntulis pengalaman kos", 0)],
        [("action", "submit ulasan", 0)],
        [("action", "validasi status sewa\n& cek ulasan ganda", 1)],
        [("decision", "belum pernah\nulas kos ini?", 1)],
        [("fork", "", 1)],
        [("action", "simpan review &\nhitung rata-rata", 1),
         ("action", "tampilkan ulasan\ndi listing kos", 1)],
        [("join", "", 1)],
        [("action", "menampilkan pesan\nterima kasih atas ulasan", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r2-0", "sudah pernah", "side"),
        ("r6-0", "r7-0", "belum pernah"),
        ("r7-0", "r8-0", ""),
        ("r7-0", "r8-1", ""),
        ("r8-0", "r9-0", ""),
        ("r8-1", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r11-0", ""),
    ]),

    dict(name="11. Laporkan Kos Bermasalah",
         title="Melaporkan Kos Bermasalah oleh Pengguna",
         lanes=["User", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "klik tombol\nLaporkan Kos", 0)],
        [("action", "menampilkan modal\npelaporan kos", 1)],
        [("action", "pilih alasan laporan\n& isi kronologi", 0)],
        [("action", "submit laporan", 0)],
        [("action", "validasi input &\nsimpan status OPEN", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "tampilkan konfirmasi\nlaporan diterima", 1)],
        [("join", "", 1)],
        [("action", "menampilkan notifikasi\nlaporan akan ditinjau", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r6-0", "r7-1", ""),
        ("r7-0", "r8-0", ""),
        ("r7-1", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
    ]),
]



# ---------------------------------------------------------------- layout helpers
def sys_lane(lanes):
    for i, n in enumerate(lanes):
        if n.lower() in ("sistem", "system"):
            return i
    return len(lanes) - 1


def height_of(t):
    if t in ("start", "end"):
        return SE_WH
    if t == "decision":
        return DEC_H
    if t in ("fork", "join"):
        return 8  # visual thickness after rotation
    return ACT_H


def guard(label):
    if not label:
        return ""
    if label.startswith("["):
        return label
    return f"[{label}]"


def build_page(idx, spec):
    lanes = spec["lanes"]
    n = len(lanes)
    widths = lane_widths(lanes)
    sys_i = sys_lane(lanes)

    lane_x = []
    x = 40
    for w in widths:
        lane_x.append(x)
        x += w + LANE_GAP
    total_w = x - 40

    rows = spec["rows"]
    # y relatif terhadap lane (0 = top of swimlane, content starts after header)
    row_y = []
    y = LANE_H_PAD + 30
    for row in rows:
        t = row[0][0]
        row_y.append(y)
        if t == "fork":
            # unrotated bar occupies FORK_H; next content sits just below visual bar
            y += 20
        elif t == "join":
            y += 20
        else:
            y += height_of(t) + GAP_Y
        # extra room after a parallel (2-col) action row so join doesn't overlap
        if t == "action" and len(row) >= 2:
            y += 10

    lane_h = y + 40
    title = spec.get("title") or spec["name"]

    # place nodes (coords relative to their lane)
    nodes = {}  # key -> (t, label, lane, lx, ly, w, h)
    for r, row in enumerate(rows):
        t0 = row[0][0]
        if t0 in ("fork", "join"):
            lane = sys_i
            w, h = FORK_W, FORK_H
            # visual bar center at row_y; unrotated y = center - FORK_H/2
            lx = (widths[lane] - FORK_W) / 2
            ly = row_y[r] - FORK_H / 2 + 4
            nodes[f"r{r}-0"] = (t0, "", lane, lx, ly, w, h)
            continue

        by_lane = {}
        for k, item in enumerate(row):
            by_lane.setdefault(item[2], []).append((k, item))
        for lane, items in by_lane.items():
            cols = len(items)
            col_w = widths[lane] / cols
            for j, (k, item) in enumerate(items):
                t, label, _ = item[0], item[1], item[2]
                if t in ("start", "end"):
                    w = h = SE_WH
                elif t == "decision":
                    w, h = DEC_W, DEC_H
                else:
                    w, h = ACT_W, ACT_H
                lx = j * col_w + (col_w - w) / 2
                ly = row_y[r]
                nodes[f"r{r}-{k}"] = (t, label, lane, lx, ly, w, h)

    pid = f"p{idx}"
    cells = []

    # title
    cells.append(
        f'<mxCell id="{pid}-title" value="{esc(title)}" style="{ST_TITLE}" vertex="1" parent="1">'
        f'<mxGeometry x="{40 + total_w/2 - 220}" y="{TITLE_Y}" width="440" height="30" as="geometry"/></mxCell>'
    )

    # lanes
    for i, name in enumerate(lanes):
        cells.append(
            f'<mxCell id="{pid}-L{i}" value="{esc(name)}" style="{ST_LANE}" vertex="1" parent="1">'
            f'<mxGeometry x="{lane_x[i]}" y="{Y0}" width="{widths[i]}" height="{lane_h}" as="geometry"/></mxCell>'
        )

    # vertices (parent = lane)
    for key, (t, label, lane, lx, ly, w, h) in nodes.items():
        if t in ("fork", "join"):
            style = ST_FORK
            val = ""
        elif t == "start":
            style = ST_START
            val = ""
        elif t == "end":
            style = ST_END
            val = ""
        elif t == "decision":
            style = ST_DECISION
            val = esc(label)
        else:
            style = ST_ACTION
            val = esc(label)
        cells.append(
            f'<mxCell id="{pid}-{key}" value="{val}" style="{style}" vertex="1" parent="{pid}-L{lane}">'
            f'<mxGeometry x="{lx:.1f}" y="{ly:.1f}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )

    def abs_box(key):
        t, _, lane, lx, ly, w, h = nodes[key]
        ax = lane_x[lane] + lx
        ay = Y0 + ly
        if t in ("fork", "join"):
            # visual AABB after 90° rotation around center
            cx, cy = ax + w / 2, ay + h / 2
            return cx - h / 2, cy - w / 2, h, w  # x,y,w,h visual
        return ax, ay, w, h

    # fork/join port fractions
    bar_keys = {k for k, v in nodes.items() if v[0] in ("fork", "join")}
    bar_out, bar_in = {k: [] for k in bar_keys}, {k: [] for k in bar_keys}
    for s, d, *_ in spec["edges"]:
        if s in bar_out:
            bar_out[s].append(d)
        if d in bar_in:
            bar_in[d].append(s)
    frac_out, frac_in = {}, {}
    for bar, lst in bar_out.items():
        for i, dst in enumerate(lst):
            frac_out[(bar, dst)] = (i + 1) / (len(lst) + 1)
    for bar, lst in bar_in.items():
        for i, src in enumerate(lst):
            frac_in[(src, bar)] = (i + 1) / (len(lst) + 1)

    # side-routing columns (absolute x, to the right of all lanes)
    side_base = 40 + total_w + 30
    side_slot = 0
    page_right = 40 + total_w + 20

    for e_i, (s, d, label, *opts) in enumerate(spec["edges"]):
        side = bool(opts) and opts[0] == "side"
        lab = guard(label) if label else ""
        style = ST_EDGE
        geo = '<mxGeometry relative="1" as="geometry"/>'
        same_lane = nodes[s][2] == nodes[d][2]
        parent = f"{pid}-L{nodes[s][2]}" if same_lane and not side else "1"

        if side:
            sx, sy, sw, sh = abs_box(s)
            dx, dy, dw, dh = abs_box(d)
            rx = side_base + 28 * side_slot
            side_slot += 1
            page_right = max(page_right, rx + 40)
            style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
            geo = (
                '<mxGeometry relative="1" as="geometry"><Array as="points">'
                f'<mxPoint x="{rx:.1f}" y="{sy + sh/2:.1f}"/>'
                f'<mxPoint x="{rx:.1f}" y="{dy + dh/2:.1f}"/>'
                "</Array></mxGeometry>"
            )
            parent = "1"
        else:
            if s in bar_keys and (s, d) in frac_out:
                # unrotated bar is vertical; after rotation=90 the visual bottom
                # is the original left side. Use exit along the long axis.
                style += f"exitX=0;exitY={frac_out[(s, d)]:.3f};exitDx=0;exitDy=0;exitPerimeter=0;"
            if d in bar_keys and (s, d) in frac_in:
                style += f"entryX=0;entryY={frac_in[(s, d)]:.3f};entryDx=0;entryDy=0;entryPerimeter=0;"

        cells.append(
            f'<mxCell id="{pid}-e{e_i}" value="{esc(lab)}" style="{style}" edge="1" '
            f'parent="{parent}" source="{pid}-{s}" target="{pid}-{d}">{geo}</mxCell>'
        )

    page_w = int(page_right + 20)
    page_h = int(Y0 + lane_h + 40)
    body = "\n".join("        " + c for c in cells)
    return (
        f'  <diagram id="pg-{idx}" name="{esc(spec["name"])}">\n'
        f'    <mxGraphModel dx="1400" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" '
        f'connect="1" arrows="1" fold="1" page="1" pageScale="1" '
        f'pageWidth="{page_w}" pageHeight="{page_h}" math="0" shadow="0">\n'
        f'      <root>\n        <mxCell id="0"/>\n        <mxCell id="1" parent="0"/>\n'
        f'{body}\n      </root>\n    </mxGraphModel>\n  </diagram>'
    )


out = ['<?xml version="1.0" encoding="UTF-8"?>', '<mxfile host="app.diagrams.net">']
for i, spec in enumerate(PAGES, 1):
    out.append(build_page(i, spec))
out.append("</mxfile>")

path = "Activity-Ngekost.drawio"
with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")

tree = ET.parse(path)
root = tree.getroot()
diags = root.findall("diagram")
total_edges = total_nodes = 0
for d in diags:
    ids = [c.get("id") for c in d.iter("mxCell") if c.get("id")]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, f"{d.get('name')}: duplicate id {dup}"
    idset = set(ids)
    for c in d.iter("mxCell"):
        if c.get("edge") == "1":
            total_edges += 1
            assert c.get("source") in idset, f"{d.get('name')}: src {c.get('source')} missing"
            assert c.get("target") in idset, f"{d.get('name')}: tgt {c.get('target')} missing"
        elif c.get("vertex") == "1":
            total_nodes += 1
print(f"OK: {len(diags)} halaman, {total_nodes} vertex, {total_edges} edge")
print(path)
