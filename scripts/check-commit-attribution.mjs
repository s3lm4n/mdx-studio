#!/usr/bin/env node
// Rejects Claude/Anthropic attribution metadata in the commits a range introduces.
// Policy: CLAUDE.md, "Git attribution policy". Run with --help for usage.

import { run } from "./lib/commit-attribution.mjs";

process.exitCode = run(process.argv.slice(2));
