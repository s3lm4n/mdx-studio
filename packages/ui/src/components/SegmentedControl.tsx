export interface SegmentedOption<Id extends string> {
  id: Id;
  label: string;
  disabled?: boolean;
  title?: string;
}

export interface SegmentedControlProps<Id extends string> {
  options: readonly SegmentedOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
}

export function SegmentedControl<Id extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<Id>) {
  return (
    <div className="mdx-segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          disabled={option.disabled}
          title={option.title}
          className="mdx-segmented__option"
          onClick={() => {
            onChange(option.id);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
