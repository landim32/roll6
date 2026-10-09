import { useEffect, useState } from 'react';
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
  /** A fixed column beside the chat (desktop, chat only): always open, no collapse button. */
  docked?: boolean;
}

const readCollapsed = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/** Phones fit only one panel: opening one collapses the other (Bootstrap's `md` breakpoint). */
const PHONE_QUERY = '(max-width: 767.98px)';
const isPhone = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
const EXPANDED_EVENT = 'roll6:side-panel-expanded';

/**
 * Fixed, compact panel over the map, below the menu, on the left (party) or right (NPCs): header with the
 * title and a collapse button, a scrolling list and an optional footer. Collapsed, it becomes a narrow
 * vertical tab; the choice is remembered in this browser. On phones only one panel is open at a time and the
 * right one starts collapsed.
 */
export const SidePanel = ({ side, title, storageKey, collapseLabel, expandLabel, children, footer, docked = false }: SidePanelProps) => {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey) || (side === 'right' && isPhone()));
  const sideClass = side === 'right' ? ' stm-side-right' : '';

  // Another panel was opened on a phone: this one steps aside (without changing the remembered choice).
  useEffect(() => {
    const onExpanded = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== side && isPhone()) setCollapsed(true);
    };
    window.addEventListener(EXPANDED_EVENT, onExpanded);
    return () => window.removeEventListener(EXPANDED_EVENT, onExpanded);
  }, [side]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      // Not remembered when storage is blocked.
    }
    if (!next) window.dispatchEvent(new CustomEvent(EXPANDED_EVENT, { detail: side }));
  };

  if (collapsed && !docked) {
    return (
      <button type="button" className={`stm-party stm-party-collapsed${sideClass}`} onClick={toggle} aria-label={expandLabel} title={expandLabel}>
        <span>{title}</span>
      </button>
    );
  }

  return (
    <section className={`stm-party${sideClass}${docked ? ' stm-party-docked' : ''}`} aria-label={title}>
      <header>
        <span>{title}</span>
        {!docked && <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={toggle} aria-label={collapseLabel} title={collapseLabel}>
          {side === 'right' ? '›' : '‹'}
        </button>}
      </header>
      <ul>{children}</ul>
      {footer && <footer className="stm-party-footer">{footer}</footer>}
    </section>
  );
};

export default SidePanel;
