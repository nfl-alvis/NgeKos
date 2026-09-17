import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { ApiError, successResponse, withApi } from "@/server/http";
import { detectImageMime, imageExtension } from "@/server/storage";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser(["OWNER"]);
  const form = await request.formData();
  const file = form.get("file");
  const propertyId = form.get("propertyId");
  const altText = form.get("altText");
  const isCover = form.get("isCover") === "true";
  if (!(file instanceof File) || typeof propertyId !== "string") throw new ApiError(422, "INVALID_UPLOAD", "File dan propertyId wajib diisi");
  if (file.size <= 0 || file.size > MAX_BYTES) throw new ApiError(413, "FILE_TOO_LARGE", "Ukuran gambar maksimal 5 MB");

  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: profile.id, deletedAt: null }, select: { id: true } });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) throw new ApiError(415, "UNSUPPORTED_IMAGE", "Format gambar harus JPEG, PNG, atau WebP");
  const storagePath = `${profile.id}/${propertyId}/${randomUUID()}.${imageExtension[mime]}`;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET).upload(storagePath, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });
  if (uploadError) throw new ApiError(502, "STORAGE_UPLOAD_FAILED", "Gagal mengunggah gambar");

  try {
    const image = await prisma.$transaction(async (tx) => {
      if (isCover) await tx.propertyImage.updateMany({ where: { propertyId, isCover: true }, data: { isCover: false } });
      const count = await tx.propertyImage.count({ where: { propertyId } });
      return tx.propertyImage.create({ data: { propertyId, storagePath, altText: typeof altText === "string" ? altText.slice(0, 250) : null, isCover, sortOrder: count } });
    });
    const { data } = supabase.storage.from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
    return successResponse({ ...image, url: data.publicUrl }, { status: 201 });
  } catch (error) {
    await supabase.storage.from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET).remove([storagePath]);
    throw error;
  }
});
