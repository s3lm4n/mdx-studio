import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { JOB_STATES, DEVICE_STATES, PROTOCOL_SCHEMAS, PROTOCOL_VERSION } from "../src";
import { buildJsonSchemaDocument } from "../src/json-schema";

describe("protocol JSON Schema artifact", () => {
  it("is committed and in sync with the zod sources (run `pnpm schema:emit` to refresh)", () => {
    const onDisk = readFileSync(resolve(__dirname, "../schema/protocol.schema.json"), "utf8");
    expect(onDisk).toBe(buildJsonSchemaDocument());
  });

  it("describes every registered contract type and carries the protocol version", () => {
    const document = JSON.parse(buildJsonSchemaDocument()) as {
      definitions: Record<string, unknown>;
      "x-protocolVersion": string;
    };
    expect(Object.keys(document.definitions).sort()).toEqual(Object.keys(PROTOCOL_SCHEMAS).sort());
    expect(document["x-protocolVersion"]).toBe(PROTOCOL_VERSION);
  });

  it("contains no machine-specific absolute paths", () => {
    const text = buildJsonSchemaDocument();
    expect(text).not.toMatch(/C:\\\\Users|\/home\/[A-Za-z0-9._-]+\//);
  });
});

describe("state vocabularies", () => {
  it("match the documented safety model", () => {
    expect(DEVICE_STATES).toEqual([
      "DISCONNECTED",
      "CONNECTING",
      "READY",
      "RUNNING",
      "THROTTLED",
      "ERROR",
      "ABORTING",
    ]);
    expect(JOB_STATES).toEqual([
      "CREATED",
      "VALIDATING",
      "READY",
      "STARTING",
      "RUNNING",
      "PAUSED",
      "COMPLETED",
      "FAILED",
      "ABORTED",
    ]);
  });
});
