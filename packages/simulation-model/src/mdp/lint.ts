import { mdpEntries, getMdpValue, parseMdp, type MdpDocument } from "./document";
import { findMdpField } from "./fields";

export interface MdpLintIssue {
  readonly severity: "error" | "warning";
  readonly key: string | null;
  /** 1-based line number in the document. */
  readonly line: number;
  readonly message: string;
}

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function tokenCount(value: string | undefined): number {
  return value === undefined ? 0 : value.split(/\s+/).filter((token) => token !== "").length;
}

/**
 * Structural, NON-AUTHORITATIVE checks for editor feedback. The runtime performs the
 * authoritative validation (including `grompp`) before anything executes; these checks must not
 * be used to gate a run, and they intentionally encode no scientific tolerances.
 */
export function lintMdp(input: MdpDocument | string): MdpLintIssue[] {
  const document = typeof input === "string" ? parseMdp(input) : input;
  const issues: MdpLintIssue[] = [];
  const seen = new Map<string, number>();

  document.lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.kind === "invalid") {
      issues.push({
        severity: "error",
        key: null,
        line: lineNumber,
        message: "Line is not a 'key = value' pair or a ';' comment.",
      });
      return;
    }
    if (line.kind !== "entry") return;

    const firstSeen = seen.get(line.normalizedKey);
    if (firstSeen !== undefined) {
      issues.push({
        severity: "error",
        key: line.key,
        line: lineNumber,
        message: `'${line.key}' is defined more than once (first on line ${firstSeen}).`,
      });
    } else {
      seen.set(line.normalizedKey, lineNumber);
    }

    const field = findMdpField(line.normalizedKey);
    if (field === undefined || line.value === "") return;
    if (field.type === "integer" && !INTEGER.test(line.value)) {
      issues.push({
        severity: "error",
        key: line.key,
        line: lineNumber,
        message: `'${line.key}' expects an integer, found '${line.value}'.`,
      });
    }
    if (field.type === "number" && !NUMBER.test(line.value)) {
      issues.push({
        severity: "error",
        key: line.key,
        line: lineNumber,
        message: `'${line.key}' expects a number, found '${line.value}'.`,
      });
    }
    if (line.normalizedKey === "cutoff-scheme" && line.value.trim().toLowerCase() === "group") {
      issues.push({
        severity: "warning",
        key: line.key,
        line: lineNumber,
        message: "The 'group' cut-off scheme is not supported by current GROMACS versions.",
      });
    }
  });

  const groups = tokenCount(getMdpValue(document, "tc-grps"));
  for (const key of ["tau-t", "ref-t"]) {
    const count = tokenCount(getMdpValue(document, key));
    const entry = mdpEntries(document).find((e) => e.normalizedKey === key);
    if (groups > 0 && count > 0 && count !== groups && entry !== undefined) {
      issues.push({
        severity: "error",
        key: entry.key,
        line: document.lines.indexOf(entry) + 1,
        message: `'${entry.key}' has ${count} value(s) but tc-grps lists ${groups} group(s).`,
      });
    }
  }
  return issues;
}
