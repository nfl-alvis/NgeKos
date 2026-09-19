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
ST_END      = "ellipse;html=1;shape=endState;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;"
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
        elif n in ("google", "midtrans"):
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
    dict(name="1. Autentikasi Owner (Register & Login)",
         title="Login dan Register Owner",
         lanes=["Owner", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "membuka halaman login", 0)],
        [("action", "menampilkan halaman login", 1)],
        [("decision", "punya akun?", 0)],
        [("action", "login dengan email\n& password", 0)],
        [("action", "isi form registrasi\n(email, password, nama)", 0)],
        [("action", "submit login", 0)],
        [("action", "submit form register", 0)],
        [("action", "cek kredensial\n(bcrypt)", 1)],
        [("action", "validasi input &\ncek email unik", 1)],
        [("decision", "data sesuai?", 1)],
        [("decision", "email belum\nterdaftar?", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\ndashboard owner", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "punya akun"),
        ("r3-0", "r5-0", "belum punya akun"),
        ("r4-0", "r6-0", ""),
        ("r5-0", "r7-0", ""),
        ("r6-0", "r8-0", ""),
        ("r7-0", "r9-0", ""),
        ("r8-0", "r10-0", ""),
        ("r9-0", "r11-0", ""),
        ("r10-0", "r2-0", "data tidak sesuai", "side"),
        ("r10-0", "r15-0", "data sesuai"),
        ("r11-0", "r5-0", "email sudah terdaftar", "side"),
        ("r11-0", "r12-0", "email belum dipakai"),
        ("r12-0", "r13-0", ""),
        ("r12-0", "r13-1", ""),
        ("r13-0", "r14-0", ""),
        ("r13-1", "r14-0", ""),
        ("r14-0", "r15-0", ""),
        ("r15-0", "r16-0", ""),
    ]),

    dict(name="2. Autentikasi Guest (Register & Login)",
         title="Login dan Register Guest",
         lanes=["Guest", "Sistem", "Google"], rows=[
        [("start", "", 0)],
        [("action", "klik tombol Booking\ndi halaman detail", 0)],
        [("action", "bangun URL OAuth\n(PKCE + state)", 1)],
        [("action", "redirect ke Google", 1)],
        [("action", "consent screen", 2)],
        [("action", "pilih akun &\nsetujui izin", 0)],
        [("action", "kirim code ke\nredirect_uri", 2)],
        [("action", "terima code &\nverifikasi token", 1)],
        [("decision", "token valid &\nemail_verified?", 1)],
        [("action", "tolak 401/403", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\npengajuan booking", 1)],
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
        ("r8-0", "r9-0", "tidak"),
        ("r9-0", "r1-0", "coba lagi", "side"),
        ("r8-0", "r10-0", "ya"),
        ("r10-0", "r11-0", ""),
        ("r10-0", "r11-1", ""),
        ("r11-0", "r12-0", ""),
        ("r11-1", "r12-0", ""),
        ("r12-0", "r13-0", ""),
        ("r13-0", "r14-0", ""),
    ]),

    dict(name="3. Autentikasi Tenant (Register & Login)",
         title="Login dan Register Tenant",
         lanes=["Tenant", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka tautan akses\nTenant", 0)],
        [("action", "menampilkan halaman\nakses Tenant", 1)],
        [("decision", "sudah punya\nakses?", 0)],
        [("action", "masukkan connect\ntoken / OTP", 0)],
        [("action", "isi nama &\nno. HP", 0)],
        [("action", "validasi token\n(SELECT)", 1)],
        [("decision", "token valid?", 1)],
        [("action", "tampilkan error\n400/401", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\nhalaman data sewa", 1)],
        [("join", "", 1)],
        [("action", "menampilkan\npesan sukses", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "sudah"),
        ("r3-0", "r5-0", "belum"),
        ("r4-0", "r6-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r7-0", "r8-0", "tidak"),
        ("r8-0", "r4-0", "coba lagi", "side"),
        ("r7-0", "r9-0", "ya"),
        ("r9-0", "r10-0", ""),
        ("r9-0", "r10-1", ""),
        ("r10-0", "r11-0", ""),
        ("r10-1", "r11-0", ""),
        ("r11-0", "r12-0", ""),
        ("r12-0", "r13-0", ""),
    ]),

    dict(name="4. Cari & Filter Kost (Listing Publik)",
         title="Cari dan Filter Kost",
         lanes=["Guest", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman\nlisting publik", 0)],
        [("action", "menampilkan halaman\nlisting", 1)],
        [("action", "isi filter kota,\nharga, tipe", 0)],
        [("action", "query Property +\nRoomType + Room", 1)],
        [("decision", "ada hasil?", 1)],
        [("action", "tampilkan\n'tidak ditemukan'", 1)],
        [("action", "kirim daftar hasil\n+ pagination", 1)],
        [("action", "lihat hasil", 0)],
        [("decision", "buka detail?", 0)],
        [("action", "ambil detail by slug\n+ ketersediaan", 1)],
        [("action", "menampilkan halaman\ndetail kost", 1)],
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
        ("r9-0", "r3-0", "tidak", "side"),
        ("r9-0", "r10-0", "ya"),
        ("r10-0", "r11-0", ""),
        ("r11-0", "r12-0", ""),
    ]),

    dict(name="5. Ajukan Booking Request",
         title="Ajukan Booking Request",
         lanes=["Verified Guest", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "pilih kamar, isi form\n(nama, HP, tgl masuk)", 0)],
        [("action", "submit booking", 0)],
        [("action", "validasi token &\ncek kamar VACANT", 1)],
        [("decision", "kamar tersedia\n& tak duplikat?", 1)],
        [("action", "tolak 409\nROOM_UNAVAILABLE", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nstatus booking", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", "tidak"),
        ("r5-0", "r1-0", "pilih kamar lain", "side"),
        ("r4-0", "r6-0", "ya"),
        ("r6-0", "r7-0", ""),
        ("r6-0", "r7-1", ""),
        ("r7-0", "r8-0", ""),
        ("r7-1", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
    ]),

    dict(name="6. Approve Booking (Tidak Digating)",
         title="Menyetujui Booking",
         lanes=["Owner", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka daftar\nBooking Masuk", 0)],
        [("action", "tampilkan booking\nPENDING_APPROVAL", 1)],
        [("action", "pilih booking &\nklik Approve", 0)],
        [("action", "cek ownership &\nstatus + lock kamar", 1)],
        [("decision", "VACANT &\nmilik owner?", 1)],
        [("action", "tolak 403/409", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nstatus bayar", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", "tidak"),
        ("r6-0", "r1-0", "pilih lain", "side"),
        ("r5-0", "r7-0", "ya"),
        ("r7-0", "r8-0", ""),
        ("r7-0", "r8-1", ""),
        ("r8-0", "r9-0", ""),
        ("r8-1", "r9-0", ""),
        ("r9-0", "r10-0", ""),
        ("r10-0", "r11-0", ""),
    ]),

    dict(name="7. Reject Booking (Tidak Digating)",
         title="Menolak Booking",
         lanes=["Owner", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka daftar\nBooking Masuk", 0)],
        [("action", "klik Reject\n(alasan opsional)", 0)],
        [("action", "cek ownership &\nstatus PENDING", 1)],
        [("decision", "milik owner &\nPENDING?", 1)],
        [("action", "tolak 403/409", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nbooking ditolak", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", "tidak"),
        ("r5-0", "r1-0", "pilih lain", "side"),
        ("r4-0", "r6-0", "ya"),
        ("r6-0", "r7-0", ""),
        ("r6-0", "r7-1", ""),
        ("r7-0", "r8-0", ""),
        ("r7-1", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", ""),
    ]),

    dict(name="8. Bayar Booking & Retry Pembayaran",
         title="Bayar Booking",
         lanes=["Verified Guest", "Sistem", "Midtrans"], rows=[
        [("start", "", 0)],
        [("action", "buka halaman\nstatus booking", 0)],
        [("decision", "masih dalam\ndeadline?", 1)],
        [("action", "menampilkan halaman\nstatus expired", 1)],
        [("action", "klik Bayar", 0)],
        [("action", "hitung nominal &\nbuat Payment PENDING", 1)],
        [("action", "minta Snap token", 1)],
        [("action", "terbitkan transaksi", 2)],
        [("action", "selesaikan bayar\ndi Midtrans", 0)],
        [("decision", "hasil transaksi?", 2)],
        [("action", "webhook settlement", 2)],
        [("action", "webhook deny /\nexpire / cancel", 2)],
        [("action", "Payment → FAILED\nBooking tetap WAITING", 1)],
        [("action", "tampilkan opsi\ncoba lagi", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan pesan\nbayar berhasil", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\npembayaran berhasil", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", "tidak"),
        ("r3-0", "r18-0", "", "side"),
        ("r2-0", "r4-0", "ya"),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r8-0", "r9-0", ""),
        ("r9-0", "r10-0", "berhasil"),
        ("r9-0", "r11-0", "gagal"),
        ("r11-0", "r12-0", ""),
        ("r12-0", "r13-0", ""),
        ("r13-0", "r4-0", "coba lagi", "side"),
        ("r10-0", "r14-0", ""),
        ("r14-0", "r15-0", ""),
        ("r14-0", "r15-1", ""),
        ("r15-0", "r16-0", ""),
        ("r15-1", "r16-0", ""),
        ("r16-0", "r17-0", ""),
        ("r17-0", "r18-0", ""),
    ]),

    dict(name="9. Webhook Midtrans & Konversi Guest → Tenant",
         title="Webhook Midtrans (Konversi Guest → Tenant)",
         lanes=["Midtrans", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "POST webhook\nbooking", 0)],
        [("action", "verifikasi signature,\norderId, nominal", 1)],
        [("decision", "payload valid &\nsettlement?", 1)],
        [("action", "menampilkan halaman\nwebhook ditolak", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "mengirim notifikasi\nowner & tenant", 1)],
        [("join", "", 1)],
        [("action", "menampilkan status\npembayaran lunas", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", "tidak"),
        ("r3-0", "r5-0", "ya"),
        ("r5-0", "r6-0", ""),
        ("r5-0", "r6-1", ""),
        ("r6-0", "r7-0", ""),
        ("r6-1", "r7-0", ""),
        ("r7-0", "r8-0", ""),
        ("r4-0", "r9-0", "", "side"),
        ("r8-0", "r9-0", ""),
    ]),

    dict(name="10. Tambah Property Baru (Digating)",
         title="Tambah Property Baru",
         lanes=["Owner", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka form\nTambah Property", 0)],
        [("action", "menampilkan form\nproperty", 1)],
        [("action", "isi nama, alamat,\nkota", 0)],
        [("action", "submit form", 0)],
        [("action", "validasi input &\ncek limit tier", 1)],
        [("decision", "valid & kuota\nmasih ada?", 1)],
        [("action", "tolak 403/422\n(limit / validasi)", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "menampilkan\npesan sukses", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\ndaftar property", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r6-0", ""),
        ("r6-0", "r7-0", "tidak"),
        ("r7-0", "r3-0", "perbaiki / upgrade", "side"),
        ("r6-0", "r8-0", "ya"),
        ("r8-0", "r9-0", ""),
        ("r8-0", "r9-1", ""),
        ("r9-0", "r10-0", ""),
        ("r9-1", "r10-0", ""),
        ("r10-0", "r11-0", ""),
        ("r11-0", "r12-0", ""),
    ]),

    dict(name="11. Verifikasi Property (Admin)",
         title="Verifikasi Property oleh Admin",
         lanes=["Admin", "Sistem"], rows=[
        [("start", "", 0)],
        [("action", "buka antrean\nverifikasi", 0)],
        [("action", "tampilkan property\nstatus PENDING", 1)],
        [("action", "tinjau detail\nproperty & owner", 0)],
        [("action", "ajukan keputusan\napprove / reject", 0)],
        [("decision", "terverifikasi?", 1)],
        [("fork", "", 1)],
        [("action", "memasukkan data\nke database", 1),
         ("action", "mengirim notifikasi\nke owner", 1)],
        [("join", "", 1)],
        [("action", "menampilkan halaman\nriwayat verifikasi", 1)],
        [("end", "", 1)],
    ], edges=[
        ("r0-0", "r1-0", ""),
        ("r1-0", "r2-0", ""),
        ("r2-0", "r3-0", ""),
        ("r3-0", "r4-0", ""),
        ("r4-0", "r5-0", ""),
        ("r5-0", "r3-0", "ditolak + alasan", "side"),
        ("r5-0", "r6-0", "terverifikasi"),
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
