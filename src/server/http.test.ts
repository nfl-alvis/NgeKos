import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ApiError, errorResponse, successResponse, withApi } from "./http";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("withApi origin enforcement (F-02)", () => {
  // Handler nyata di repo menerima `(request, ctx)`, jadi tipe eksplisit di sini
  // meniru signature itu dan bukan menyimpulkan nol argumen dari `async () =>`.
  const handler: (request: Request) => Promise<Response> = withApi(
    async (_request: Request) => successResponse({ ok: true }),
  );

  it("allows state-changing requests from the request's own origin", async () => {
    const response = await handler(
      req("http://localhost:3000/api/admin/notices", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects cross-site state-changing requests", async () => {
    const response = await handler(
      req("http://localhost:3000/api/admin/notices", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INVALID_ORIGIN");
  });

  it("rejects simple requests with no Origin header (form CSRF)", async () => {
    const response = await handler(
      req("http://localhost:3000/api/admin/notices", {
        method: "POST",
        headers: { "content-type": "text/plain" },
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INVALID_ORIGIN");
  });

  it("skips the check for safe methods", async () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const response = await handler(req("http://localhost:3000/api/bookings", { method }));
      expect(response.status).toBe(200);
    }
  });

  it("does not leak internals when the check rejects the request", async () => {
    const response = await handler(
      req("http://localhost:3000/api/x", { method: "DELETE", headers: { origin: "https://evil.example" } }),
    );
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_ORIGIN");
    expect(body.error.message).not.toContain("stack");
  });

  it("rejects when the handler receives no Request (fail-closed)", async () => {
    const noRequest = handler as () => Promise<Response>;
    const response = await noRequest();
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INVALID_ORIGIN");
  });

  it("honours APP_ORIGIN from the environment", async () => {
    const previous = process.env.APP_ORIGIN;
    process.env.APP_ORIGIN = "https://ngekost.id";
    try {
      const ok = await handler(
        req("http://127.0.0.1:3000/api/me", { method: "PATCH", headers: { origin: "https://ngekost.id" } }),
      );
      expect(ok.status).toBe(200);
      const bad = await handler(
        req("http://127.0.0.1:3000/api/me", { method: "PATCH", headers: { origin: "https://phish.test" } }),
      );
      expect(bad.status).toBe(403);
    } finally {
      if (previous === undefined) delete process.env.APP_ORIGIN;
      else process.env.APP_ORIGIN = previous;
    }
  });
});

describe("API response helpers", () => {
  it("returns the stable success envelope", async () => {
    const response = successResponse({ id: "abc" }, { status: 201 });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: { id: "abc" } });
  });

  it("maps known API errors without leaking internals", async () => {
    const response = errorResponse(new ApiError(403, "FORBIDDEN", "Akses ditolak"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Akses ditolak" },
    });
  });

  it("maps validation errors to 422 with field details", async () => {
    const issue = new ZodError([
      { code: "too_small", minimum: 2, inclusive: true, origin: "string", path: ["name"], message: "Too small" },
    ]);
    const response = errorResponse(issue);
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.name).toEqual(["Too small"]);
  });

  it("uses a generic message for unknown failures", async () => {
    const response = errorResponse(new Error("database password leaked"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" },
    });
  });
});
