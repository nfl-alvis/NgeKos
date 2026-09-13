#!/usr/bin/env python3
"""Rasterize every page of a .drawio (rect/ellipse/rhombus vertices + straight edge
polylines) to PNG for quick layout inspection. Throwaway preview, not the render truth."""
import html
import sys
import xml.etree.ElementTree as ET

SRC = sys.argv[1] if len(sys.argv)>1 else "DFD-Ngekost.drawio"
OUTPREFIX = sys.argv[2] if len(sys.argv) > 2 else "/tmp/preview"

def sm(s):
    out = {}
    for p in (s or "").split(";"):
        k, _, v = p.partition("=")
        if k:
            out[k] = v or "1"
    return out

def esc(s): return html.escape(s or "")

def render(diagram, pagefile):
    m = diagram.find("mxGraphModel")
    pw, ph = float(m.get("pageWidth")), float(m.get("pageHeight"))
    cells = diagram.findall(".//mxCell")
    geo = {}
    for c in cells:
        g = c.find("mxGeometry")
        if c.get("vertex") == "1" and g is not None:
            sraw = c.get("style") or ""
            sd = sm(sraw); sd["__raw"] = sraw
            geo[c.get("id")] = (float(g.get("x", 0)), float(g.get("y", 0)),
                                float(g.get("width", 0)), float(g.get("height", 0)),
                                c.get("value", ""), sd, c.get("parent"))
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{pw}" height="{ph}" '
             f'viewBox="0 0 {pw} {ph}"><rect width="{pw}" height="{ph}" fill="white"/>']
    # edges first (behind)
    for c in cells:
        if c.get("edge") != "1":
            continue
        s, t = geo.get(c.get("source")), geo.get(c.get("target"))
        if not s or not t:
            continue
        sx, sy = s[0] + s[2] / 2, s[1] + s[3] / 2
        tx, ty = t[0] + t[2] / 2, t[1] + t[3] / 2
        parts.append(f'<line x1="{sx}" y1="{sy}" x2="{tx}" y2="{ty}" stroke="#999" stroke-width="1.5"/>')
        v = c.get("value", "")
        if v:
            parts.append(f'<text x="{(sx+tx)/2}" y="{(sy+ty)/2}" text-anchor="middle" '
                         f'font-size="9" font-family="Liberation Sans" fill="#c00">{esc(v)}</text>')
    for cid, (x, y, w, h, val, st, parent) in geo.items():
        raw = st.pop("__raw", "") or ""
        fill = st.get("fillColor", "#ffffff") or "#ffffff"
        stroke = st.get("strokeColor", "#000") or "#000"
        common = f'fill="{fill if fill!="none" else "none"}" stroke="{stroke if stroke!="none" else "none"}"'
        if "shape=endState" in raw:
            parts.append(f'<circle cx="{x+w/2}" cy="{y+h/2}" r="{w/2}" {common} stroke-width="3"/>')
        elif "ellipse" in raw.split(";")[0] or raw.startswith("ellipse"):
            parts.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" {common}/>')
        elif "shape=rhombus" in raw:
            parts.append(f'<polygon points="{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}" {common}/>')
        elif "stored_data" in raw:
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {common}/>'
                         f'<line x1="{x+10}" y1="{y}" x2="{x+10}" y2="{y+h}" stroke="{stroke}"/>'
                         f'<line x1="{x+w-10}" y1="{y}" x2="{x+w-10}" y2="{y+h}" stroke="{stroke}"/>')
        elif "swimlane" in raw.split(";")[0]:
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#f7f7f7" stroke="#000"/>')
        else:
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {common}/>')
        if val:
            lines = html.unescape(val).split("\n")
            fs = int(st.get("fontSize", 11))
            lh = fs + 3
            total = len(lines) * lh
            for i, ln in enumerate(lines):
                ty = y + h / 2 - total / 2 + i * lh + fs
                parts.append(f'<text x="{x+w/2}" y="{ty}" text-anchor="middle" font-size="{fs}" '
                             f'font-family="Liberation Sans">{esc(ln)}</text>')
    parts.append("</svg>")
    open(pagefile + ".svg", "w").write("".join(parts))
    import cairosvg
    cairosvg.svg2png(url=pagefile + ".svg", write_to=pagefile + ".png", output_width=int(pw))
    print(pagefile + ".png")

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
