import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useAnimation } from '../../hooks/useAnimation';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { animationService } from '../../Services/animationService';
import { idParam, libraryPath } from '../../lib/libraryRoutes';
import { ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';
import { BoxArrowUpRightIcon } from '../../components/ui/icons';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';

/**
 * An animation in full screen (087; was "Editar animação" of 059): name and type of one of the user's animations, and
 * "Editar no editor" (the animation editor in a new tab). A type change is refused while a token uses it in the state of
 * its old type — the server's message comes back as a toast.
 */
export const AnimationEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const animationId = idParam(id);
  const { session } = useAuth();
  const { update } = useAnimation();
  const [animation, setAnimation] = useState<AnimationInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound'>('loading');
  const [name, setName] = useState('');
  const [type, setType] = useState<AnimationType>(1);
  const [saving, setSaving] = useState(false);
  const owner = animation !== null && animation.userId === session?.user.userId;
  const guard = useLeaveGuard(owner && animation !== null && (name.trim() !== animation.name || type !== animation.type) && !saving);

  useEffect(() => {
    if (animationId === null) {
      setState('notFound');
      return;
    }
    let cancelled = false;
    setState('loading');
    animationService.get(animationId)
      .then((loaded) => {
        if (cancelled) return;
        setAnimation(loaded);
        setName(loaded.name);
        setType(loaded.type);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('notFound'); });
    return () => { cancelled = true; };
  }, [animationId]);

  if (state === 'notFound') return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('animations')} />;
  if (state === 'loading' || !animation) return <p className="text-body-secondary">{t('common.loading')}</p>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!owner) return;
    setSaving(true);
    try {
      const saved = await update(animation, { name: name.trim(), type });
      setAnimation(saved);
      setName(saved.name);
      setType(saved.type);
      toast.success(t('animations.updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader
        title={animation.name}
        back={{ to: libraryPath('animations'), label: t('library.nav.animations') }}
        actions={owner ? (
          <>
            <a className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1" href={`/animation/${animation.animationId}`}
              target="_blank" rel="noopener">
              <BoxArrowUpRightIcon size={14} />{t('animations.openEditor')}
            </a>
            <button type="submit" form="animation-page-form" className="btn btn-primary btn-sm" disabled={saving || !name.trim()}>
              {t('common.save')}
            </button>
          </>
        ) : <span className="badge text-bg-secondary">{t('library.readOnly')}</span>}
      />
      <form id="animation-page-form" onSubmit={(event) => { void submit(event); }}>
        <div className="mb-3">
          <label className="form-label" htmlFor="animation-page-name">{t('animations.name')}</label>
          <input id="animation-page-name" className="form-control" value={name} maxLength={100} required disabled={!owner}
            onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="mb-1">
          <label className="form-label" htmlFor="animation-page-type">{t('animations.typeLabel')}</label>
          <select id="animation-page-type" className="form-select" value={type} disabled={!owner}
            onChange={(event) => setType(Number(event.target.value) as AnimationType)}>
            {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
          </select>
          <div className="form-text">{t('animations.typeNote')}</div>
        </div>
      </form>
      {guard}
    </section>
  );
};

export default AnimationEditPage;
