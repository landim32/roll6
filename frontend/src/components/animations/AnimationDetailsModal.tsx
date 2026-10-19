import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { toRoll6Clip } from '../../lib/animationFormat';
import { restAnimation } from '../../lib/restAnimation';
import { ANIMATION_TYPE, ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';
import { Modal } from '../ui/Modal';

const MAX_NAME = 100;
const FORM_ID = 'animation-details-form';

/** The library card's picture of a new animation: the standard skeleton at rest; null when it cannot be drawn. */
const drawThumbnail = async (type: AnimationType): Promise<Blob | null> => {
  try {
    const { renderAnimationThumbnail } = await import('../library/animationThumbnail');
    return await renderAnimationThumbnail(toRoll6Clip(restAnimation(type), 'new'));
  } catch {
    return null;
  }
};

interface AnimationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The animation whose name and type change; null = "Incluir animação". */
  animation: AnimationInfo | null;
  /** Called with the created or updated animation once saved. */
  onSaved: (animation: AnimationInfo) => void;
}

/**
 * Name and type of an animation, in a window: "Incluir animação" in the library (creates it standing still in the
 * rest pose for one second, `lib/restAnimation`, and the caller opens its editor) and "Alterar" next to the name in
 * the editor's bar — the editor is the only page of an animation. A type change is refused while a token uses it in
 * the state of its old type; the server's message comes back as a toast.
 */
export const AnimationDetailsModal = ({ open, onOpenChange, animation, onSaved }: AnimationDetailsModalProps) => {
  const { t } = useTranslation();
  const { upload, update } = useAnimation();
  const [name, setName] = useState('');
  const [type, setType] = useState<AnimationType>(ANIMATION_TYPE.idle);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(animation?.name ?? '');
    setType(animation?.type ?? ANIMATION_TYPE.idle);
    setNameError(false);
  }, [open, animation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setSaving(true);
    try {
      const saved = animation
        ? await update(animation, { name: trimmed, type })
        : await upload({ name: trimmed, type, content: restAnimation(type) }, await drawThumbnail(type));
      toast.success(t(animation ? 'animations.updated' : 'animations.created'));
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!saving) onOpenChange(value); }}
      title={animation ? t('animations.editTitle') : t('animations.include')}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        </>
      )}
    >
      <form id={FORM_ID} onSubmit={(event) => { void submit(event); }} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="animation-details-name">{t('animations.name')}</label>
          <input id="animation-details-name" className={`form-control${nameError ? ' is-invalid' : ''}`} value={name}
            maxLength={MAX_NAME} required autoFocus
            onChange={(event) => { setName(event.target.value); setNameError(false); }} />
          {nameError && <div className="invalid-feedback">{t('animations.nameRequired')}</div>}
        </div>
        <div className="mb-1">
          <label className="form-label" htmlFor="animation-details-type">{t('animations.typeLabel')}</label>
          <select id="animation-details-type" className="form-select" value={type}
            onChange={(event) => setType(Number(event.target.value) as AnimationType)}>
            {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
          </select>
          <div className="form-text">{animation ? t('animations.typeNote') : t('animations.createHint')}</div>
        </div>
      </form>
    </Modal>
  );
};

export default AnimationDetailsModal;
