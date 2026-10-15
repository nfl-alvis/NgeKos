import io
import base64
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from PIL import Image
from inpaint import inpaint_image, auto_detect_watermark

app = FastAPI(title="NgeKos Watermark Remover API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

class InpaintRequest(BaseModel):
    image: str  # Base64 string (data:image/jpeg;base64,...)
    mask: str   # Base64 string (data:image/png;base64,...)

def decode_base64_image(b64_str: str) -> Image.Image:
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    image_bytes = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(image_bytes))

def encode_image_base64(img: Image.Image, format: str = "JPEG") -> str:
    buffered = io.BytesIO()
    img.save(buffered, format=format, quality=95)
    encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/{format.lower()};base64,{encoded}"

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_file):
        raise HTTPException(status_code=404, detail="Frontend index.html tidak ditemukan")
    return FileResponse(index_file)

@app.post("/api/inpaint")
async def process_inpaint(req: InpaintRequest):
    try:
        image = decode_base64_image(req.image)
        mask = decode_base64_image(req.mask)

        # Jalankan algoritma Multi-Scale Poisson Inpainting
        result = inpaint_image(image, mask)

        # Kembalikan gambar bersih dalam base64 JPEG
        result_b64 = encode_image_base64(result, format="JPEG")
        return {"success": True, "result": result_b64}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 NgeKos Watermark Remover Studio aktif!")
    print("👉 Buka di browser: http://localhost:8080")
    print("="*60 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8080)
