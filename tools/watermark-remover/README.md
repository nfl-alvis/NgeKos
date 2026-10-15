# 🪄 Watermark Remover Studio — NgeKos

Aplikasi pembersih watermark foto mandiri (*self-hosted*) yang berjalan **100% lokal di komputer Anda**, **tanpa kuota gratisan**, **tanpa batas file**, dan **bebas proteksi Cloudflare**.

Menggunakan algoritma **Multi-Scale Poisson Boundary Inpainting** berbasis `NumPy` & `SciPy` yang memproses penghapusan watermark dalam hitungan milidetik.

---

## 🚀 Fitur Unggulan

1. **Antarmuka Web Interaktif (Studio UI):**
   - Upload foto secara *Drag & Drop*.
   - Kuas (*Brush*) dengan ukuran kuas dinamis untuk mencoret area watermark.
   - Pilihan seleksi kotak (*Box Rectangle*).
   - Tombol sekali klik *"Hapus Watermark"*.
   - Perbandingan Sebelum/Sesudah (*Split View Comparison*).
   - Langsung download foto bersih beresolusi penuh (HD).
2. **Mode Batch CLI (Terminal):**
   - Mampu membersihkan satu folder penuh berisi ratusan foto sekaligus dalam sekali perintah.
3. **100% Gratis & Selamanya:**
   - Tidak memerlukan akun atau API Key berbayar pihak ketiga.
   - Semua kalkulasi berjalan secara lokal di CPU Anda.

---

## 🛠️ Cara Menjalankan

### Cara 1: Menggunakan Antarmuka Web (Rekomendasi)

Jalankan perintah berikut di terminal:

```bash
python3 tools/watermark-remover/server.py
```

Setelah server aktif, buka browser Anda di:
👉 **`http://localhost:8080`**

1. Tarik foto ber-watermark ke layar.
2. Coret logo/watermark dengan kuas merah.
3. Klik tombol hijau **"Hapus Watermark"**.
4. Klik **"Download Foto Bersih"**.

---

### Cara 2: Menggunakan Mode Terminal (Batch Folder)

Membersihkan seluruh foto di suatu folder secara otomatis:

```bash
# Membersihkan seluruh file foto di folder input dengan kotak watermark tengah
python3 tools/watermark-remover/cli.py --input ./foto-mentah/ --output ./foto-bersih/

# Atau tentukan koordinat spesifik [x1, y1, x2, y2]
python3 tools/watermark-remover/cli.py --input ./foto-mentah/ --box "200,300,600,600" --output ./foto-bersih/
```

---

## 📦 Dependensi Sistem
Aplikasi ini menggunakan modul Python standar yang sudah terpasang di sistem:
- `FastAPI` & `Uvicorn`
- `Pillow`
- `NumPy` & `SciPy`
