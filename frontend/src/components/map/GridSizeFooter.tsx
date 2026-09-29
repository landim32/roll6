import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TurnLogModal } from '../modals/TurnLogModal';
import { TurnConsole } from './TurnConsole';
import { ChevronDownIcon, ChevronUpIcon } from '../ui/icons';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useTurn } from '../../hooks/useTurn';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { REALTIME_STATUS } from '../../types/realtime';

interface GridSizeFooterProps {
  onEditGrid: () => void;
}

const CONSOLE_KEY = 'roll6:console-open';

const readConsoleOpen = () => {
  try {
    return localStorage.getItem(CONSOLE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Footer: current turn and the real-time connection badge (only when not connected) on the left; the turn console
 * toggle in the middle (028); grid size in hexes (click to edit), zoom and badges on the right.
 */
export const GridSizeFooter = ({ onEditGrid }: GridSizeFooterProps) => {
  const { t } = useTranslation();
  const { draft, view, isDirty, canEdit } = useMapEditor();
  const { turnNo } = useTurn();
  const { session } = useAuth();
  const { status } = useRealtime();
  const offline = !!session && status !== REALTIME_STATUS.connected;
  const [logOpen, setLogOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(readConsoleOpen);
  const toggleConsole = () => {
    setConsoleOpen((open) => {
      try {
        localStorage.setItem(CONSOLE_KEY, String(!open));
      } catch { /* per-browser convenience only */ }
      return !open;
    });
  };

  return (
    <footer className="stm-footer">
      {turnNo !== null && (
        <button type="button" className="badge stm-turn-badge" title={t('turnLog.open')} onClick={() => setLogOpen(true)}>
          {t('turn.label', { no: turnNo })}
        </button>
      )}
      {offline && (
        <span className="badge stm-realtime-badge" title={t('realtime.offlineHint')}>
          {t(status === REALTIME_STATUS.reconnecting ? 'realtime.reconnecting' : 'realtime.offline')}
        </span>
      )}
      {turnNo !== null && (
        <button type="button" className="btn btn-sm stm-console-toggle" aria-expanded={consoleOpen}
          title={t(consoleOpen ? 'turnConsole.close' : 'turnConsole.open')}
          aria-label={t(consoleOpen ? 'turnConsole.close' : 'turnConsole.open')} onClick={toggleConsole}>
          {consoleOpen ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
        </button>
      )}
      <div className="stm-footer-info">
        <button type="button" className="btn btn-link d-none d-md-inline-block" onClick={onEditGrid} disabled={!canEdit}>
          {t('grid.footer', { cols: draft.gridWidth, rows: draft.gridHeight })}
        </button>
        <span className="text-body-secondary">{t('map.zoom', { value: Math.round(view.zoom * 100) })}</span>
        {isDirty && <span className="badge text-bg-warning">{t('map.unsaved')}</span>}
        {!canEdit && <span className="badge text-bg-secondary">{t('menu.readOnly')}</span>}
      </div>
      <TurnLogModal open={logOpen} onOpenChange={setLogOpen} />
      {turnNo !== null && consoleOpen && <TurnConsole />}
    </footer>
  );
};

export default GridSizeFooter;
