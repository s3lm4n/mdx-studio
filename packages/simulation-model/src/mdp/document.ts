/**
 * Lossless MDP document model.
 *
 * The Raw editor must preserve the user's actual text, so the document keeps every line's
 * original text and line ending. `serializeMdp(parseMdp(text)) === text` for any input, and
 * structured edits touch only the value portion of the affected line.
 */

export interface MdpEntry {
  readonly kind: "entry";
  /** Key exactly as written. */
  readonly key: string;
  /** Lower-case, `_` folded to `-` (GROMACS treats both separators and case as equivalent). */
  readonly normalizedKey: string;
  readonly value: string;
  readonly indent: string;
  readonly separator: string;
  /** Whitespace between the value and a trailing comment (or end of line). */
  readonly gap: string;
  /** Trailing `; comment` including the semicolon, or `""`. */
  readonly comment: string;
  readonly eol: string;
}

export interface MdpOtherLine {
  readonly kind: "blank" | "comment" | "invalid";
  readonly text: string;
  readonly eol: string;
}

export type MdpLine = MdpEntry | MdpOtherLine;

export interface MdpDocument {
  readonly lines: readonly MdpLine[];
}

export function normalizeMdpKey(key: string): string {
  return key.trim().toLowerCase().replaceAll("_", "-");
}

const ENTRY_PATTERN = /^(\s*)([^=;\s](?:[^=;]*[^=;\s])?)(\s*=\s*)([^;]*?)(\s*)(;.*)?$/;

function splitLines(text: string): { text: string; eol: string }[] {
  const lines: { text: string; eol: string }[] = [];
  const pattern = /([^\r\n]*)(\r\n|\n|\r)/gy;
  let index = 0;
  for (;;) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (match === null) break;
    lines.push({ text: match[1] ?? "", eol: match[2] ?? "" });
    index = pattern.lastIndex;
  }
  if (index < text.length) {
    lines.push({ text: text.slice(index), eol: "" });
  }
  return lines;
}

function parseLine(text: string, eol: string): MdpLine {
  if (text.trim() === "") return { kind: "blank", text, eol };
  if (text.trimStart().startsWith(";")) return { kind: "comment", text, eol };
  const match = ENTRY_PATTERN.exec(text);
  if (match === null) return { kind: "invalid", text, eol };
  const [, indent = "", key = "", separator = "", value = "", gap = "", comment = ""] = match;
  return {
    kind: "entry",
    key,
    normalizedKey: normalizeMdpKey(key),
    value,
    indent,
    separator,
    gap,
    comment,
    eol,
  };
}

export function parseMdp(text: string): MdpDocument {
  return { lines: splitLines(text).map((line) => parseLine(line.text, line.eol)) };
}

function serializeLine(line: MdpLine): string {
  if (line.kind === "entry") {
    return `${line.indent}${line.key}${line.separator}${line.value}${line.gap}${line.comment}${line.eol}`;
  }
  return `${line.text}${line.eol}`;
}

export function serializeMdp(document: MdpDocument): string {
  return document.lines.map(serializeLine).join("");
}

export function mdpEntries(document: MdpDocument): MdpEntry[] {
  return document.lines.filter((line): line is MdpEntry => line.kind === "entry");
}

function findEntryIndex(document: MdpDocument, key: string): number {
  const normalized = normalizeMdpKey(key);
  return document.lines.findIndex(
    (line) => line.kind === "entry" && line.normalizedKey === normalized,
  );
}

/** Value of the first entry for `key` (duplicates are reported by {@link lintMdp}). */
export function getMdpValue(document: MdpDocument, key: string): string | undefined {
  const index = findEntryIndex(document, key);
  const line = index < 0 ? undefined : document.lines[index];
  return line?.kind === "entry" ? line.value : undefined;
}

/** Replace a value in place (keeping indentation, spacing and comment) or append a new entry. */
export function setMdpValue(document: MdpDocument, key: string, value: string): MdpDocument {
  const sanitized = value.replace(/[\r\n;]/g, " ").trim();
  const index = findEntryIndex(document, key);
  const existing = document.lines[index];
  if (existing?.kind === "entry") {
    const lines = document.lines.slice();
    // An emptied value with a trailing comment keeps a space so the comment stays separate.
    const gap = existing.comment !== "" && existing.gap === "" ? " " : existing.gap;
    lines[index] = { ...existing, value: sanitized, gap };
    return { lines };
  }
  const lines = document.lines.slice();
  const eol = lines.find((line) => line.eol !== "")?.eol ?? "\n";
  const last = lines[lines.length - 1];
  if (last?.eol === "") {
    // Terminate the previously unterminated final line before appending.
    lines[lines.length - 1] = { ...last, eol };
  }
  lines.push({
    kind: "entry",
    key: key.trim(),
    normalizedKey: normalizeMdpKey(key),
    value: sanitized,
    indent: "",
    separator: " = ",
    gap: "",
    comment: "",
    eol,
  });
  return { lines };
}

/** Remove the first entry for `key`. No-op when the key is absent. */
export function removeMdpEntry(document: MdpDocument, key: string): MdpDocument {
  const index = findEntryIndex(document, key);
  if (index < 0) return document;
  return { lines: document.lines.filter((_, i) => i !== index) };
}

/**
 * Replace the value of the entry on a specific line. Unlike {@link setMdpValue} this addresses
 * duplicates individually, which the Advanced editor needs to fix doubly-defined keys.
 */
export function setMdpValueAtLine(
  document: MdpDocument,
  lineIndex: number,
  value: string,
): MdpDocument {
  const line = document.lines[lineIndex];
  if (line?.kind !== "entry") return document;
  const sanitized = value.replace(/[\r\n;]/g, " ").trim();
  const gap = line.comment !== "" && line.gap === "" ? " " : line.gap;
  const lines = document.lines.slice();
  lines[lineIndex] = { ...line, value: sanitized, gap };
  return { lines };
}

/** Remove a single line by index (entry, comment, blank or invalid). */
export function removeMdpLineAt(document: MdpDocument, lineIndex: number): MdpDocument {
  if (lineIndex < 0 || lineIndex >= document.lines.length) return document;
  return { lines: document.lines.filter((_, index) => index !== lineIndex) };
}

/**
 * Re-apply the line-ending style of `previous` to `next`.
 *
 * Browsers normalise a `<textarea>`'s value to LF, so editing a CRLF (Windows-authored) file in
 * a text area would otherwise silently rewrite every line ending. When `previous` predominantly
 * used CRLF, `next` is converted to CRLF; otherwise it is normalised to LF. Mixed endings cannot
 * round-trip through a text area and are resolved to the dominant style.
 */
export function matchLineEndings(previous: string, next: string): string {
  const crlf = (previous.match(/\r\n/g) ?? []).length;
  const lf = (previous.match(/(?<!\r)\n/g) ?? []).length;
  const normalized = next.replace(/\r\n/g, "\n");
  return crlf > lf ? normalized.replaceAll("\n", "\r\n") : normalized;
}
