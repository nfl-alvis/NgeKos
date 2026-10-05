import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ResponseOptions = {
  status?: number;
  headers?: HeadersInit;
  meta?: unknown;
};

export function successResponse<T>(data: T, options: ResponseOptions = {}) {
  return NextResponse.json(
    options.meta === undefined
      ? { success: true, data }
      : { success: true, data, meta: options.meta },
    {
      status: options.status ?? 200,
      headers: { "Cache-Control": "no-store", ...options.headers },
    },
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Data yang dikirim tidak valid",
          details: error.flatten(),
        },
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return errorResponse(new ApiError(409, "CONFLICT", "Data yang sama sudah tersedia"));
    }
    if (error.code === "P2025") {
      return errorResponse(new ApiError(404, "NOT_FOUND", "Data tidak ditemukan"));
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Body JSON tidak valid");
  }
  return schema.parse(body);
}

/**
 * PERBAIKAN F-02 — validasi Origin untuk mencegah CSRF.
 *
 * Endpoint yang bergantung pada cookie `nk_session` (sameSite=lax) masih dapat
 * dipicu form lintas situs, jadi cookie saja tidak cukup. Aturan:
 * - Method aman (GET/HEAD/OPTIONS) tidak diperiksa.
 * - Origin HARUS ada dan HARUS cocok dengan allowlist. Origin yang hilang
 *   ditolak (fail-closed): browser selalu mengirimnya untuk POST lintas situs.
 * - Allowlist = APP_ORIGIN dari env + origin dari request itu sendiri
 *   (reverse proxy / localhost dev), sehingga instalasi self-hosted di
 *   domain mana pun tetap jalan tanpa konfigurasi tambahan.
 */
function allowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  const push = (value: string | null | undefined) => {
    if (!value) return;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* abaikan nilai yang bukan URL */
    }
  };

  push(process.env.APP_ORIGIN);
  push(process.env.NEXT_PUBLIC_SITE_URL);
  push(new URL(request.url).origin);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    push(`${proto}://${forwardedHost}`);
  }
  return origins;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function assertSameOrigin(request: unknown) {
  if (!(request instanceof Request)) {
    // Handler tidak menerima Request sebagai argumen pertama, jadi method-nya
    // tidak diketahui. Gagal tertutup: jangan izinkan perubahan data buta.
    throw new ApiError(403, "INVALID_ORIGIN", "Permintaan ditolak: handler tidak menerima objek Request");
  }
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  if (!origin) {
    throw new ApiError(403, "INVALID_ORIGIN", "Permintaan ditolak: header Origin wajib untuk perubahan data");
  }
  if (!allowedOrigins(request).has(origin)) {
    throw new ApiError(403, "INVALID_ORIGIN", "Permintaan ditolak: asal tidak diizinkan");
  }
}

export function withApi<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      assertSameOrigin(args[0] as Request);
      return await handler(...args);
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof ZodError)) {
        console.error("Unhandled API error", error);
      }
      return errorResponse(error);
    }
  };
}
