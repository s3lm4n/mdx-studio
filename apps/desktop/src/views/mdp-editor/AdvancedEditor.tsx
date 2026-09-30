import {
  removeMdpLineAt,
  setMdpValue,
  setMdpValueAtLine,
  type MdpDocument,
  type MdpEntry,
} from "@mdx-studio/simulation-model";
import { Button, DataTable, Field, Panel, type DataTableColumn } from "@mdx-studio/ui";
import { useState } from "react";

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

interface Row {
  lineIndex: number;
  entry: MdpEntry;
}

interface AdvancedEditorProps {
  document: MdpDocument;
  onChange: (next: MdpDocument) => void;
}

/** Every parameter as a row, addressed by line so duplicates can be fixed individually. */
export function AdvancedEditor({ document, onChange }: AdvancedEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const rows: Row[] = document.lines.flatMap((line, lineIndex) =>
    line.kind === "entry" ? [{ lineIndex, entry: line }] : [],
  );

  const keyError =
    newKey !== "" && !KEY_PATTERN.test(newKey)
      ? "Use letters, digits, '-' or '_' and start with a letter."
      : undefined;

  const columns: readonly DataTableColumn<Row>[] = [
    {
      key: "key",
      header: "Parameter",
      render: ({ entry, lineIndex }) => (
        <span className="mdx-mono">
          {entry.key} <span className="mdx-faint">line {lineIndex + 1}</span>
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: ({ entry, lineIndex }) => (
        <input
          className="mdx-input mdx-mono"
          aria-label={`Value of ${entry.key} (line ${lineIndex + 1})`}
          value={entry.value}
          onChange={(event) => {
            onChange(setMdpValueAtLine(document, lineIndex, event.target.value));
          }}
        />
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: ({ entry }) => <span className="mdx-muted mdx-mono">{entry.comment}</span>,
    },
    {
      key: "remove",
      header: "",
      render: ({ entry, lineIndex }) => (
        <Button
          variant="ghost"
          aria-label={`Remove ${entry.key} (line ${lineIndex + 1})`}
          onClick={() => {
            onChange(removeMdpLineAt(document, lineIndex));
          }}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="stack">
      <Panel title="Parameters" flush>
        <DataTable
          caption="MDP parameters"
          columns={columns}
          rows={rows}
          getRowKey={(row) => `${row.lineIndex}:${row.entry.key}`}
          emptyMessage="No parameters in this file."
        />
      </Panel>
      <Panel title="Add parameter">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <Field label="Name" error={keyError}>
            <input
              className="mdx-input mdx-mono"
              value={newKey}
              onChange={(event) => {
                setNewKey(event.target.value);
              }}
            />
          </Field>
          <Field label="Value">
            <input
              className="mdx-input mdx-mono"
              value={newValue}
              onChange={(event) => {
                setNewValue(event.target.value);
              }}
            />
          </Field>
          <div style={{ alignSelf: "flex-end" }}>
            <Button
              disabled={newKey === "" || keyError !== undefined}
              onClick={() => {
                onChange(setMdpValue(document, newKey, newValue));
                setNewKey("");
                setNewValue("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
