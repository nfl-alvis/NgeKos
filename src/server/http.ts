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

export function withApi<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof ZodError)) {
        console.error("Unhandled API error", error);
      }
      return errorResponse(error);
    }
  };
}
