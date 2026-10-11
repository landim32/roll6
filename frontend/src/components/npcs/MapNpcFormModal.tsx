import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useNpc } from '../../hooks/useNpc';
import { fromPiece, toUpdateInfo, validateInstance } from '../../lib/npcInstanceForm';
import type { InstanceForm } from '../../lib/npcInstanceForm';
import { POSTURES } from '../../types/mapToken';
import type { MapTokenInfo } from '../../types/mapToken';

interface MapNpcFormModalProps {
  /** The piece of the instance being edited; null keeps the modal closed. */
  piece: MapTokenInfo | null;
  onClose: () => void;
}

/**
 * "Editar NPC" on an NPC piece or on its row of the NPC card (051): the instance's own name, current life/energy,
 * Deslocamento, status and posture. The library NPC and the other instances are untouched; removal is on the menu/card.
 */
export const MapNpcFormModal = ({ piece, onClose }: MapNpcFormModalProps) => {
  const { t } = useTranslation();
  const { updateInstance } = useNpc();
  const [form, setForm] = useState<InstanceForm | null>(null);
  const [busy, setBusy] = useState(false);
  const mapNpcId = piece?.mapNpcId ?? null;

  // Seed once per instance opened.
  useEffect(() => {
    setForm(piece && piece.mapNpcId !== null ? fromPiece(piece) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapNpcId]);

  const onField = (field: keyof InstanceForm, value: string) => setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!piece || mapNpcId === null || !form) return;
    const error = validateInstance(form, { totalLife: piece.totalLife, totalEnergy: piece.totalEnergy });
    if (error) return toast.error(t(`npcInstance.errors.${error}`));
    setBusy(true);
    try {
      const updated = await updateInstance(mapNpcId, toUpdateInfo(form));
      toast.success(t('toast.npcUpdated', { name: updated.name }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const id = (field: string) => `npc-instance-${field}`;

  return (
    <Modal
      open={piece !== null}
      onOpenChange={(next) => { if (!next && !busy) onClose(); }}
      title={t('npcInstance.title', { name: piece?.name ?? '' })}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="submit" form="npc-instance-form" className="btn btn-primary" disabled={busy || !form}>
            {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        </>
      )}
    >
      {form && piece && (
        <form id="npc-instance-form" onSubmit={onSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor={id('name')}>{t('npcInstance.name')}</label>
            <input id={id('name')} className="form-control" value={form.name} maxLength={260} autoFocus
              onChange={(e) => onField('name', e.target.value)} />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-4">
              <label className="form-label" htmlFor={id('life')}>{t('npcInstance.currentLife')}</label>
              <div className="input-group">
                <input id={id('life')} type="number" step={1} className="form-control" value={form.currentLife}
                  onChange={(e) => onField('currentLife', e.target.value)} />
                <span className="input-group-text">/ {piece.totalLife}</span>
              </div>
            </div>
            <div className="col-4">
              <label className="form-label" htmlFor={id('energy')}>{t('npcInstance.currentEnergy')}</label>
              <div className="input-group">
                <input id={id('energy')} type="number" step={1} className="form-control" value={form.currentEnergy}
                  onChange={(e) => onField('currentEnergy', e.target.value)} />
                <span className="input-group-text">/ {piece.totalEnergy}</span>
              </div>
            </div>
            <div className="col-4">
              <label className="form-label" htmlFor={id('move')}>{t('npcInstance.move')}</label>
              <input id={id('move')} type="number" min={0} step={1} className="form-control" value={form.currentMove}
                onChange={(e) => onField('currentMove', e.target.value)} />
            </div>
          </div>
          <div className="form-text mb-3">{t('npcInstance.moveHint')}</div>
          <div className="row g-2">
            <div className="col-8">
              <label className="form-label" htmlFor={id('status')}>{t('npcInstance.status')}</label>
              <input id={id('status')} className="form-control" value={form.status} maxLength={260}
                onChange={(e) => onField('status', e.target.value)} />
            </div>
            <div className="col-4">
              <label className="form-label" htmlFor={id('posture')}>{t('npcInstance.posture')}</label>
              <select id={id('posture')} className="form-select" value={form.posture} onChange={(e) => onField('posture', e.target.value)}>
                {POSTURES.map((value) => <option key={value} value={String(value)}>{t(`posture.${value}`)}</option>)}
              </select>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default MapNpcFormModal;
