#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator ERD Diagram NgeKos - Notasi Chen (Monokrom / Tanpa Warna).

Standar Notasi Chen (Versi Tanpa Warna / Hitam-Putih):
- Entitas = Persegi Panjang (Fill #ffffff, Stroke #000000, Tebal 1.5)
- Atribut = Elips (Fill #ffffff, Stroke #333333, Regular 8pt)
- Atribut PK / UQ = Elips (Fill #ffffff, Stroke #000000 Tebal 1.5, Teks Garis Bawah & Bold)
- Relasi = Belah Ketupat / Rhombus (Fill #ffffff, Stroke #000000, Tebal 1.5, Teks Bold 8pt)
- Garis Atribut = Direct straight line tipis (Stroke #666666)
- Garis Relasi = Orthogonal line hitam tegas (Stroke #000000, Waypoints Eksplisit)
- Label Kardinalitas = Bold 9pt (#000000)

Aturan Tata Letak:
- Matriks 4 Kolom x 4 Baris dengan koridor terbuka antar kolom.
- Jalur relasi memiliki koordinat track terpisah (0 garis menyatu / 0 crossing).
- Atribut tidak bertabrakan dengan garis relasi atau entitas lain.
- Teks tetap proporsional dan tajam saat diekspor ke PNG/PDF.
"""

import xml.sax.saxutils as sax
import os

def esc(s):
    return sax.escape(s).replace('"', '&quot;').replace("\n", "&#xa;")

# Monochrome Styles (Gada Warnanya / Black & White)
ST_TITLE = "text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;fontSize=18;fontStyle=1;fontColor=#000000;"
ST_SUBTITLE = "text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;fontSize=10;fontStyle=2;fontColor=#333333;"
ST_ENTITY = "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontStyle=1;fontSize=11;fontColor=#000000;strokeWidth=1.5;"
ST_ATTR = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#333333;fontSize=8;fontColor=#000000;strokeWidth=1;"
ST_ATTR_PK = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=8;fontStyle=1;fontColor=#000000;strokeWidth=1.5;"
ST_RELATION = "rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=8;fontStyle=1;fontColor=#000000;strokeWidth=1.5;"
ST_LINE_ATTR = "edgeStyle=none;rounded=0;html=1;strokeColor=#666666;strokeWidth=1;endArrow=none;"
ST_LINE_REL = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1.2;endArrow=none;fontSize=9;fontStyle=1;fontColor=#000000;"

# Definisi 16 Entitas dengan koordinat pusat (cx, cy)
ENTITIES = [
    # Baris 1: Master (cy = 160) - Atribut di ATAS (Y = 60..130)
    {
        "id": "e_logs", "name": "ACTIVITY_LOGS",
        "cx": 320, "cy": 160, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "FK user_id", "action", "description", "actor_type", "created_at"],
        "attr_pos": "top"
    },
    {
        "id": "e_users", "name": "USERS",
        "cx": 950, "cy": 160, "w": 160, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ email</u>", "name", "phone", "role", "status", "avatar_url", "created_at"],
        "attr_pos": "top"
    },
    {
        "id": "e_properties", "name": "PROPERTIES",
        "cx": 1650, "cy": 160, "w": 160, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ slug</u>", "FK owner_id", "name", "city", "gender", "min_price", "status"],
        "attr_pos": "top"
    },
    {
        "id": "e_announcements", "name": "ANNOUNCEMENTS",
        "cx": 2280, "cy": 160, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "FK property_id", "FK author_id", "title", "content", "created_at"],
        "attr_pos": "top"
    },

    # Baris 1.7: Jembatan Favorit (cy = 360, cx = 1300) - Atribut di BAWAH (Y = 400..450)
    {
        "id": "e_favs", "name": "FAVORITES",
        "cx": 1300, "cy": 360, "w": 140, "h": 34,
        "attrs": ["<u>id</u>", "FK profile_id", "FK property_id", "created_at"],
        "attr_pos": "bottom"
    },

    # Baris 2: Langganan, Booking, Tipe Kamar, Ulasan (cy = 520)
    {
        "id": "e_subs", "name": "SUBSCRIPTIONS",
        "cx": 320, "cy": 520, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "FK owner_id", "FK plan_id", "status", "start_date", "end_date"],
        "attr_pos": "left"
    },
    {
        "id": "e_bookings", "name": "BOOKINGS",
        "cx": 950, "cy": 520, "w": 160, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ code</u>", "FK applicant_id", "FK property_id", "start_date", "duration_m", "total_amount", "status"],
        "attr_pos": "left"
    },
    {
        "id": "e_room_types", "name": "ROOM_TYPES",
        "cx": 1650, "cy": 520, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "FK property_id", "name", "price_month", "size_m2", "capacity"],
        "attr_pos": "right"
    },
    {
        "id": "e_reviews", "name": "REVIEWS",
        "cx": 2280, "cy": 520, "w": 140, "h": 34,
        "attrs": ["<u>id</u>", "FK tenant_id", "FK property_id", "rating", "comment", "status"],
        "attr_pos": "right"
    },

    # Baris 3: Paket Langganan, Perjanjian Sewa, Unit Kamar, Keluhan (cy = 820)
    {
        "id": "e_plans", "name": "SUBSCRIPTION_PLANS",
        "cx": 320, "cy": 820, "w": 160, "h": 34,
        "attrs": ["<u>id</u>", "name", "price", "max_properties", "max_rooms", "duration_days"],
        "attr_pos": "left"
    },
    {
        "id": "e_agreements", "name": "RENTAL_AGREEMENTS",
        "cx": 950, "cy": 820, "w": 160, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ contract_no</u>", "FK tenant_id", "FK property_id", "start_date", "end_date", "monthly_rent", "status"],
        "attr_pos": "left"
    },
    {
        "id": "e_room_units", "name": "ROOM_UNITS",
        "cx": 1650, "cy": 820, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ number</u>", "FK room_type_id", "floor", "orientation", "status"],
        "attr_pos": "right"
    },
    {
        "id": "e_complaints", "name": "COMPLAINTS",
        "cx": 2280, "cy": 820, "w": 140, "h": 34,
        "attrs": ["<u>id</u>", "FK tenant_id", "FK property_id", "title", "category", "status"],
        "attr_pos": "right"
    },

    # Baris 4: Pembayaran, Tagihan, Laporan (cy = 1120) - Atribut di BAWAH (Y = 1170..1240)
    {
        "id": "e_payments", "name": "PAYMENTS",
        "cx": 320, "cy": 1120, "w": 140, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ order_id</u>", "FK booking_id", "FK invoice_id", "amount", "status", "settlement_at"],
        "attr_pos": "bottom"
    },
    {
        "id": "e_invoices", "name": "INVOICES",
        "cx": 950, "cy": 1120, "w": 150, "h": 34,
        "attrs": ["<u>id</u>", "<u>UQ invoice_no</u>", "FK tenant_id", "FK agreement_id", "amount", "due_date", "status", "paid_at"],
        "attr_pos": "bottom"
    },
    {
        "id": "e_reports", "name": "REPORTS",
        "cx": 2280, "cy": 1120, "w": 140, "h": 34,
        "attrs": ["<u>id</u>", "FK reporter_id", "FK property_id", "reason", "description", "status"],
        "attr_pos": "bottom"
    },
]

# Definisi 18 Relasi dengan Koordinat Diamond dan Waypoint Eksplisit
# Didesain secara planar sehingga 0 garis bertabrakan / tumpang tindih
RELATIONS = [
    # 1. USERS ke ACTIVITY_LOGS (Horizontal lurus Baris 1: Kolom 2 -> Kolom 1)
    {
        "id": "r_logs", "name": "generates",
        "e1": "e_users", "e2": "e_logs", "c1": "1", "c2": "N",
        "cx": 635, "cy": 160,
        "pts1": [(870, 160), (669, 160)],
        "pts2": [(601, 160), (395, 160)]
    },

    # 2. USERS ke PROPERTIES (Horizontal lurus Baris 1: Kolom 2 -> Kolom 3)
    {
        "id": "r_owns", "name": "manages",
        "e1": "e_users", "e2": "e_properties", "c1": "1", "c2": "N",
        "cx": 1300, "cy": 160,
        "pts1": [(1030, 160), (1266, 160)],
        "pts2": [(1334, 160), (1570, 160)]
    },

    # 3. PROPERTIES ke ANNOUNCEMENTS (Horizontal lurus Baris 1: Kolom 3 -> Kolom 4)
    {
        "id": "r_announcements", "name": "publishes",
        "e1": "e_properties", "e2": "e_announcements", "c1": "1", "c2": "N",
        "cx": 1965, "cy": 160,
        "pts1": [(1730, 160), (1931, 160)],
        "pts2": [(1999, 160), (2205, 160)]
    },

    # 4. USERS ke FAVORITES (Jembatan Bookmark: Kolom 2, Baris 1 -> Kolom 2.5, Baris 1.7)
    {
        "id": "r_fav_u", "name": "bookmarks",
        "e1": "e_users", "e2": "e_favs", "c1": "1", "c2": "N",
        "cx": 1120, "cy": 260,
        "pts1": [(980, 177), (980, 260), (1086, 260)],
        "pts2": [(1154, 260), (1230, 260), (1230, 360)]
    },

    # 5. PROPERTIES ke FAVORITES (Jembatan Simpan: Kolom 3, Baris 1 -> Kolom 2.5, Baris 1.7)
    {
        "id": "r_fav_p", "name": "saved_in",
        "e1": "e_properties", "e2": "e_favs", "c1": "1", "c2": "N",
        "cx": 1480, "cy": 260,
        "pts1": [(1620, 177), (1620, 260), (1514, 260)],
        "pts2": [(1446, 260), (1370, 260), (1370, 360)]
    },

    # 6. USERS ke SUBSCRIPTIONS (Koridor 1 Track X = 580: Kolom 2, Baris 1 -> Kolom 1, Baris 2)
    {
        "id": "r_subs", "name": "subscribes",
        "e1": "e_users", "e2": "e_subs", "c1": "1", "c2": "N",
        "cx": 580, "cy": 360,
        "pts1": [(890, 177), (890, 360), (614, 360)],
        "pts2": [(546, 360), (395, 360), (395, 520)]
    },

    # 7. SUBSCRIPTION_PLANS ke SUBSCRIPTIONS (Vertikal lurus Kolom 1: Baris 3 -> Baris 2)
    {
        "id": "r_plans", "name": "offers",
        "e1": "e_plans", "e2": "e_subs", "c1": "1", "c2": "N",
        "cx": 320, "cy": 670,
        "pts1": [(320, 803), (320, 686)],
        "pts2": [(320, 654), (320, 537)]
    },

    # 8. USERS ke BOOKINGS (Vertikal lurus Kolom 2: Baris 1 -> Baris 2)
    {
        "id": "r_applies", "name": "applies",
        "e1": "e_users", "e2": "e_bookings", "c1": "1", "c2": "N",
        "cx": 950, "cy": 360,
        "pts1": [(950, 177), (950, 344)],
        "pts2": [(950, 376), (950, 503)]
    },

    # 9. PROPERTIES ke ROOM_TYPES (Vertikal lurus Kolom 3: Baris 1 -> Baris 2)
    {
        "id": "r_room_types", "name": "classifies",
        "e1": "e_properties", "e2": "e_room_types", "c1": "1", "c2": "N",
        "cx": 1650, "cy": 360,
        "pts1": [(1650, 177), (1650, 344)],
        "pts2": [(1650, 376), (1650, 503)]
    },

    # 10. PROPERTIES ke REVIEWS (Koridor 3 Track X = 2020: Kolom 3, Baris 1 -> Kolom 4, Baris 2)
    {
        "id": "r_reviews", "name": "reviewed_in",
        "e1": "e_properties", "e2": "e_reviews", "c1": "1", "c2": "N",
        "cx": 2020, "cy": 420,
        "pts1": [(1710, 177), (1710, 230), (2020, 230), (2020, 404)],
        "pts2": [(2020, 436), (2020, 520), (2210, 520)]
    },

    # 11. BOOKINGS ke RENTAL_AGREEMENTS (Vertikal lurus Kolom 2: Baris 2 -> Baris 3)
    {
        "id": "r_agreements", "name": "generates",
        "e1": "e_bookings", "e2": "e_agreements", "c1": "1", "c2": "1",
        "cx": 950, "cy": 670,
        "pts1": [(950, 537), (950, 654)],
        "pts2": [(950, 686), (950, 803)]
    },

    # 12. ROOM_TYPES ke ROOM_UNITS (Vertikal lurus Kolom 3: Baris 2 -> Baris 3)
    {
        "id": "r_room_units", "name": "contains",
        "e1": "e_room_types", "e2": "e_room_units", "c1": "1", "c2": "N",
        "cx": 1650, "cy": 670,
        "pts1": [(1650, 537), (1650, 654)],
        "pts2": [(1650, 686), (1650, 803)]
    },

    # 13. ROOM_UNITS ke BOOKINGS (Koridor 2 Track X = 1300: Kolom 3, Baris 3 -> Kolom 2, Baris 2)
    {
        "id": "r_booked_in", "name": "booked_in",
        "e1": "e_room_units", "e2": "e_bookings", "c1": "1", "c2": "N",
        "cx": 1300, "cy": 670,
        "pts1": [(1570, 820), (1300, 820), (1300, 686)],
        "pts2": [(1300, 654), (1300, 520), (1030, 520)]
    },

    # 14. PROPERTIES ke COMPLAINTS (Koridor 3 Track X = 1940: Kolom 3, Baris 1 -> Kolom 4, Baris 3)
    {
        "id": "r_complaints", "name": "receives",
        "e1": "e_properties", "e2": "e_complaints", "c1": "1", "c2": "N",
        "cx": 1940, "cy": 720,
        "pts1": [(1690, 177), (1690, 250), (1940, 250), (1940, 704)],
        "pts2": [(1940, 736), (1940, 820), (2210, 820)]
    },

    # 15. RENTAL_AGREEMENTS ke INVOICES (Vertikal lurus Kolom 2: Baris 3 -> Baris 4)
    {
        "id": "r_invoices", "name": "bills",
        "e1": "e_agreements", "e2": "e_invoices", "c1": "1", "c2": "N",
        "cx": 950, "cy": 970,
        "pts1": [(950, 837), (950, 954)],
        "pts2": [(950, 986), (950, 1103)]
    },

    # 16. BOOKINGS ke PAYMENTS (Koridor 1 Track X = 500: Kolom 2, Baris 2 -> Kolom 1, Baris 4)
    {
        "id": "r_pays_b", "name": "pays",
        "e1": "e_bookings", "e2": "e_payments", "c1": "1", "c2": "N",
        "cx": 500, "cy": 820,
        "pts1": [(890, 537), (890, 610), (500, 610), (500, 804)],
        "pts2": [(500, 836), (500, 1110), (390, 1110)]
    },

    # 17. INVOICES ke PAYMENTS (Horizontal Kolom 2, Baris 4 -> Kolom 1, Baris 4)
    {
        "id": "r_pays_i", "name": "settled_by",
        "e1": "e_invoices", "e2": "e_payments", "c1": "1", "c2": "N",
        "cx": 660, "cy": 1125,
        "pts1": [(875, 1125), (694, 1125)],
        "pts2": [(626, 1125), (390, 1125)]
    },

    # 18. PROPERTIES ke REPORTS (Koridor 3 Track X = 1860: Kolom 3, Baris 1 -> Kolom 4, Baris 4)
    {
        "id": "r_reports", "name": "reported_in",
        "e1": "e_properties", "e2": "e_reports", "c1": "1", "c2": "N",
        "cx": 1860, "cy": 1020,
        "pts1": [(1670, 177), (1670, 270), (1860, 270), (1860, 1004)],
        "pts2": [(1860, 1036), (1860, 1120), (2210, 1120)]
    },
]

def generate_xml():
    lines = []
    lines.append('<mxfile host="app.diagrams.net" modified="2026-09-22T00:00:00.000Z" agent="Antigravity" version="21.0.0" type="device">')
    lines.append('  <diagram id="erd-ngekos-bw" name="ERD NgeKos (Notasi Chen - Monokrom)">')
    lines.append('    <mxGraphModel dx="2600" dy="1500" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2600" pageHeight="1450" math="0" shadow="0">')
    lines.append('      <root>')
    lines.append('        <mxCell id="0"/>')
    lines.append('        <mxCell id="1" parent="0"/>')

    # Judul dan Subtitle (Monokrom)
    lines.append(f'        <mxCell id="title" value="ENTITY RELATIONSHIP DIAGRAM (ERD) - SISTEM NGEKOS" style="{ST_TITLE}" vertex="1" parent="1">')
    lines.append('          <mxGeometry x="500" y="15" width="1600" height="28" as="geometry"/>')
    lines.append('        </mxCell>')
    lines.append(f'        <mxCell id="subtitle" value="Standar Notasi Chen: Entitas (Persegi Panjang) | Atribut (Elips) | Relasi (Belah Ketupat) | Garis Bawah = Primary / Unique Key | Disusun Berlapis: Master ke Transaksi ke Detail" style="{ST_SUBTITLE}" vertex="1" parent="1">')
    lines.append('          <mxGeometry x="500" y="42" width="1600" height="18" as="geometry"/>')
    lines.append('        </mxCell>')

    aw, ah = 76, 22
    rw, rh = 68, 32

    # Buat entitas dan atribut
    for ent in ENTITIES:
        eid = ent["id"]
        ename = ent["name"]
        ew = ent["w"]
        eh = ent["h"]
        ex = ent["cx"] - ew // 2
        ey = ent["cy"] - eh // 2

        lines.append(f'        <mxCell id="{eid}" value="{ename}" style="{ST_ENTITY}" vertex="1" parent="1">')
        lines.append(f'          <mxGeometry x="{ex}" y="{ey}" width="{ew}" height="{eh}" as="geometry"/>')
        lines.append('        </mxCell>')

        attrs = ent["attrs"]
        pos = ent["attr_pos"]
        n = len(attrs)

        if pos in ("top", "bottom"):
            cols_per_row = 4
            rows = [attrs[:cols_per_row], attrs[cols_per_row:]] if n > cols_per_row else [attrs]

            for r_idx, row in enumerate(rows):
                row_len = len(row)
                row_w = row_len * aw + (row_len - 1) * 8
                start_x = ent["cx"] - row_w // 2

                for c_idx, attr in enumerate(row):
                    aid = f"{eid}_a_{r_idx}_{c_idx}"
                    ax = start_x + c_idx * (aw + 8)

                    if pos == "top":
                        ay = ey - 28 - (len(rows) - 1 - r_idx) * 26
                    else:
                        ay = ey + eh + 8 + r_idx * 26

                    st_a = ST_ATTR_PK if "<u>" in attr else ST_ATTR
                    lines.append(f'        <mxCell id="{aid}" value="{esc(attr)}" style="{st_a};html=1;" vertex="1" parent="1">')
                    lines.append(f'          <mxGeometry x="{ax}" y="{ay}" width="{aw}" height="{ah}" as="geometry"/>')
                    lines.append('        </mxCell>')

                    lid = f"l_{aid}"
                    lines.append(f'        <mxCell id="{lid}" style="{ST_LINE_ATTR}" edge="1" parent="1" source="{eid}" target="{aid}">')
                    lines.append('          <mxGeometry relative="1" as="geometry"/>')
                    lines.append('        </mxCell>')

        elif pos in ("left", "right"):
            rows_per_col = (n + 1) // 2
            cols = [attrs[:rows_per_col], attrs[rows_per_col:]]

            total_h = rows_per_col * ah + (rows_per_col - 1) * 6
            start_y = ent["cy"] - total_h // 2

            for c_idx, col in enumerate(cols):
                for r_idx, attr in enumerate(col):
                    aid = f"{eid}_a_{c_idx}_{r_idx}"
                    ay = start_y + r_idx * (ah + 6)

                    if pos == "left":
                        ax = ex - (len(cols) - c_idx) * (aw + 8)
                    else:
                        ax = ex + ew + 8 + c_idx * (aw + 8)

                    st_a = ST_ATTR_PK if "<u>" in attr else ST_ATTR
                    lines.append(f'        <mxCell id="{aid}" value="{esc(attr)}" style="{st_a};html=1;" vertex="1" parent="1">')
                    lines.append(f'          <mxGeometry x="{ax}" y="{ay}" width="{aw}" height="{ah}" as="geometry"/>')
                    lines.append('        </mxCell>')

                    lid = f"l_{aid}"
                    lines.append(f'        <mxCell id="{lid}" style="{ST_LINE_ATTR}" edge="1" parent="1" source="{eid}" target="{aid}">')
                    lines.append('          <mxGeometry relative="1" as="geometry"/>')
                    lines.append('        </mxCell>')

    # Buat Relasi (Rhombus) dan Jalur Terarah (Waypoints)
    for rel in RELATIONS:
        rid = rel["id"]
        rname = rel["name"]
        rcx, rcy = rel["cx"], rel["cy"]
        rx = rcx - rw // 2
        ry = rcy - rh // 2
        e1, e2 = rel["e1"], rel["e2"]
        c1, c2 = rel["c1"], rel["c2"]

        lines.append(f'        <mxCell id="{rid}" value="{rname}" style="{ST_RELATION}" vertex="1" parent="1">')
        lines.append(f'          <mxGeometry x="{rx}" y="{ry}" width="{rw}" height="{rh}" as="geometry"/>')
        lines.append('        </mxCell>')

        # Line e1 -> relation
        l1_id = f"l_{rid}_1"
        pts1_xml = ""
        if "pts1" in rel and rel["pts1"]:
            pts_inner = "".join(f'<mxPoint x="{pt[0]}" y="{pt[1]}"/>' for pt in rel["pts1"])
            pts1_xml = f'<Array as="points">{pts_inner}</Array>'

        lines.append(f'        <mxCell id="{l1_id}" value="{c1}" style="{ST_LINE_REL}" edge="1" parent="1" source="{e1}" target="{rid}">')
        lines.append(f'          <mxGeometry relative="1" as="geometry">{pts1_xml}</mxGeometry>')
        lines.append('        </mxCell>')

        # Line relation -> e2
        l2_id = f"l_{rid}_2"
        pts2_xml = ""
        if "pts2" in rel and rel["pts2"]:
            pts_inner = "".join(f'<mxPoint x="{pt[0]}" y="{pt[1]}"/>' for pt in rel["pts2"])
            pts2_xml = f'<Array as="points">{pts_inner}</Array>'

        lines.append(f'        <mxCell id="{l2_id}" value="{c2}" style="{ST_LINE_REL}" edge="1" parent="1" source="{rid}" target="{e2}">')
        lines.append(f'          <mxGeometry relative="1" as="geometry">{pts2_xml}</mxGeometry>')
        lines.append('        </mxCell>')

    lines.append('      </root>')
    lines.append('    </mxGraphModel>')
    lines.append('  </diagram>')
    lines.append('</mxfile>')

    return "\n".join(lines)

def main():
    xml_content = generate_xml()
    out_bw = "docs/diagram/ERD-NgeKos-BW.drawio"
    out_main = "docs/diagram/ERD-NgeKos.drawio"

    with open(out_bw, "w", encoding="utf-8") as f:
        f.write(xml_content)
    with open(out_main, "w", encoding="utf-8") as f:
        f.write(xml_content)

    print(f"OK: ERD diagram tanpa warna berhasil dibuat di {out_bw} dan {out_main}")

if __name__ == "__main__":
    main()
