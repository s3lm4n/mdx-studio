import { readFileSync } from "node:fs";
import { PROTOCOL_VERSION, RuntimeCapabilitiesSchema, RuntimeHealthSchema } from "../src";
import { describe, expect, it } from "vitest";

function readFixture(name: string): unknown {
  const url = new URL(`../../../services/runtime/tests/fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as unknown;
}

function assertFixtureConforms<T>(schema: { parse(raw: unknown): T }, raw: unknown): T {
  const parsed = schema.parse(raw);
  expect(parsed).toEqual(raw);
  expect(raw).toHaveProperty("protocolVersion", PROTOCOL_VERSION);
  return parsed;
}

describe("Python runtime service fixtures", () => {
  it("validates health against the TypeScript protocol", () => {
    const health = assertFixtureConforms(RuntimeHealthSchema, readFixture("runtime-health.json"));

    expect(health.implementation).toBe("mdx-runtime-python");
    expect(health.origin).toBe("measured");
  });

  it("validates capabilities against the TypeScript protocol", () => {
    const capabilities = assertFixtureConforms(
      RuntimeCapabilitiesSchema,
      readFixture("runtime-capabilities.json"),
    );

    expect(capabilities.origin).toBe("measured");
    expect(capabilities.gromacs.origin).toBe("measured");
    expect(capabilities.mdxDevice).toEqual({ integration: "mock", origin: "simulated" });
    expect(capabilities.runModes).toEqual([]);
  });

  it.each([
    ["health", RuntimeHealthSchema, "runtime-health.json"],
    ["capabilities", RuntimeCapabilitiesSchema, "runtime-capabilities.json"],
  ] as const)("rejects unknown top-level fields in %s", (_name, schema, filename) => {
    const raw = { ...schema.parse(readFixture(filename)), binaryPath: "/unexpected/gmx" };

    expect(schema.parse(raw)).not.toEqual(raw);
    expect(() => assertFixtureConforms<unknown>(schema, raw)).toThrow();
  });

  it.each(["gromacs", "mdxDevice", "mdxProfiles"] as const)(
    "rejects unknown fields nested in %s",
    (field) => {
      const raw = RuntimeCapabilitiesSchema.parse(readFixture("runtime-capabilities.json"));
      const extended =
        field === "mdxProfiles"
          ? {
              ...raw,
              mdxProfiles: [{ id: "mock", title: "Mock", description: "Simulated", extra: true }],
            }
          : { ...raw, [field]: { ...raw[field], binaryPath: "/unexpected/gmx" } };

      expect(RuntimeCapabilitiesSchema.parse(extended)).not.toEqual(extended);
      expect(() => assertFixtureConforms(RuntimeCapabilitiesSchema, extended)).toThrow();
    },
  );

  it.each([
    ["health", RuntimeHealthSchema, "runtime-health.json"],
    ["capabilities", RuntimeCapabilitiesSchema, "runtime-capabilities.json"],
  ] as const)("rejects a mismatched protocol version in %s", (_name, schema, filename) => {
    const raw = { ...schema.parse(readFixture(filename)), protocolVersion: "0.0.0" };

    expect(() => assertFixtureConforms<unknown>(schema, raw)).toThrow();
  });
});
