import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildJsonSchemaDocument } from "../src/json-schema";

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../schema/protocol.schema.json");
const next = buildJsonSchemaDocument();

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current !== next) {
    console.error("schema/protocol.schema.json is out of date. Run: pnpm schema:emit");
    process.exit(1);
  }
  console.log("schema/protocol.schema.json is up to date");
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, next);
  console.log(`wrote ${target}`);
}
