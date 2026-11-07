import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./validation";

describe("verifyOtpSchema", () => {
  it("accepts an email with an 8-digit token", () => {
    const parsed = verifyOtpSchema.parse({
      email: "seeker@example.com",
      token: "12345678",
      role: "seeker",
    });
    expect(parsed.email).toBe("seeker@example.com");
  });

  it("rejects tokens shorter than 6 characters", () => {
    expect(() =>
      verifyOtpSchema.parse({ email: "seeker@example.com", token: "1234" }),
    ).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("defaults the locale to id", () => {
    expect(forgotPasswordSchema.parse({ email: "a@b.co" }).locale).toBe("id");
  });

  it("rejects unknown locales", () => {
    expect(() => forgotPasswordSchema.parse({ email: "a@b.co", locale: "jp" })).toThrow();
  });
});

describe("resetPasswordSchema (dual mode)", () => {
  it("accepts the OTP mode with email, token, and password", () => {
    const parsed = resetPasswordSchema.parse({
      email: "seeker@example.com",
      token: "12345678",
      password: "NewPassword!1",
    });
    expect(parsed).toMatchObject({ email: "seeker@example.com", token: "12345678" });
  });

  it("accepts a long token hash from a reset link email", () => {
    const token = "938c6c2cc6a9099ad6ff82039f41398d42e3204a747eede0b7323259";
    expect(() =>
      resetPasswordSchema.parse({ email: "seeker@example.com", token, password: "NewPassword!1" }),
    ).not.toThrow();
  });

  it("accepts the session mode with only a password", () => {
    expect(resetPasswordSchema.parse({ password: "NewPassword!1" })).toEqual({
      password: "NewPassword!1",
    });
  });

  it("rejects a token without an email (incomplete OTP mode)", () => {
    expect(() => resetPasswordSchema.parse({ token: "12345678", password: "NewPassword!1" })).toThrow();
  });

  it("rejects an email without a token (ambiguous mode)", () => {
    expect(() =>
      resetPasswordSchema.parse({ email: "seeker@example.com", password: "NewPassword!1" }),
    ).toThrow();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(() =>
      resetPasswordSchema.parse({ email: "seeker@example.com", token: "12345678", password: "short" }),
    ).toThrow();
  });
});
