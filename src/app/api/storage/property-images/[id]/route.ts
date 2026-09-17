import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { ApiError, withApi } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const image = await prisma.propertyImage.findUnique({ where: { id }, include: { property: { select: { ownerId: true } } } });
  if (!image) throw new ApiError(404, "IMAGE_NOT_FOUND", "Gambar tidak ditemukan");
  if (profile.role !== "ADMIN" && image.property.ownerId !== profile.id) throw new ApiError(403, "FORBIDDEN", "Gambar ini bukan milik Anda");
  const supabase = await createClient();
  const { error } = await supabase.storage.from(env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET).remove([image.storagePath]);
  if (error) throw new ApiError(502, "STORAGE_DELETE_FAILED", "Gagal menghapus gambar dari storage");
  await prisma.propertyImage.delete({ where: { id } });
  return new Response(null, { status: 204 });
});
