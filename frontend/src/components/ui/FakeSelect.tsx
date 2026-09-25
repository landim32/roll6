interface FakeSelectProps {
  caption: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/** Button that looks like a select box; clicking opens a modal instead of a dropdown. */
export const FakeSelect = ({ caption, label, onClick, disabled = false }: FakeSelectProps) => (
  <button type="button" className="form-select form-select-sm stm-fake-select" onClick={onClick} disabled={disabled}>
    <small>{caption}</small>
    {label}
  </button>
);

export default FakeSelect;
