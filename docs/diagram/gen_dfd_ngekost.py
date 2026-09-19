#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator DFD Ngekost v3 - Context (Level 0) + Level 1.

Sumber: DATABASE.md v3.5, API.md, PRD-Ngekost-FULL.md, rute src/app (repo ngekost-v3).
Konvensi notation Yourdon/DeMarco style sederhana:
  - Entitas eksternal = rect (kotak)
  - Proses = ellipse
  - Data store = open rect (tiga garis, kotak terbuka kiri-kanan)
  - Alur data = panah berlabel
Cara pakai: python3 gen_dfd_ngekost.py  (JANGAN edit .drawio hasilnya - regenerate)
"""
import xml.sax.saxutils as sax

def esc(s):
    return sax.escape(s).replace('"', '&quot;').replace("\n", "&#xa;")

ST_ENTITY = ("rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#000000;"
             "fontStyle=1;fontSize=12;verticalAlign=middle;")
ST_PROCESS = ("ellipse;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
              "fontSize=11;fontStyle=1;")
ST_STORE = ("shape=mxgraph.flowchart.stored_data;whiteSpace=wrap;html=1;fillColor=#d5e8d4;"
            "strokeColor=#82b366;fontSize=11;")
ST_FLOW = ("edgeStyle=entityRelationEdgeStyle;rounded=0;html=1;strokeColor=#333333;"
           "fontSize=10;labelBackgroundColor=#ffffff;")
ST_TITLE = ("text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;"
            "verticalAlign=middle;rounded=0;fontSize=16;fontStyle=1;")
ST_NOTE = ("text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;"
           "verticalAlign=top;fontSize=10;fontColor=#666666;")

# --------------------------------------------------------------- pages
# node: (id, kind, label, x, y, w, h)   kind: entity|process|store|system
# flow: (src, dst, label, exit_frac, entry_frac)  frac None = default

PAGES = [
    dict(name="DFD Context (Level 0)",
         title="DFD Level 0 (Context) - Sistem Ngekost",
         nodes=[
            ("owner",   "entity",  "Owner\n(pemilik kost)",          40,  150, 170, 70),
            ("guest",   "entity",  "Guest\n(pencari kost)",           40,  330, 170, 70),
            ("tenant",  "entity",  "Tenant\n(penyewa aktif)",         40,  510, 170, 70),
            ("admin",   "entity",  "Admin\n(verifikasi)",             40,  690, 170, 70),
            ("sistem",  "process", "0\nSISTEM\nNGEKOST",             620,  360, 340, 300),
            ("google",  "system",  "Google OAuth",                  1330,  140, 170, 60),
            ("geoapify","system",  "Geoapify\nGeocoding",           1330,  300, 170, 60),
            ("midtrans","system",  "Midtrans\n(Payment Gateway)",   1330,  460, 170, 60),
            ("telegram","system",  "Telegram Bot",                  1330,  620, 170, 60),
            ("email",   "system",  "Email / SMTP",                  1330,  780, 170, 60),
         ],
         flows=[
            ("owner",  "sistem", "data registrasi & login,\ndata kost/kamar, keputusan\nbooking, langganan", None, 0.25),
            ("sistem", "owner",  "hasil verifikasi, booking\nmasuk, invoice, notifikasi",                   0.35, None),
            ("guest",  "sistem", "pencarian & filter kost,\ndata pengajuan booking",                        None, 0.55),
            ("sistem", "guest",  "hasil pencarian, status\nbooking, instruksi bayar",                       0.65, None),
            ("tenant", "sistem", "konfirmasi bayar tagihan\nbulanan, chat balik",                           None, 0.82),
            ("sistem", "tenant", "invoice, pengingat\nmenunggak, chat owner",                               0.9,  None),
            ("admin",  "sistem", "keputusan approve /\nreject property",                                    None, None),
            ("sistem", "admin",  "antrean verifikasi\n(property pending)",                                  0.15, None),
            ("sistem", "google", "request consent OAuth (PKCE)",                                            0.12, None),
            ("google", "sistem", "authorization code &\nID token",                                          None, 0.08),
            ("sistem", "geoapify", "kata kunci lokasi",                                                     0.28, None),
            ("geoapify", "sistem", "saran alamat (autocomplete)",                                           None, 0.22),
            ("sistem", "midtrans", "buat transaksi\n(DP / full)",                                           0.45, None),
            ("midtrans", "sistem", "status bayar (webhook\n+ signature)",                                   None, 0.38),
            ("sistem", "telegram", "notifikasi & pesan\noutbound",                                          0.72, None),
            ("telegram", "sistem", "pesan inbound tenant /\nguest",                                         None, 0.62),
            ("sistem", "email",  "notifikasi & pesan\noutbound",                                            0.88, None),
            ("email", "sistem",  "status terkirim",                                                         None, 0.78),
         ],
         w=1560, h=920),

    dict(name="DFD Level 1",
         title="DFD Level 1 - Proses Utama Sistem Ngekost",
         nodes=[
            ("owner",   "entity",  "Owner",                          30,  140, 120, 60),
            ("guest",   "entity",  "Guest",                          30,  470, 120, 60),
            ("tenant",  "entity",  "Tenant",                         30,  770, 120, 60),
            ("admin",   "entity",  "Admin",                          30,  990, 120, 60),
            ("p1", "process", "1.0\nAutentikasi\n& Registrasi",     280,  110, 150, 110),
            ("p2", "process", "2.0\nCari &\nFilter Kost",           280,  460, 150, 110),
            ("p3", "process", "3.0\nAjukan\nBooking",               280,  700, 150, 110),
            ("p4", "process", "4.0\nKeputusan\nBooking",            620,  110, 150, 110),
            ("p5", "process", "5.0\nTagihan\nbulanan",              620,  770, 150, 110),
            ("p6", "process", "6.0\nKelola\nProperty",              620,  990, 150, 110),
            ("p7", "process", "7.0\nBayar Booking\n(Midtrans)",     950,  460, 160, 110),
            ("p8", "process", "8.0\nNotifikasi &\nPesan",          1290,  770, 160, 110),
            ("d1", "store", "D1  User & Guest",                     250, 1200, 220, 50),
            ("d2", "store", "D2  Property, RoomType,\nRoom",        520, 1200, 240, 50),
            ("d3", "store", "D3  BookingRequest\n& Payment",        810, 1200, 230, 50),
            ("d4", "store", "D4  Tenant, Invoice,\nAgreement",     1090, 1200, 250, 50),
            ("d5", "store", "D5  Subscription\n& Plan",            1390, 1200, 210, 50),
            ("d6", "store", "D6  Message, Notif,\nActivityLog",    1650, 1200, 250, 50),
            ("google",  "system",  "Google OAuth",                  30,   260, 160, 60),
            ("geoapify","system",  "Geoapify",                     240,   260, 130, 60),
            ("midtrans","system",  "Midtrans",                     760,   260, 120, 60),
            ("telegram","system",  "Telegram Bot",                1560,   600, 140, 60),
            ("email",   "system",  "Email / SMTP",                1560,   700, 140, 60),
            ("cron",    "system",  "Cron Expire\nBooking",        1560,   150, 140, 60),
         ],
         flows=[
            # actor -> proses
            ("owner",  "p1", "email + password"),
            ("owner",  "p4", "approve / reject\n+ alasan"),
            ("owner",  "p6", "data property,\nroom type, kamar"),
            ("guest",  "p2", "kata kunci, filter"),
            ("guest",  "p3", "form booking 3 langkah\n(kamar, data, konfirmasi)"),
            ("tenant", "p5", "konfirmasi bayar"),
            ("admin",  "p6", "keputusan verifikasi"),
            # autentikasi <-> google
            ("p1", "google", "request consent\n(PKCE + state)"),
            ("google", "p1", "code & ID token"),
            # pencarian
            ("p2", "geoapify", "kata kunci lokasi"),
            ("geoapify", "p2", "saran alamat"),
            ("p2", "p3", "detail kost &\ntipe kamar"),
            # booking -> keputusan
            ("p3", "p4", "BookingRequest\nPENDING_APPROVAL"),
            # keputusan -> bayar
            ("p4", "p7", "booking WAITING_PAYMENT\n(+ deadline)"),
            ("p7", "midtrans", "buat transaksi\n(DP / full)"),
            ("midtrans", "p7", "status bayar\n(webhook + signature)"),
            ("p7", "p5", "FULLY_PAID ->\nbuat Tenant & Invoice"),
            # tenant -> pesan
            ("tenant", "p8", "chat balik via\nTelegram"),
            # notifikasi & pesan -> aktor
            ("p8", "tenant", "pengingat tagihan,\nchat owner"),
            ("p8", "guest",  "status booking,\ninstruksi bayar"),
            ("p8", "owner",  "booking baru,\nchat masuk"),
            ("p8", "admin",  "hasil verifikasi"),
            # notifikasi -> channel eksternal
            ("p8", "telegram", "pesan & notifikasi\noutbound"),
            ("p8", "email",    "pesan & notifikasi\noutbound"),
            # cron -> expire
            ("cron", "p7", "cek paymentDeadline\nkedaluwarsa"),
            # proses -> data store (write)
            ("p1", "d1", "INSERT/UPDATE\nUser, Guest"),
            ("p6", "d2", "INSERT/UPDATE property\n& kamar (status VACANT)"),
            ("p4", "d2", "Room -> BOOKING_PENDING\n/ VACANT"),
            ("p3", "d3", "INSERT BookingRequest"),
            ("p7", "d3", "INSERT Payment, update\nBookingStatus"),
            ("p5", "d4", "INSERT Tenant, Invoice,\nRentalAgreement"),
            ("p6", "d5", "UPDATE Subscription\n(limit & status)"),
            ("p8", "d6", "INSERT Message,\nNotification, ActivityLog"),
            # store -> proses (read)
            ("d2", "p2", "kost verified &\naktif"),
            ("d3", "p4", "antrean booking\npending"),
         ],
         w=1960, h=1330),
]

# ---------------------------------------------------------------- emit
def build_page(idx, spec):
    cells = []
    ids = set()
    for nid, kind, label, x, y, w, h in spec["nodes"]:
        assert nid not in ids, f"duplicate id {nid}"
        ids.add(nid)
        st = {"entity": ST_ENTITY, "system": ST_ENTITY,
              "process": ST_PROCESS, "store": ST_STORE}[kind]
        cells.append(
            f'    <mxCell id="{nid}" value="{esc(label)}" style="{st}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    for i, f in enumerate(spec["flows"]):
        src, dst, label = f[0], f[1], f[2]
        style = ST_FLOW
        if len(f) > 3 and f[3] is not None:
            style += f"exitX=1;exitY={f[3]};exitDx=0;exitDy=0;"
        if len(f) > 4 and f[4] is not None:
            style += f"entryX=0;entryY={f[4]};entryDx=0;entryDy=0;"
        cells.append(
            f'    <mxCell id="f{i}" value="{esc(label)}" style="{style}" edge="1" '
            f'parent="1" source="{src}" target="{dst}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>')
    title = (f'    <mxCell id="ttl" value="{esc(spec["title"])}" style="{ST_TITLE}" '
             f'vertex="1" parent="1"><mxGeometry x="40" y="20" width="700" height="30" '
             f'as="geometry"/></mxCell>')
    body = "\n".join([title] + cells)
    return (
        f'  <diagram id="dfd-pg-{idx}" name="{esc(spec["name"])}">\n'
        f'    <mxGraphModel dx="1400" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" '
        f'connect="1" arrows="1" fold="1" page="1" pageScale="1" '
        f'pageWidth="{spec["w"]}" pageHeight="{spec["h"]}" math="0" shadow="0">\n'
        f'      <root>\n        <mxCell id="0"/>\n        <mxCell id="1" parent="0"/>\n'
        f'{body}\n      </root>\n    </mxGraphModel>\n  </diagram>')


out = ['<?xml version="1.0" encoding="UTF-8"?>', '<mxfile host="app.diagrams.net">']
for i, spec in enumerate(PAGES, 1):
    out.append(build_page(i, spec))
out.append("</mxfile>")

path = "DFD-Ngekost.drawio"
with open(path, "w", encoding="utf-8") as fh:
    fh.write("\n".join(out) + "\n")

# self-check: well-formed, unique ids per page, edge refs exist, no node overlap
import xml.etree.ElementTree as ET
tree = ET.parse(path)
for d in tree.getroot().findall("diagram"):
    idset = set()
    boxes = []
    for c in d.iter("mxCell"):
        cid = c.get("id")
        assert cid and cid not in idset, f"{d.get('name')}: dup id {cid}"
        idset.add(cid)
        if c.get("vertex") == "1":
            g = c.find("mxGeometry")
            boxes.append((cid, float(g.get("x")), float(g.get("y")),
                          float(g.get("width")), float(g.get("height"))))
        if c.get("edge") == "1":
            assert c.get("source") in idset and c.get("target") in idset, \
                f"{d.get('name')}: dangling edge {cid}"
    for a in range(len(boxes)):
        for b in range(a + 1, len(boxes)):
            _, ax, ay, aw, ah = boxes[a]
            _, bx, by, bw, bh = boxes[b]
            if ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah:
                raise SystemExit(f"{d.get('name')}: node overlap {boxes[a][0]} x {boxes[b][0]}")
    for cid, x, y, w, h in boxes:
        assert x >= 0 and y >= 0 and x + w <= float(d.find("mxGraphModel").get("pageWidth")) + 1 \
            and y + h <= float(d.find("mxGraphModel").get("pageHeight")) + 1, \
            f"{d.get('name')}: {cid} outside page"
print(f"OK: {len(tree.getroot().findall('diagram'))} halaman, "
      f"{sum(1 for d in tree.getroot().iter('mxCell') if d.get('vertex')=='1')} vertex, "
      f"{sum(1 for d in tree.getroot().iter('mxCell') if d.get('edge')=='1')} flow")
