import { useTranslation } from 'react-i18next';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useTurn } from '../../hooks/useTurn';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { REALTIME_STATUS } from '../../types/realtime';

interface GridSizeFooterProps {
  onEditGrid: () => void;
}

/**
 * Footer: current turn and the real-time connection badge (only when not connected) on the left; grid size in hexes
 * (click to edit), zoom and badges on the right. The turn's record is the campaign chat (041).
 */
export const GridSizeFooter = ({ onEditGrid }: GridSizeFooterProps) => {
  const { t } = useTranslation();
  const { draft, view, isDirty, canEdit } = useMapEditor();
  const { turnNo } = useTurn();
  const { session } = useAuth();
  const { status } = useRealtime();
  const offline = !!session && status !== REALTIME_STATUS.connected;

  return (
    <footer className="stm-footer">
      {turnNo !== null && <span className="badge stm-turn-badge">{t('turn.label', { no: turnNo })}</span>}
      {offline && (
        <span className="badge stm-realtime-badge" title={t('realtime.offlineHint')}>
          {t(status === REALTIME_STATUS.reconnecting ? 'realtime.reconnecting' : 'realtime.offline')}
        </span>
      )}
      <div className="stm-footer-info">
        <button type="button" className="btn btn-link d-none d-md-inline-block" onClick={onEditGrid} disabled={!canEdit}>
          {t('grid.footer', { cols: draft.gridWidth, rows: draft.gridHeight })}
        </button>
        <span className="text-body-secondary">{t('map.zoom', { value: Math.round(view.zoom * 100) })}</span>
        {isDirty && <span className="badge text-bg-warning">{t('map.unsaved')}</span>}
        {!canEdit && <span className="badge text-bg-secondary">{t('menu.readOnly')}</span>}
      </div>
    </footer>
  );
};

export default GridSizeFooter;
