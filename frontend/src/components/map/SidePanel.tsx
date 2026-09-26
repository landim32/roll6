import { useState } from 'react';
import type { ReactNode } from 'react';

interface SidePanelProps {
  /** Edge of the map the panel sticks to. */
  side: 'left' | 'right';
  title: string;
  /** localStorage key of the collapsed state ("1" = collapsed). */
  storageKey: string;
  collapseLabel: string;
  expandLabel: string;
  /** List items (`<li>`). */
  children: ReactNode;
  /** Below the list (e.g. an add button). */
  footer?: ReactNode;
}

const readCollapsed = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/**
 * Fixed, compact panel over the map, below the menu, on the left (party) or right (NPCs): header with the
 * title and a collapse button, a scrolling list and an optional footer. Collapsed, it becomes a narrow
 * vertical tab; the choice is remembered in this browser.
 */
export const SidePanel = ({ side, title, storageKey, collapseLabel, expandLabel, children, footer }: SidePanelProps) => {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));
  const sideClass = side === 'right' ? ' stm-side-right' : '';

  const toggle = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(storageKey, prev ? '0' : '1');
      } catch {
        // Not remembered when storage is blocked.
      }
      return !prev;
    });
  };

  if (collapsed) {
    return (
      <button type="button" className={`stm-party stm-party-collapsed${sideClass}`} onClick={toggle} aria-label={expandLabel} title={expandLabel}>
        <span>{title}</span>
      </button>
    );
  }

  return (
    <section className={`stm-party${sideClass}`} aria-label={title}>
      <header>
        <span>{title}</span>
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={toggle} aria-label={collapseLabel} title={collapseLabel}>
          {side === 'right' ? '›' : '‹'}
        </button>
      </header>
      <ul>{children}</ul>
      {footer && <footer className="stm-party-footer">{footer}</footer>}
    </section>
  );
};

export default SidePanel;
