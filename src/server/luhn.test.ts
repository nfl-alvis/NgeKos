import { describe, expect, it } from "vitest";
import { calculateLuhnCheckDigit, isValidLuhn } from "../lib/luhn";

describe("Luhn Algorithm (Mod 10 Checksum)", () => {
  it("validates official Luhn test vectors", () => {
    // Standard ISO/IEC 7812 test vector
    expect(isValidLuhn("79927398713")).toBe(true);

    // Common valid test numbers
    expect(isValidLuhn("49927398716")).toBe(true);
    expect(isValidLuhn("12345678903")).toBe(true);
    expect(isValidLuhn("123456782")).toBe(true);
  });

  it("rejects invalid numbers with corrupted digits", () => {
    // 79927398713 with last digit changed
    expect(isValidLuhn("79927398710")).toBe(false);
    expect(isValidLuhn("79927398714")).toBe(false);

    // 1234567890 is not valid mod 10
    expect(isValidLuhn("1234567890")).toBe(false);
  });

  it("handles non-digit characters gracefully (spaces, dashes)", () => {
    // Formatted account/card numbers
    expect(isValidLuhn("7992-7398-713")).toBe(true);
    expect(isValidLuhn("4992 7398 716")).toBe(true);
  });

  it("rejects empty or single-digit inputs", () => {
    expect(isValidLuhn("")).toBe(false);
    expect(isValidLuhn("7")).toBe(false);
  });

  it("calculates correct check digit for a given payload", () => {
    // For payload "7992739871", check digit should be 3
    expect(calculateLuhnCheckDigit("7992739871")).toBe(3);

    // For payload "1234567890", check digit should be 3 (12345678903)
    expect(calculateLuhnCheckDigit("1234567890")).toBe(3);

    // Combining payload with its check digit produces a valid Luhn number
    const payload = "987654321";
    const checkDigit = calculateLuhnCheckDigit(payload);
    expect(isValidLuhn(`${payload}${checkDigit}`)).toBe(true);
  });
});
