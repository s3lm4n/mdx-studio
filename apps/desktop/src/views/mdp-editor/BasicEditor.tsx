import {
  MDP_FIELDS,
  MDP_GROUP_LABELS,
  getMdpValue,
  removeMdpEntry,
  setMdpValue,
  type MdpDocument,
  type MdpFieldDefinition,
  type MdpFieldGroup,
} from "@mdx-studio/simulation-model";
import { Field, Panel } from "@mdx-studio/ui";

const GROUP_ORDER = Object.keys(MDP_GROUP_LABELS) as MdpFieldGroup[];

interface BasicEditorProps {
  document: MdpDocument;
  onChange: (next: MdpDocument) => void;
}

interface ControlProps extends BasicEditorProps {
  field: MdpFieldDefinition;
  /** Injected by <Field> so the label, help text and error are tied to the control. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

function FieldControl({ field, document, onChange, ...a11y }: ControlProps) {
  const value = getMdpValue(document, field.key);

  const update = (next: string) => {
    if (next === "" && value === undefined) return;
    onChange(setMdpValue(document, field.key, next));
  };

  if (field.type === "enum") {
    const options = field.options ?? [];
    // GROMACS treats enum values case-insensitively: show the matching canonical option.
    const match =
      value === undefined
        ? undefined
        : options.find((o) => o.toLowerCase() === value.toLowerCase());
    const known = value === undefined || match !== undefined;
    return (
      <select
        {...a11y}
        className="mdx-select"
        value={match ?? value ?? ""}
        onChange={(event) => {
          if (event.target.value === "") onChange(removeMdpEntry(document, field.key));
          else update(event.target.value);
        }}
      >
        <option value="">(not set)</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {known ? null : <option value={value}>{value} (custom)</option>}
      </select>
    );
  }

  return (
    <input
      {...a11y}
      className="mdx-input"
      value={value ?? ""}
      placeholder="(not set)"
      inputMode={
        field.type === "integer" ? "numeric" : field.type === "number" ? "decimal" : "text"
      }
      onChange={(event) => {
        update(event.target.value);
      }}
    />
  );
}

/** Structured editing of common parameters. Edits touch only the affected line's value. */
export function BasicEditor({ document, onChange }: BasicEditorProps) {
  return (
    <div className="grid grid--2">
      {GROUP_ORDER.map((group) => {
        const fields = MDP_FIELDS.filter((field) => field.group === group);
        return (
          <Panel key={group} title={MDP_GROUP_LABELS[group]}>
            <div className="stack">
              {fields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  help={`${field.description}${field.unit === undefined ? "" : ` Unit: ${field.unit}.`}`}
                >
                  <FieldControl field={field} document={document} onChange={onChange} />
                </Field>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
