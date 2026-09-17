import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createAnnouncement, listAnnouncements } from "@/server/owner-service";
import { announcementCreateSchema } from "@/server/validation";

export const GET = withApi(async () => successResponse(await listAnnouncements((await requireUser()).profile)));

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  return successResponse(await createAnnouncement(profile, await parseJson(request, announcementCreateSchema)), { status: 201 });
});
