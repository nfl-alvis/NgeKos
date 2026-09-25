import { describe, expect, it } from "vitest";
import { bookingIdentifierWhere } from "./booking-identifier";

describe("bookingIdentifierWhere", () => {
  it("looks up a booking code without comparing it to a UUID column", () => {
    expect(bookingIdentifierWhere("BK-500")).toEqual({ code: "BK-500" });
  });

  it("accepts a UUID as either a booking ID or code", () => {
    const id = "2bd74c54-b971-43aa-b689-8de0e59cf9ac";
    expect(bookingIdentifierWhere(id)).toEqual({ OR: [{ id }, { code: id }] });
  });
});
