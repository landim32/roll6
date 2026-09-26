import { useTranslation } from 'react-i18next';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useTurn } from '../../hooks/useTurn';

interface GridSizeFooterProps {
  onEditGrid: () => void;
}

/** Footer: current turn on the left; grid size in hexes (click to edit), hex size, zoom and badges on the right. */
export const GridSizeFooter = ({ onEditGrid }: GridSizeFooterProps) => {
  const { t } = useTranslation();
  const { draft, hexSize, view, isDirty, canEdit } = useMapEditor();
  const { turnNo } = useTurn();

  return (
    <footer className="stm-footer">
      {turnNo !== null && <span className="badge stm-turn-badge">{t('turn.label', { no: turnNo })}</span>}
      <div className="stm-footer-info">
        <button type="button" className="btn btn-link" onClick={onEditGrid} disabled={!canEdit}>
          {t('grid.footer', { cols: draft.gridWidth, rows: draft.gridHeight })}
        </button>
        <span className="text-body-secondary">{t('grid.hexSize', { size: hexSize.toFixed(1) })}</span>
        <span className="text-body-secondary">{t('map.zoom', { value: Math.round(view.zoom * 100) })}</span>
        {isDirty && <span className="badge text-bg-warning">{t('map.unsaved')}</span>}
        {!canEdit && <span className="badge text-bg-secondary">{t('menu.readOnly')}</span>}
      </div>
    </footer>
  );
};

export default GridSizeFooter;
