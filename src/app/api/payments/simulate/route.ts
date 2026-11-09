import { withApi, ApiError } from "@/server/http";

export const POST = withApi(async (_request: Request) => {
  throw new ApiError(
    403,
    "SIMULATION_DISABLED",
    "Sistem pembayaran otomatis (auto-paid / simulasi) telah dinonaktifkan secara permanen. Seluruh pembayaran sewa dan langganan wajib melalui alur Midtrans Sandbox atau Production yang terverifikasi."
  );
});
