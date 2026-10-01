import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { isSource, walk } from "./helpers";

it("skips .venv while traversing ordinary source directories, including venv", () => {
  const root = mkdtempSync(join(tmpdir(), "mdx-architecture-"));
  try {
    const directories = [".venv", "venv", join("src", "feature")];
    for (const directory of directories) {
      const full = join(root, directory);
      mkdirSync(full, { recursive: true });
      writeFileSync(join(full, "source.ts"), "export {};\n");
    }

    expect(walk(root, isSource)).toEqual(
      [join(root, "venv", "source.ts"), join(root, "src", "feature", "source.ts")].sort(),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
