#!/usr/bin/env python3
"""Rasterize every page of a .drawio (rect/ellipse/rhombus vertices + edge waypoints)
to SVG for visual inspection."""
import html
import sys
import xml.etree.ElementTree as ET

SRC = sys.argv[1] if len(sys.argv) > 1 else "docs/diagram/ERD-NgeKos.drawio"
OUTPREFIX = sys.argv[2] if len(sys.argv) > 2 else "/tmp/preview"

def sm(s):
    out = {}
    for p in (s or "").split(";"):
        k, _, v = p.partition("=")
        if k:
            out[k] = v or "1"
    return out

def esc(s):
    return html.escape(s or "")

def render(diagram, pagefile):
    m = diagram.find("mxGraphModel")
    pw = float(m.get("pageWidth", 2600))
    ph = float(m.get("pageHeight", 1500))
    cells = diagram.findall(".//mxCell")
    geo = {}
    for c in cells:
        g = c.find("mxGeometry")
        if c.get("vertex") == "1" and g is not None:
            sraw = c.get("style") or ""
            sd = sm(sraw)
            sd["__raw"] = sraw
            geo[c.get("id")] = (
                float(g.get("x", 0)),
                float(g.get("y", 0)),
                float(g.get("width", 0)),
                float(g.get("height", 0)),
                c.get("value", ""),
                sd,
                c.get("parent")
            )

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{pw}" height="{ph}" '
        f'viewBox="0 0 {pw} {ph}"><rect width="{pw}" height="{ph}" fill="#ffffff"/>'
    ]

    # Edges first (behind vertices)
    for c in cells:
        if c.get("edge") != "1":
            continue
        s = geo.get(c.get("source"))
        t = geo.get(c.get("target"))
        if not s or not t:
            continue

        sx, sy = s[0] + s[2] / 2, s[1] + s[3] / 2
        tx, ty = t[0] + t[2] / 2, t[1] + t[3] / 2

        g = c.find("mxGeometry")
        arr = g.find("Array") if g is not None else None
        pts = []
        if arr is not None:
            for pt in arr.findall("mxPoint"):
                pts.append((float(pt.get("x")), float(pt.get("y"))))

        sraw = c.get("style") or ""
        stroke = "#333333" if "orthogonalEdgeStyle" in sraw else "#999999"
        sw = "1.5" if "orthogonalEdgeStyle" in sraw else "1"

        if pts:
            all_pts = [(sx, sy)] + pts + [(tx, ty)]
            pts_str = " ".join(f"{px},{py}" for px, py in all_pts)
            parts.append(f'<polyline points="{pts_str}" fill="none" stroke="{stroke}" stroke-width="{sw}"/>')
            mid_idx = len(all_pts) // 2
            lx, ly = all_pts[mid_idx]
        else:
            parts.append(f'<line x1="{sx}" y1="{sy}" x2="{tx}" y2="{ty}" stroke="{stroke}" stroke-width="{sw}"/>')
            lx, ly = (sx + tx) / 2, (sy + ty) / 2

        v = c.get("value", "")
        if v:
            parts.append(
                f'<text x="{lx}" y="{ly - 4}" text-anchor="middle" '
                f'font-size="9" font-weight="bold" font-family="Arial, sans-serif" fill="#000000">{esc(v)}</text>'
            )

    # Vertices
    for cid, (x, y, w, h, val, st, parent) in geo.items():
        raw = st.pop("__raw", "") or ""
        fill = st.get("fillColor", "#ffffff") or "#ffffff"
        stroke = st.get("strokeColor", "#000000") or "#000000"
        sw = st.get("strokeWidth", "1") or "1"
        common = f'fill="{fill if fill != "none" else "none"}" stroke="{stroke if stroke != "none" else "none"}" stroke-width="{sw}"'

        if "ellipse" in raw.split(";")[0] or raw.startswith("ellipse"):
            parts.append(f'<ellipse cx="{x + w / 2}" cy="{y + h / 2}" rx="{w / 2}" ry="{h / 2}" {common}/>')
        elif "rhombus" in raw.split(";")[0] or raw.startswith("rhombus") or "shape=rhombus" in raw:
            parts.append(f'<polygon points="{x + w / 2},{y} {x + w},{y + h / 2} {x + w / 2},{y + h} {x},{y + h / 2}" {common}/>')
        else:
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {common}/>')

        if val:
            # Simple text rendering
            clean_val = val.replace("<u>", "").replace("</u>", "").replace("&lt;u&gt;", "").replace("&lt;/u&gt;", "")
            lines = clean_val.split("\n")
            fs = int(st.get("fontSize", 9))
            lh = fs + 3
            total = len(lines) * lh
            fw = "bold" if st.get("fontStyle") == "1" else "normal"
            fc = st.get("fontColor", "#000000")
            for i, ln in enumerate(lines):
                ty = y + h / 2 - total / 2 + i * lh + fs - 1
                parts.append(
                    f'<text x="{x + w / 2}" y="{ty}" text-anchor="middle" font-size="{fs}" '
                    f'font-weight="{fw}" font-family="Arial, sans-serif" fill="{fc}">{esc(ln)}</text>'
                )

    parts.append("</svg>")
    svg_path = pagefile + ".svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write("".join(parts))
    print(f"Rendered: {svg_path}")

def main():
    t = ET.parse(SRC)
    only = int(sys.argv[3]) if len(sys.argv) > 3 else None
    for i, d in enumerate(t.getroot().findall("diagram"), 1):
        if only and i != only:
            continue
        safe = "".join(ch for ch in d.get("name") if ch.isalnum() or ch in " .-")[:40].strip().replace(" ", "_")
        render(d, f"{OUTPREFIX}.{i:02d}.{safe}")

if __name__ == "__main__":
    main()
