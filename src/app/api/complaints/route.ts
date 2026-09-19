import { requireUser } from "@/server/auth";
import { createComplaint, listComplaints } from "@/server/engagement-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { complaintCreateSchema } from "@/server/validation";

export const GET = withApi(async () => {
  const { profile } = await requireUser();
  return successResponse(await listComplaints(profile));
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  return successResponse(await createComplaint(profile, await parseJson(request, complaintCreateSchema)), { status: 201 });
});
