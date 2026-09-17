import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createInvoice, listInvoices } from "@/server/owner-service";
import { invoiceCreateSchema } from "@/server/validation";

export const GET = withApi(async () => successResponse(await listInvoices((await requireUser()).profile)));

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  return successResponse(await createInvoice(profile, await parseJson(request, invoiceCreateSchema)), { status: 201 });
});
