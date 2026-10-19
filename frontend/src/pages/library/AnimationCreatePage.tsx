import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { toRoll6Clip } from '../../lib/animationFormat';
import { animationEditorPath, libraryPath } from '../../lib/libraryRoutes';
import { restAnimation } from '../../lib/restAnimation';
import { ANIMATION_TYPE, ANIMATION_TYPES } from '../../types/animation';
import type { AnimationType } from '../../types/animation';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';

const MAX_NAME = 100;

/** The library card's picture of the new animation: the standard skeleton at rest; null when it cannot be drawn. */
const drawThumbnail = async (type: AnimationType): Promise<Blob | null> => {
  try {
    const { renderAnimationThumbnail } = await import('../../components/library/animationThumbnail');
    return await renderAnimationThumbnail(toRoll6Clip(restAnimation(type), 'new'));
  } catch {
    return null;
  }
};

/**
 * "Incluir animação" (091; a file upload in 090): only the name and the type. "Salvar" creates the animation standing
 * still in the rest pose for one second (`lib/restAnimation`) and opens its editor, where the user builds the motion
 * by turning bones or asking the Claude. Leaving with something typed asks first.
 */
export const AnimationCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { upload } = useAnimation();
  const [name, setName] = useState('');
  const [type, setType] = useState<AnimationType>(ANIMATION_TYPE.idle);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const guard = useLeaveGuard(!done && name.trim().length > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setSaving(true);
    try {
      const created = await upload({ name: trimmed, type, content: restAnimation(type) }, await drawThumbnail(type));
      toast.success(t('animations.created'));
      setDone(true);
      navigate(animationEditorPath(created.animationId), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader title={t('animations.include')} back={{ to: libraryPath('animations'), label: t('library.nav.animations') }} />
      <form onSubmit={(event) => { void submit(event); }} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="animation-new-name">{t('animations.name')}</label>
          <input id="animation-new-name" className={`form-control${nameError ? ' is-invalid' : ''}`} value={name}
            maxLength={MAX_NAME} required autoFocus
            onChange={(event) => { setName(event.target.value); setNameError(false); }} />
          {nameError && <div className="invalid-feedback">{t('animations.nameRequired')}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="animation-new-type">{t('animations.typeLabel')}</label>
          <select id="animation-new-type" className="form-select" value={type}
            onChange={(event) => setType(Number(event.target.value) as AnimationType)}>
            {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
          </select>
          <div className="form-text">{t('animations.createHint')}</div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {t('common.save')}
        </button>
      </form>
      {guard}
    </section>
  );
};

export default AnimationCreatePage;
