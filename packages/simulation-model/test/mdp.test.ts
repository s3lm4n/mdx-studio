import { describe, expect, it } from "vitest";
import {
  getMdpValue,
  lintMdp,
  mdpEntries,
  normalizeMdpKey,
  parseMdp,
  removeMdpEntry,
  serializeMdp,
  setMdpValue,
} from "../src";

const SAMPLE = [
  "; Production run - demo parameters",
  "integrator  = md        ; leap-frog",
  "dt          = 0.002",
  "nsteps      = 500000",
  "",
  "tcoupl      = V-rescale",
  "tc_grps     = Protein  Non-Protein",
  "tau_t       = 0.1      0.1",
  "ref_t       = 300      300",
  "define      =",
  "",
].join("\n");

describe("MDP round-tripping", () => {
  it.each([
    ["typical file", SAMPLE],
    ["CRLF endings", SAMPLE.replaceAll("\n", "\r\n")],
    ["no trailing newline", SAMPLE.trimEnd()],
    ["mixed line endings", "a = 1\r\nb = 2\nc = 3\r"],
    ["tabs and odd spacing", "\tfoo\t=\t  bar  baz \t ; note  \n   x=1\n"],
    ["empty", ""],
    ["only comments", ";one\n  ; two\n"],
    ["garbage lines", "this is not valid\n= 5\nkey = value\n"],
    ["unicode comment", "a = 1 ; π ≈ 3.14\n"],
  ])("serializes %s byte-for-byte", (_label, text) => {
    expect(serializeMdp(parseMdp(text))).toBe(text);
  });
});

describe("MDP parsing", () => {
  it("classifies lines and extracts values without comments", () => {
    const document = parseMdp(SAMPLE);
    expect(getMdpValue(document, "integrator")).toBe("md");
    expect(getMdpValue(document, "dt")).toBe("0.002");
    expect(getMdpValue(document, "tc-grps")).toBe("Protein  Non-Protein");
    expect(getMdpValue(document, "define")).toBe("");
    expect(getMdpValue(document, "missing")).toBeUndefined();
  });

  it("treats '-' and '_' and case as equivalent in keys", () => {
    const document = parseMdp(SAMPLE);
    expect(getMdpValue(document, "TC_GRPS")).toBe(getMdpValue(document, "tc-grps"));
    expect(normalizeMdpKey("Tau_T")).toBe("tau-t");
  });

  it("keeps '=' inside values", () => {
    const document = parseMdp("define = -DPOSRES -DFOO=1\n");
    expect(getMdpValue(document, "define")).toBe("-DPOSRES -DFOO=1");
  });

  it("exposes entries in file order", () => {
    expect(mdpEntries(parseMdp(SAMPLE)).map((e) => e.key)).toEqual([
      "integrator",
      "dt",
      "nsteps",
      "tcoupl",
      "tc_grps",
      "tau_t",
      "ref_t",
      "define",
    ]);
  });
});

describe("MDP editing", () => {
  it("changes only the edited value and preserves spacing and comments", () => {
    const edited = serializeMdp(setMdpValue(parseMdp(SAMPLE), "integrator", "sd"));
    expect(edited).toBe(SAMPLE.replace("integrator  = md        ;", "integrator  = sd        ;"));
  });

  it("keeps the author's key spelling when editing", () => {
    const edited = serializeMdp(setMdpValue(parseMdp(SAMPLE), "tc-grps", "System"));
    expect(edited).toContain("tc_grps     = System\n");
  });

  it("does not mutate the original document", () => {
    const original = parseMdp(SAMPLE);
    setMdpValue(original, "dt", "0.004");
    expect(getMdpValue(original, "dt")).toBe("0.002");
  });

  it("appends missing keys using the document's line ending", () => {
    const crlf = SAMPLE.replaceAll("\n", "\r\n");
    const edited = serializeMdp(setMdpValue(parseMdp(crlf), "nstlist", "20"));
    expect(edited.endsWith("define      =\r\nnstlist = 20\r\n")).toBe(true);
  });

  it("terminates an unterminated last line before appending", () => {
    const edited = serializeMdp(setMdpValue(parseMdp("dt = 0.002"), "nsteps", "10"));
    expect(edited).toBe("dt = 0.002\nnsteps = 10\n");
  });

  it("cannot be used to inject extra lines or comments through a value", () => {
    const edited = serializeMdp(setMdpValue(parseMdp("dt = 0.002\n"), "dt", "1\nevil = yes ; x"));
    expect(edited.split("\n").filter((line) => line !== "")).toHaveLength(1);
    expect(getMdpValue(parseMdp(edited), "evil")).toBeUndefined();
  });

  it("removes entries and ignores absent keys", () => {
    const document = parseMdp(SAMPLE);
    expect(getMdpValue(removeMdpEntry(document, "dt"), "dt")).toBeUndefined();
    expect(removeMdpEntry(document, "nope")).toBe(document);
  });
});

describe("MDP lint (non-authoritative)", () => {
  it("accepts a clean document", () => {
    expect(lintMdp(SAMPLE)).toEqual([]);
  });

  it("flags invalid lines with their line number", () => {
    const issues = lintMdp("dt = 0.002\nnot a pair\n");
    expect(issues).toEqual([expect.objectContaining({ severity: "error", line: 2, key: null })]);
  });

  it("flags duplicate keys even when spelled differently", () => {
    const issues = lintMdp("tc-grps = A\ntc_grps = B\n");
    expect(issues).toEqual([expect.objectContaining({ severity: "error", line: 2 })]);
  });

  it("flags non-numeric values for numeric fields", () => {
    const issues = lintMdp("dt = fast\nnsteps = 1.5\nnstlist = 10\n");
    expect(issues.map((i) => i.key)).toEqual(["dt", "nsteps"]);
  });

  it("accepts scientific notation and negative integers", () => {
    expect(lintMdp("dt = 2e-3\nnsteps = -1\n")).toEqual([]);
  });

  it("flags tc-grps / tau-t / ref-t count mismatches", () => {
    const issues = lintMdp("tc-grps = A B\ntau-t = 0.1\nref-t = 300 300\n");
    expect(issues).toEqual([expect.objectContaining({ key: "tau-t", line: 2 })]);
  });

  it("warns about the removed group cut-off scheme", () => {
    const issues = lintMdp("cutoff-scheme = group\n");
    expect(issues).toEqual([expect.objectContaining({ severity: "warning" })]);
  });
});

describe("line-addressed MDP edits", () => {
  const DUP = "tc-grps = A\ntc_grps = B ; second\ndt = 0.002\n";

  it("edits a duplicate entry without touching the first", async () => {
    const { setMdpValueAtLine } = await import("../src");
    const edited = serializeMdp(setMdpValueAtLine(parseMdp(DUP), 1, "C"));
    expect(edited).toBe("tc-grps = A\ntc_grps = C ; second\ndt = 0.002\n");
  });

  it("ignores non-entry lines and out-of-range indexes", async () => {
    const { setMdpValueAtLine, removeMdpLineAt } = await import("../src");
    const document = parseMdp("; note\ndt = 1\n");
    expect(setMdpValueAtLine(document, 0, "x")).toBe(document);
    expect(setMdpValueAtLine(document, 9, "x")).toBe(document);
    expect(removeMdpLineAt(document, 9)).toBe(document);
  });

  it("removes exactly one line", async () => {
    const { removeMdpLineAt } = await import("../src");
    expect(serializeMdp(removeMdpLineAt(parseMdp(DUP), 0))).toBe(
      "tc_grps = B ; second\ndt = 0.002\n",
    );
  });
});

describe("matchLineEndings", () => {
  it("re-applies CRLF when the previous text was CRLF", async () => {
    const { matchLineEndings } = await import("../src");
    expect(matchLineEndings("a = 1\r\nb = 2\r\n", "a = 1\nb = 3\n")).toBe("a = 1\r\nb = 3\r\n");
  });

  it("keeps LF for LF (or unterminated) originals and strips stray CRs from CRLF input", async () => {
    const { matchLineEndings } = await import("../src");
    expect(matchLineEndings("a = 1\nb = 2\n", "a = 1\r\nb = 3\r\n")).toBe("a = 1\nb = 3\n");
    expect(matchLineEndings("a = 1", "a = 2\nb = 3")).toBe("a = 2\nb = 3");
  });

  it("resolves mixed endings to the dominant style", async () => {
    const { matchLineEndings } = await import("../src");
    expect(matchLineEndings("a\r\nb\r\nc\n", "x\ny\n")).toBe("x\r\ny\r\n");
    expect(matchLineEndings("a\nb\nc\r\n", "x\ny\n")).toBe("x\ny\n");
  });

  it("is idempotent once applied", async () => {
    const { matchLineEndings } = await import("../src");
    const once = matchLineEndings("a\r\nb\r\n", "q\nr\n");
    expect(matchLineEndings("a\r\nb\r\n", once)).toBe(once);
  });
});
