import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export const REPO_ROOT = resolve(import.meta.dirname, "../..");

const SKIP_DIRS = new Set(["node_modules", "dist", "target", ".git", "gen", "coverage", ".venv"]);

export function walk(dir: string, accept: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, accept));
    else if (accept(full)) out.push(full);
  }
  return out.sort();
}

export function rel(file: string): string {
  return relative(REPO_ROOT, file).split(sep).join("/");
}

export function read(file: string): string {
  return readFileSync(file, "utf8");
}

export const isSource = (file: string) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts");
export const isTest = (file: string) =>
  /\.test\.(ts|tsx)$/.test(file) || rel(file).includes("/test/");

export interface Finding {
  file: string;
  line: number;
  text: string;
}

/** Every import/require specifier in a source file, including dynamic `import("x")`. */
export function importSpecifiers(
  source: string,
  fileName: string,
): { spec: string; line: number }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: { spec: string; line: number }[] = [];
  const visit = (node: ts.Node) => {
    const line = () => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push({ spec: node.moduleSpecifier.text, line: line() });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push({ spec: node.arguments[0].text, line: line() });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Text of every string literal, template chunk and JSX text node (comments excluded). */
export function textLiterals(source: string, fileName: string): { text: string; line: number }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: { text: string; line: number }[] = [];
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isStringLiteralLike(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      text = node.text;
    } else if (ts.isJsxText(node)) text = node.text;
    if (text !== undefined && text.trim() !== "") {
      found.push({ text, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Names of called functions; `method` is true for `obj.name(...)` (e.g. `regex.exec`). */
export function calledNames(
  source: string,
  fileName: string,
): { name: string; line: number; method: boolean }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: { name: string; line: number; method: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : undefined;
      if (name !== undefined) {
        found.push({
          name,
          method: ts.isPropertyAccessExpression(callee),
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}
