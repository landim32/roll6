import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useMapEditor } from '../../hooks/useMapEditor';
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from '../../lib/draft';

interface GridSizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edits columns × rows of the draft (saved only with the whole map). */
export const GridSizeModal = ({ open, onOpenChange }: GridSizeModalProps) => {
  const { t } = useTranslation();
  const { draft, setGridSize } = useMapEditor();
  const [columns, setColumns] = useState(String(draft.gridWidth));
  const [rows, setRows] = useState(String(draft.gridHeight));

  useEffect(() => {
    if (open) {
      setColumns(String(draft.gridWidth));
      setRows(String(draft.gridHeight));
    }
  }, [open, draft.gridWidth, draft.gridHeight]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cols = Number(columns);
    const rws = Number(rows);
    const valid = (n: number) => Number.isInteger(n) && n >= MIN_GRID_SIZE && n <= MAX_GRID_SIZE;
    if (!valid(cols) || !valid(rws)) {
      toast.error(t('grid.range'));
      return;
    }
    setGridSize(cols, rws);
    toast.success(t('toast.gridChanged', { cols, rows: rws }));
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('grid.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</button>
          <button type="submit" form="grid-size-form" className="btn btn-primary">{t('common.confirm')}</button>
        </>
      )}
    >
      <form id="grid-size-form" className="row g-3" onSubmit={onSubmit} noValidate>
        <div className="col-6">
          <label className="form-label" htmlFor="grid-columns">{t('grid.columns')}</label>
          <input id="grid-columns" type="number" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} className="form-control"
            value={columns} onChange={(e) => setColumns(e.target.value)} />
        </div>
        <div className="col-6">
          <label className="form-label" htmlFor="grid-rows">{t('grid.rows')}</label>
          <input id="grid-rows" type="number" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} className="form-control"
            value={rows} onChange={(e) => setRows(e.target.value)} />
        </div>
        <div className="col-12 form-text">{t('grid.range')}</div>
      </form>
    </Modal>
  );
};

export default GridSizeModal;
