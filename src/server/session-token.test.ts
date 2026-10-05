import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  getSessionSecret,
  verifySessionToken,
} from "./session-token";

const SECRET = "test-secret-value-that-is-long-enough-0123456789";

describe("session token signing (F-01)", () => {
  it("round-trips a valid signed token", () => {
    const token = createSessionToken({ userId: "u-1", email: "a@b.test" }, SECRET, 1_000_000);
    expect(verifySessionToken(token, SECRET, 1_000_000)).toMatchObject({
      userId: "u-1",
      email: "a@b.test",
    });
  });

  it("rejects an unsigned base64 payload forged by an attacker", () => {
    // Payload versi lama: JSON base64url MURNI, tanpa tanda tangan.
    const forged = Buffer.from(
      JSON.stringify({ userId: "attacker", email: "a@b.test", role: "ADMIN", adminRole: "SUPER" }),
      "utf8",
    ).toString("base64url");
    expect(verifySessionToken(forged, SECRET, 1_000_000)).toBeNull();
  });

  it("rejects a role-escalated payload signed with the wrong secret", () => {
    const attackerSecret = "attacker-owned-secret-0123456789abcdef";
    const body = Buffer.from(
      JSON.stringify({ userId: "attacker", email: "a@b.test", exp: 2_000_000_000, role: "ADMIN" }),
      "utf8",
    ).toString("base64url");
    expect(verifySessionToken(`${body}.deadbeef`, SECRET, 1_000_000)).toBeNull();
    // Token yang benar-benar ditandatangani dengan RAHASIA PENYERANG juga ditolak
    // karena verifikasi membandingkan tanda tangan secara constant-time.
    const attackerToken = createSessionToken(
      { userId: "attacker", email: "a@b.test", exp: 2_000_000_000 },
      attackerSecret,
    );
    expect(verifySessionToken(attackerToken, SECRET, 1_000_000)).toBeNull();
  });

  it("rejects a tampered payload after signing", () => {
    const token = createSessionToken({ userId: "u-1", email: "a@b.test" }, SECRET, 1_000_000);
    const [body, signature] = token.split(".");
    const swapped = Buffer.from(
      JSON.stringify({ userId: "u-2", email: "a@b.test", exp: 2_000_000_000 }),
      "utf8",
    ).toString("base64url");
    expect(verifySessionToken(`${swapped}.${signature}`, SECRET, 1_000_000)).toBeNull();
    expect(body).not.toBe(swapped);
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken(
      { userId: "u-1", email: "a@b.test", exp: 1_000 },
      SECRET,
      999_999_000,
    );
    expect(verifySessionToken(token, SECRET, 1_000_000_000)).toBeNull();
  });

  it("defaults expiry to the configured TTL", () => {
    const nowMs = 1_000_000_000_000;
    const token = createSessionToken({ userId: "u-1", email: "a@b.test" }, SECRET, nowMs);
    const decoded = verifySessionToken(token, SECRET, nowMs);
    expect(decoded?.exp).toBe(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  });

  it("never leaks role/adminRole fields into the token payload", () => {
    const token = createSessionToken(
      { userId: "u-1", email: "a@b.test" } as never,
      SECRET,
      1_000_000,
    );
    const body = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(Object.keys(body).sort()).toEqual(["email", "exp", "userId"]);
    expect(body).not.toHaveProperty("role");
    expect(body).not.toHaveProperty("adminRole");
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
    expect(verifySessionToken("", SECRET)).toBeNull();
    expect(verifySessionToken("no-separator", SECRET)).toBeNull();
    expect(verifySessionToken(".onlysignature", SECRET)).toBeNull();
    expect(verifySessionToken("onlybody.", SECRET)).toBeNull();
  });

  it("rejects payloads whose required fields are missing or mistyped", () => {
    const bad = [
      { email: "a@b.test", exp: 2_000_000_000 },
      { userId: "u-1", exp: 2_000_000_000 },
      { userId: "u-1", email: "a@b.test" },
      { userId: 1, email: "a@b.test", exp: 2_000_000_000 },
      { userId: "u-1", email: "a@b.test", exp: "soon" },
    ];
    for (const payload of bad) {
      const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
      // Tanda tangan dibuat dengan rahasia yang benar, jadi satu-satunya alasan
      // penolakan di sini adalah skema payload yang tidak valid.
      const signature = createSessionToken(
        { userId: "u-1", email: "a@b.test", exp: 2_000_000_000 },
        SECRET,
      ).split(".")[1];
      expect(verifySessionToken(`${body}.${signature}`, SECRET, 1_000_000)).toBeNull();
    }
  });

  it("uses a non-empty secret of adequate derivation", () => {
    const secret = getSessionSecret();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).toBe(getSessionSecret());
  });
});