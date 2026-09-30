import {
  lintMdp,
  matchLineEndings,
  parseMdp,
  serializeMdp,
  type MdpDocument,
} from "@mdx-studio/simulation-model";
import { Badge, Button, Callout, Panel, Tabs, panelId } from "@mdx-studio/ui";
import { useMemo, useState } from "react";
import type { MdpDocument as StoredMdp } from "@mdx-studio/protocol";
import { useRuntime } from "../../app/runtime-context";
import { shortDigest } from "../../services/format";
import { ErrorNotice } from "../common";
import { AdvancedEditor } from "./AdvancedEditor";
import { BasicEditor } from "./BasicEditor";

type EditorMode = "basic" | "advanced" | "raw";

const MODES = [
  { id: "basic", label: "Basic" },
  { id: "advanced", label: "Advanced" },
  { id: "raw", label: "Raw" },
] as const;

/**
 * The raw text is the single source of truth. Basic and Advanced parse it, apply a line-local
 * edit and serialize back, so unedited bytes (comments, spacing, line endings) are preserved.
 */
export function MdpEditor({ stored }: { stored: StoredMdp }) {
  const runtime = useRuntime();
  const [mode, setMode] = useState<EditorMode>("basic");
  // The parsed document is the state. Structured edits transform it directly (never via a
  // text round-trip, which would re-flow whitespace around empty values); only Raw edits parse.
  const [document, setDocument] = useState<MdpDocument>(() => parseMdp(stored.text));
  const [saved, setSaved] = useState(stored);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error>();

  const text = useMemo(() => serializeMdp(document), [document]);
  const issues = useMemo(() => lintMdp(document), [document]);
  const dirty = text !== saved.text;

  const apply = (next: MdpDocument) => {
    setDocument(next);
  };

  async function save() {
    setSaving(true);
    setSaveError(undefined);
    try {
      setSaved(await runtime.writeMdp(stored.projectId, stored.path, text));
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="row row--between">
        <div className="row">
          <span className="mdx-mono">{stored.path}</span>
          {dirty ? <Badge tone="warn">Unsaved changes</Badge> : <Badge tone="neutral">Saved</Badge>}
          <span className="mdx-faint mdx-mono" title={saved.sha256}>
            sha256 {shortDigest(saved.sha256, 12)}
          </span>
        </div>
        <div className="row">
          <Button
            disabled={!dirty || saving}
            onClick={() => {
              setDocument(parseMdp(saved.text));
            }}
          >
            Revert
          </Button>
          <Button
            variant="primary"
            disabled={!dirty || saving}
            onClick={() => {
              void save();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {saveError === undefined ? null : <ErrorNotice error={saveError} title="Could not save" />}

      <Tabs<EditorMode>
        ariaLabel="MDP editor mode"
        idPrefix="mdp"
        tabs={MODES}
        selected={mode}
        onSelect={setMode}
      />
      <div role="tabpanel" id={panelId("mdp", mode)} aria-labelledby={`mdp-tab-${mode}`}>
        {mode === "basic" ? <BasicEditor document={document} onChange={apply} /> : null}
        {mode === "advanced" ? <AdvancedEditor document={document} onChange={apply} /> : null}
        {mode === "raw" ? (
          <textarea
            className="mdx-textarea"
            aria-label="Raw MDP text"
            rows={26}
            spellCheck={false}
            wrap="off"
            value={text}
            onChange={(event) => {
              // A textarea reports LF-only text; restore the file's own line-ending style so
              // editing a Windows (CRLF) MDP does not rewrite every line ending.
              const value = event.target.value;
              setDocument((current) => parseMdp(matchLineEndings(serializeMdp(current), value)));
            }}
          />
        ) : null}
      </div>

      <Panel title="Editor checks">
        <div className="stack">
          <span className="mdx-muted">
            Structural checks for editing feedback only. The runtime performs the authoritative
            validation before any run.
          </span>
          {issues.length === 0 ? (
            <Badge tone="pass">No structural problems found</Badge>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }} aria-label="MDP problems">
              {issues.map((issue) => (
                <li key={`${issue.line}:${issue.message}`}>
                  <Badge tone={issue.severity === "error" ? "fail" : "warn"}>
                    {issue.severity === "error" ? "Error" : "Warning"}
                  </Badge>{" "}
                  <span className="mdx-mono">line {issue.line}</span> &mdash; {issue.message}
                </li>
              ))}
            </ul>
          )}
          <Callout tone="info">
            Raw view shows and saves exactly what you type. Basic and Advanced edits change only the
            affected value and keep comments and spacing.
          </Callout>
        </div>
      </Panel>
    </div>
  );
}
