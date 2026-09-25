interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/** Controlled tabs using Bootstrap's nav-tabs. */
export const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <ul className="nav nav-tabs mb-3" role="tablist">
    {tabs.map((tab) => (
      <li className="nav-item" key={tab.key} role="presentation">
        <button
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`nav-link${active === tab.key ? ' active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      </li>
    ))}
  </ul>
);

export default Tabs;
