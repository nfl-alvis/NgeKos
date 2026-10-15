import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter

def inpaint_image(image: Image.Image, mask: Image.Image, blend_radius: int = 4) -> Image.Image:
    """
    Menghilangkan watermark dari gambar berdasarkan mask biner.
    Menggunakan algoritma Multi-Scale Poisson Boundary Diffusion yang cepat dan mulus.
    """
    # Pastikan ukuran mask sama persis dengan gambar
    if mask.size != image.size:
        mask = mask.resize(image.size, Image.Resampling.NEAREST)

    arr = np.array(image.convert("RGB"), dtype=np.float32)
    m = np.array(mask.convert("L")) > 64

    # Jika tidak ada area yang ditandai, kembalikan gambar asli
    if not np.any(m):
        return image

    # 1. Hitung jarak (distance transform) dari batas terdekat di luar mask
    dist, (idx_y, idx_x) = distance_transform_edt(m, return_indices=True)

    # 2. Isi awal area mask dari piksel terdekat di sekelilingnya
    filled = arr.copy()
    filled[m] = arr[idx_y[m], idx_x[m]]

    # 3. Multi-scale Gaussian Diffusion untuk menghaluskan tekstur secara natural
    b1 = gaussian_filter(filled, sigma=(1.5, 1.5, 0))
    b2 = gaussian_filter(filled, sigma=(4.0, 4.0, 0))
    b3 = gaussian_filter(filled, sigma=(8.0, 8.0, 0))

    w1 = np.clip(dist / 4.0, 0, 1)[:, :, None]
    w2 = np.clip((dist - 4.0) / 8.0, 0, 1)[:, :, None]

    smooth = b1 * (1 - w1) + b2 * w1 * (1 - w2) + b3 * w2

    # 4. Gabungkan kembali dengan gambar asli di luar mask
    final = np.where(m[:, :, None], smooth, arr)

    return Image.fromarray(np.uint8(np.clip(final, 0, 255)))

def auto_detect_watermark(image: Image.Image, sensitivity: float = 1.0) -> Image.Image:
    """
    Mendeteksi area watermark semi-transparan atau teks kontras tinggi secara otomatis.
    """
    arr = np.array(image.convert("RGB"), dtype=np.float32)
    gray = np.mean(arr, axis=2)

    # Gradient magnitude (deteksi tepian teks logo)
    gy, gx = np.gradient(gray)
    grad = np.sqrt(gx**2 + gy**2)

    threshold = 35.0 / max(0.2, sensitivity)
    edges = grad > threshold

    # Dilation menggunakan gaussian filter sederhana
    mask_arr = gaussian_filter(edges.astype(np.float32), sigma=2.0) > 0.15

    return Image.fromarray((mask_arr * 255).astype(np.uint8))
