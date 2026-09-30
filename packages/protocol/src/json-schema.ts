import { z } from "zod";
import { PROTOCOL_VERSION } from "./common";
import { PROTOCOL_SCHEMAS } from "./registry";

/**
 * Deterministic JSON Schema rendering of the protocol. Cross-field rules expressed with
 * `superRefine` (for example "continuation requires a checkpoint") are not representable in
 * JSON Schema; runtimes must enforce them in addition to structural validation.
 */
export function buildJsonSchemaDocument(): string {
  const definitions: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(PROTOCOL_SCHEMAS)) {
    definitions[name] = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" });
  }
  const document = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "MDX Studio runtime protocol",
    "x-protocolVersion": PROTOCOL_VERSION,
    "x-generatedFrom": "packages/protocol/src (zod). Do not edit by hand; run `pnpm schema:emit`.",
    definitions,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}
