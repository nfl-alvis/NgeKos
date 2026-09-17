import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ApiError, errorResponse, successResponse } from "./http";

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
