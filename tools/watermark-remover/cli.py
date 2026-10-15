#!/usr/bin/env python3
"""
CLI Batch Watermark Remover untuk NgeKos
Contoh Penggunaan:
  1. Hapus watermark satu file dengan kotak koordinat [x1, y1, x2, y2]:
     python3 cli.py --input foto.jpg --box "200,300,500,600" --output foto_bersih.jpg

  2. Hapus watermark seluruh folder dengan auto-detect:
     python3 cli.py --input ./raw_photos/ --auto --output ./clean_photos/
"""

import os
import sys
import glob
import argparse
from PIL import Image, ImageDraw
from inpaint import inpaint_image, auto_detect_watermark

def parse_box(box_str: str):
    try:
        parts = [int(p.strip()) for p in box_str.split(",")]
        if len(parts) == 4:
            return parts
    except Exception:
        pass
    return None

def process_single(input_path: str, output_path: str, box=None, auto: bool = False):
    try:
        img = Image.open(input_path).convert("RGB")
        if box:
            mask = Image.new("L", img.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.rectangle(box, fill=255)
        elif auto:
            mask = auto_detect_watermark(img)
        else:
            # Default tengah foto (40% tengah)
            w, h = img.size
            mask = Image.new("L", (w, h), 0)
            draw = ImageDraw.Draw(mask)
            draw.rectangle([int(w * 0.2), int(h * 0.3), int(w * 0.8), int(h * 0.7)], fill=255)

        clean = inpaint_image(img, mask)
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        clean.save(output_path, "JPEG", quality=95)
        print(f"✓ Berhasil: {input_path} -> {output_path}")
    except Exception as e:
        print(f"✗ Gagal memproses {input_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Batch Watermark Remover Studio")
    parser.add_argument("--input", "-i", required=True, help="File gambar atau folder input")
    parser.add_argument("--output", "-o", required=True, help="File gambar atau folder output")
    parser.add_argument("--box", "-b", help="Koordinat box 'x1,y1,x2,y2' area watermark")
    parser.add_argument("--auto", "-a", action="store_true", help="Deteksi otomatis area logo/teks")

    args = parser.parse_args()
    box = parse_box(args.box) if args.box else None

    if os.path.isfile(args.input):
        process_single(args.input, args.output, box=box, auto=args.auto)
    elif os.path.isdir(args.input):
        files = []
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
            files.extend(glob.glob(os.path.join(args.input, ext)))
        print(f"Ditemukan {len(files)} gambar di folder '{args.input}'")
        for f in files:
            rel = os.path.basename(f)
            out_file = os.path.join(args.output, rel)
            process_single(f, out_file, box=box, auto=args.auto)
    else:
        print(f"Error: Path '{args.input}' tidak ditemukan.")
        sys.exit(1)

if __name__ == "__main__":
    main()
