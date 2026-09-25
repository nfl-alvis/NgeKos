#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator Use Case Diagram NgeKos.
Features:
- Exactly 4 actors: User / Guest, Tenant, Owner, Admin.
- All association lines are completely straight (no corners, no bends).
- All lines connected to an actor originate at the exact same point in the middle of the actor's torso (exitX=0.5;exitY=0.5;).
- Prominently styled and badge-highlighted <<include>> and <<extend>> relationships.
- Zero block overlaps, zero line penetrations through unrelated nodes, zero collinear line overlaps.
"""
import os
import xml.sax.saxutils as sax

def esc(s):
    return sax.escape(s).replace('"', '&quot;').replace("\n", "&#xa;")

# -------------------------------------------------------------
# DIMENSI CANVAS & BOUNDARY
# -------------------------------------------------------------
CANVAS_W = 2400
CANVAS_H = 1380
BOUND_X = 180
BOUND_Y = 50
BOUND_W = 2040
BOUND_H = 1270

# STYLES
ST_ACTOR = ("shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;"
            "fillColor=#ffffff;strokeColor=#0f172a;strokeWidth=2;fontSize=12;fontStyle=1;")
ST_BOUNDARY = ("shape=swimlane;startSize=36;horizontal=1;html=1;whiteSpace=wrap;fillColor=none;"
               "strokeColor=#334155;strokeWidth=2;fontSize=16;fontStyle=1;collapsible=0;")
ST_USECASE = ("ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#0f172a;fontSize=11;"
              "strokeWidth=1.5;fontStyle=1;")
ST_ASSOC = ("edgeStyle=none;html=1;strokeColor=#334155;strokeWidth=1.4;endArrow=none;"
            "exitX=0.5;exitY=0.5;exitDx=0;exitDy=0;")
ST_EXTEND = ("edgeStyle=none;html=1;strokeColor=#0284c7;strokeWidth=2.2;dashed=1;dashPattern=6 4;"
             "endArrow=open;endSize=10;endFill=0;fontSize=12;fontStyle=1;fontColor=#0284c7;"
             "labelBackgroundColor=#eff6ff;labelBorderColor=#0284c7;")
ST_INCLUDE = ("edgeStyle=none;html=1;strokeColor=#059669;strokeWidth=2.2;dashed=1;dashPattern=6 4;"
              "endArrow=open;endSize=10;endFill=0;fontSize=12;fontStyle=1;fontColor=#059669;"
              "labelBackgroundColor=#ecfdf5;labelBorderColor=#059669;")
ST_TITLE = ("text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;"
            "verticalAlign=middle;rounded=0;fontSize=20;fontStyle=1;fontColor=#0f172a;")

# 4 AKTOR UTAMA
ACTORS = {
    "act_user":   {"label": "User / Guest\n(Pencari Kos)",   "x": 80,   "y": 250,  "w": 60, "h": 90},
    "act_tenant": {"label": "Tenant\n(Penyewa Aktif)",      "x": 80,   "y": 1050, "w": 60, "h": 90},
    "act_owner":  {"label": "Owner\n(Pemilik Kos)",         "x": 2260, "y": 250,  "w": 60, "h": 90},
    "act_admin":  {"label": "Admin\n(Pengelola Platform)",  "x": 2260, "y": 1050, "w": 60, "h": 90},
}

# 21 USE CASES
USECASES = {
    # Koridor Atas-Tengah (Shared & Otentikasi)
    "uc_01": {"label": "UC-01: Registrasi & Verifikasi\nOTP Email",          "x": 965,  "y": 60,   "w": 200, "h": 60},
    "uc_14": {"label": "UC-14: Autentikasi Google\nOAuth (Single Sign-On)",  "x": 1405, "y": 70,   "w": 200, "h": 60},
    "uc_02": {"label": "UC-02: Login Akun Pengguna",                         "x": 1290, "y": 195,  "w": 200, "h": 60},
    "uc_12": {"label": "UC-12: Mengelola Profil &\nPengaturan Akun",         "x": 1095, "y": 470,  "w": 200, "h": 60},
    "uc_09": {"label": "UC-09: Pengaduan Keluhan\nFasilitas Kamar",          "x": 1190, "y": 705,  "w": 200, "h": 60},

    # Alur Kiri Atas (User / Guest)
    "uc_03": {"label": "UC-03: Cari & Filter Kost\n(Listing Publik)",        "x": 350,  "y": 125,  "w": 200, "h": 60},
    "uc_04": {"label": "UC-04: Melihat Detail Kos &\nSimpan Favorit",        "x": 590,  "y": 190,  "w": 200, "h": 60},
    "uc_05": {"label": "UC-05: Mengajukan Booking\nSewa Kost",               "x": 705,  "y": 490,  "w": 200, "h": 60},
    "uc_06": {"label": "UC-06: Membayar Booking Sewa\n(Midtrans Snap)",       "x": 400,  "y": 450,  "w": 200, "h": 60},
    "uc_07": {"label": "UC-07: Konfirmasi Pembayaran\n& Aktivasi Tenant",     "x": 480,  "y": 545,  "w": 200, "h": 60},

    # Kiri Tengah (Shared User + Tenant)
    "uc_11": {"label": "UC-11: Melaporkan Kos\nBermasalah",                  "x": 365,  "y": 720,  "w": 200, "h": 60},

    # Alur Kiri Bawah (Tenant)
    "uc_08": {"label": "UC-08: Membayar Tagihan\nSewa Bulanan",              "x": 585,  "y": 835,  "w": 200, "h": 60},
    "uc_13": {"label": "UC-13: Melihat Dashboard Tenant\n& Kontrak Sewa",     "x": 540,  "y": 1015, "w": 200, "h": 60},
    "uc_10": {"label": "UC-10: Memberikan Ulasan dan\nRating Kos",           "x": 555,  "y": 1215, "w": 200, "h": 60},

    # Alur Kanan Atas (Owner)
    "uc_15": {"label": "UC-15: Menyetujui / Menolak\nBooking Sewa",          "x": 1870, "y": 145,  "w": 200, "h": 60},
    "uc_16": {"label": "UC-16: Mengelola Data\nProperti Kos",                "x": 1755, "y": 275,  "w": 200, "h": 60},
    "uc_17": {"label": "UC-17: Mengelola Tipe Kamar\n& Unit Kamar",          "x": 1645, "y": 420,  "w": 200, "h": 60},
    "uc_18": {"label": "UC-18: Melihat Dashboard Analitik\n& Okupansi",       "x": 1805, "y": 500,  "w": 200, "h": 60},
    "uc_19": {"label": "UC-19: Mengelola Paket Langganan\n(Subscription)",   "x": 1695, "y": 720,  "w": 200, "h": 60},

    # Alur Kanan Bawah (Admin)
    "uc_20": {"label": "UC-20: Memverifikasi Properti\nKos Baru (Admin)",     "x": 1680, "y": 1025, "w": 200, "h": 60},
    "uc_21": {"label": "UC-21: Memoderasi Ulasan &\nLaporan Kos (Admin)",     "x": 1805, "y": 1240, "w": 200, "h": 60},
}

# RELASI (EDGES)
EDGES = [
    # 1. User / Guest (Pencari Kos)
    ("e_user_uc01", "act_user", "uc_01", "assoc", None),
    ("e_user_uc02", "act_user", "uc_02", "assoc", None),
    ("e_user_uc12", "act_user", "uc_12", "assoc", None),
    ("e_user_uc03", "act_user", "uc_03", "assoc", None),
    ("e_user_uc04", "act_user", "uc_04", "assoc", None),
    ("e_user_uc05", "act_user", "uc_05", "assoc", None),
    ("e_user_uc06", "act_user", "uc_06", "assoc", None),
    ("e_user_uc11", "act_user", "uc_11", "assoc", None),

    # 2. Tenant (Penyewa Aktif)
    ("e_tenant_uc02", "act_tenant", "uc_02", "assoc", None),
    ("e_tenant_uc12", "act_tenant", "uc_12", "assoc", None),
    ("e_tenant_uc08", "act_tenant", "uc_08", "assoc", None),
    ("e_tenant_uc09", "act_tenant", "uc_09", "assoc", None),
    ("e_tenant_uc13", "act_tenant", "uc_13", "assoc", None),
    ("e_tenant_uc10", "act_tenant", "uc_10", "assoc", None),
    ("e_tenant_uc11", "act_tenant", "uc_11", "assoc", None),

    # 3. Owner (Pemilik Kos)
    ("e_owner_uc01", "act_owner", "uc_01", "assoc", None),
    ("e_owner_uc02", "act_owner", "uc_02", "assoc", None),
    ("e_owner_uc12", "act_owner", "uc_12", "assoc", None),
    ("e_owner_uc09", "act_owner", "uc_09", "assoc", None),
    ("e_owner_uc15", "act_owner", "uc_15", "assoc", None),
    ("e_owner_uc16", "act_owner", "uc_16", "assoc", None),
    ("e_owner_uc17", "act_owner", "uc_17", "assoc", None),
    ("e_owner_uc18", "act_owner", "uc_18", "assoc", None),
    ("e_owner_uc19", "act_owner", "uc_19", "assoc", None),

    # 4. Admin (Pengelola Platform)
    ("e_admin_uc02", "act_admin", "uc_02", "assoc", None),
    ("e_admin_uc12", "act_admin", "uc_12", "assoc", None),
    ("e_admin_uc20", "act_admin", "uc_20", "assoc", None),
    ("e_admin_uc21", "act_admin", "uc_21", "assoc", None),

    # 5. Dependensi UML (Prominent & High-Contrast)
    ("dep_extend_14_02", "uc_14", "uc_02", "extend", "&lt;&lt;extend&gt;&gt;"),
    ("dep_include_06_07", "uc_06", "uc_07", "include", "&lt;&lt;include&gt;&gt;"),
]

def generate_drawio_xml():
    lines = []
    lines.append('<mxfile host="app.diagrams.net" modified="2026-09-22T13:30:00.000Z" agent="Antigravity" version="21.0.0" type="device">')
    lines.append('  <diagram id="usecase-ngekos" name="Use Case Diagram NgeKos">')
    lines.append(f'    <mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{CANVAS_W}" pageHeight="{CANVAS_H}" math="0" shadow="0">')
    lines.append('      <root>')
    lines.append('        <mxCell id="0"/>')
    lines.append('        <mxCell id="1" parent="0"/>')

    # Judul Diagram
    lines.append(f'        <mxCell id="title" value="USE CASE DIAGRAM - SISTEM NGEKOS" style="{ST_TITLE}" vertex="1" parent="1">')
    lines.append(f'          <mxGeometry x="{BOUND_X}" y="10" width="{BOUND_W}" height="35" as="geometry"/>')
    lines.append('        </mxCell>')

    # Boundary Sistem Utama
    lines.append(f'        <mxCell id="boundary" value="Sistem NgeKos" style="{ST_BOUNDARY}" vertex="1" parent="1">')
    lines.append(f'          <mxGeometry x="{BOUND_X}" y="{BOUND_Y}" width="{BOUND_W}" height="{BOUND_H}" as="geometry"/>')
    lines.append('        </mxCell>')

    # Use Cases
    for ucid, uc in USECASES.items():
        lines.append(f'        <mxCell id="{ucid}" value="{esc(uc["label"])}" style="{ST_USECASE}" vertex="1" parent="1">')
        lines.append(f'          <mxGeometry x="{uc["x"]}" y="{uc["y"]}" width="{uc["w"]}" height="{uc["h"]}" as="geometry"/>')
        lines.append('        </mxCell>')

    # Edges (Associations & Dependencies)
    for eid, src, dst, st_type, lbl in EDGES:
        if st_type == "extend":
            style = ST_EXTEND
        elif st_type == "include":
            style = ST_INCLUDE
        else:
            style = ST_ASSOC

        val_attr = f'value="{lbl}" ' if lbl else 'value="" '
        lines.append(f'        <mxCell id="{eid}" {val_attr}style="{style}" edge="1" parent="1" source="{src}" target="{dst}">')
        lines.append('          <mxGeometry relative="1" as="geometry"/>')
        lines.append('        </mxCell>')

    # Aktor diletakkan terakhir agar di-render di atas garis dengan bersih
    for aid, a in ACTORS.items():
        lines.append(f'        <mxCell id="{aid}" value="{esc(a["label"])}" style="{ST_ACTOR}" vertex="1" parent="1">')
        lines.append(f'          <mxGeometry x="{a["x"]}" y="{a["y"]}" width="{a["w"]}" height="{a["h"]}" as="geometry"/>')
        lines.append('        </mxCell>')

    lines.append('      </root>')
    lines.append('    </mxGraphModel>')
    lines.append('  </diagram>')
    lines.append('</mxfile>')

    return "\n".join(lines)

def main():
    xml_content = generate_drawio_xml()
    out_file = "docs/diagram/Usecase-NgeKos.drawio"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"SUKSES: File drawio berhasil diperbarui di {out_file}")

if __name__ == "__main__":
    main()
