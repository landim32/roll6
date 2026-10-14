import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';
import { Modal } from '../ui/Modal';

interface AnimationEditModalProps {
  animation: AnimationInfo | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "Editar animação" (059): name and type of one of the user's animations. The file never changes. A type change is
 * refused while a token uses it in the state of its old type — the server's message comes back as a toast.
 */
export const AnimationEditModal = ({ animation, onClose, onSaved }: AnimationEditModalProps) => {
  const { t } = useTranslation();
  const { update } = useAnimation();
  const [name, setName] = useState('');
  const [type, setType] = useState<AnimationType>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!animation) return;
    setName(animation.name);
    setType(animation.type);
  }, [animation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!animation) return;
    setSaving(true);
    try {
      await update(animation, { name: name.trim(), type });
      toast.success(t('animations.updated'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={animation !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={t('animations.edit')}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="animation-edit-form" className="btn btn-primary" disabled={saving || !name.trim()}>
            {t('common.save')}
          </button>
        </>
      )}>
      <form id="animation-edit-form" onSubmit={(event) => { void submit(event); }}>
        <div className="mb-3">
          <label className="form-label" htmlFor="animation-edit-name">{t('animations.name')}</label>
          <input id="animation-edit-name" className="form-control" value={name} maxLength={100} required
            onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="mb-1">
          <label className="form-label" htmlFor="animation-edit-type">{t('animations.typeLabel')}</label>
          <select id="animation-edit-type" className="form-select" value={type}
            onChange={(event) => setType(Number(event.target.value) as AnimationType)}>
            {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
          </select>
          <div className="form-text">{t('animations.typeNote')}</div>
        </div>
      </form>
    </Modal>
  );
};

export default AnimationEditModal;
