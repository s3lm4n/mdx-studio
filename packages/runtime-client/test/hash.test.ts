import { describe, expect, it } from "vitest";
import { noise, sha256Hex, simulatedDigest } from "../src/mock/hash";

describe("sha256Hex", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
  ])("matches the published vector for %j", (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it("handles multi-block and non-ASCII input deterministically", () => {
    const long = "π".repeat(500);
    expect(sha256Hex(long)).toBe(sha256Hex(long));
    expect(sha256Hex(long)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Hex(long)).not.toBe(sha256Hex(`${long}x`));
  });
});

describe("mock determinism helpers", () => {
  it("noise is deterministic and bounded", () => {
    for (let i = 0; i < 200; i++) {
      const value = noise(1, i);
      expect(value).toBe(noise(1, i));
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(noise(1, 5)).not.toBe(noise(2, 5));
  });

  it("simulated digests are stable, well-formed and label-specific", () => {
    expect(simulatedDigest("a")).toBe(simulatedDigest("a"));
    expect(simulatedDigest("a")).not.toBe(simulatedDigest("b"));
    expect(simulatedDigest("a")).toMatch(/^[a-f0-9]{64}$/);
  });
});
