import { describe, expect, it } from "vitest";
import { PROTOCOL_SCHEMAS, SimulationRequestSchema } from "../../packages/protocol/src";
import { buildJsonSchemaDocument } from "../../packages/protocol/src/json-schema";

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  additionalProperties?: unknown;
  pattern?: string;
  enum?: unknown[];
  const?: unknown;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

const document = JSON.parse(buildJsonSchemaDocument()) as {
  definitions: Record<string, JsonSchema>;
};

function definition(name: string): JsonSchema {
  const found = document.definitions[name];
  if (found === undefined) throw new Error(`Missing JSON Schema definition: ${name}`);
  return found;
}

/** Request fields are an explicit allow-list: adding one is a deliberate, reviewed change. */
const ALLOWED_REQUEST_FIELDS = [
  "checkpoint",
  "continuation",
  "inputStructure",
  "mdp",
  "mdxProfile",
  "outputDirectory",
  "outputName",
  "projectId",
  "resources",
  "runMode",
  "stage",
  "topology",
  "validationProfile",
];

function constrained(schema: JsonSchema): boolean {
  if (schema.enum !== undefined || schema.const !== undefined || schema.pattern !== undefined)
    return true;
  return (schema.allOf ?? []).some(constrained);
}

function freeFormStrings(schema: JsonSchema, path: string): string[] {
  if (schema.type === "string") return constrained(schema) ? [] : [path];
  const children = Object.entries(schema.properties ?? {}).flatMap(([key, child]) =>
    freeFormStrings(child, `${path}.${key}`),
  );
  const variants = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].flatMap((v) =>
    freeFormStrings(v, path),
  );
  return [...children, ...variants];
}

describe("SimulationRequest is a closed, structured surface", () => {
  const request = definition("SimulationRequest");

  it("exposes exactly the reviewed set of fields", () => {
    expect(Object.keys(SimulationRequestSchema.shape).sort()).toEqual(ALLOWED_REQUEST_FIELDS);
    expect(Object.keys(request.properties ?? {}).sort()).toEqual(ALLOWED_REQUEST_FIELDS);
  });

  it("has no field that could carry a command, flags, script or environment", () => {
    const suspicious = new Set([
      "command",
      "cmd",
      "arg",
      "args",
      "argv",
      "flag",
      "flags",
      "shell",
      "script",
      "exec",
      "env",
      "environment",
      "option",
      "options",
      "param",
      "params",
    ]);
    // Compare whole camelCase words so "computeTarget" is not mistaken for "arg".
    const words = (name: string) => name.split(/(?=[A-Z])|[-_]/).map((w) => w.toLowerCase());
    const names = [
      ...Object.keys(request.properties ?? {}),
      ...Object.keys(request.properties?.["resources"]?.properties ?? {}),
    ].filter((name) => words(name).some((w) => suspicious.has(w)));
    expect(names).toEqual([]);
    expect(words("computeTarget")).toEqual(["compute", "target"]);
    expect(words("extraArgs").some((w) => suspicious.has(w))).toBe(true);
  });

  it("rejects unknown properties at every object level", () => {
    expect(request.additionalProperties).toBe(false);
    expect(request.properties?.["resources"]?.additionalProperties).toBe(false);
  });

  it("has no free-form string field: every string is an enum or pattern-constrained", () => {
    expect(freeFormStrings(request, "SimulationRequest")).toEqual([]);
  });

  it("never embeds the command-provenance types", () => {
    expect(JSON.stringify(request)).not.toMatch(/argv|display|workingDirectory/);
  });
});

describe("origin labelling is part of the contract", () => {
  it("every response type that can carry mock data declares an origin", () => {
    // A request is input; an error carries no data; an MDP document is user-authored file text.
    const exempt = new Set(["SimulationRequest", "RuntimeError", "MdpDocument"]);
    const missing = Object.keys(PROTOCOL_SCHEMAS).filter((name) => {
      if (exempt.has(name)) return false;
      const schema = document.definitions[name];
      const props = schema?.properties ?? {};
      // JobEvent is a union; each variant carries origin.
      const variants = schema?.oneOf ?? schema?.anyOf ?? [];
      return variants.length > 0
        ? !variants.every((v) => v.properties?.["origin"] !== undefined)
        : props["origin"] === undefined && name !== "PreflightCheck";
    });
    expect(missing).toEqual([]);
  });

  it("origin is exactly simulated | measured", () => {
    const health = document.definitions["RuntimeHealth"];
    expect(health?.properties?.["origin"]?.enum).toEqual(["simulated", "measured"]);
  });
});
