import { describe, expect, it } from "vitest";
import { detectImageMime } from "./storage";

describe("storage image validation", () => {
  it("detects supported image signatures", () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageMime(new TextEncoder().encode("RIFF1234WEBP"))).toBe("image/webp");
  });

  it("rejects extension-only spoofed files", () => {
    expect(detectImageMime(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});
