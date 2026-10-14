import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ModelFileState } from '../../hooks/useModelFile';
import { checkModelFile } from '../../lib/modelFile';
import { ANIMATION_STATES, clipChoiceFromValue, clipChoiceOptions } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState, ClipOption } from '../../lib/modelAnimations';
import { ModelTimeline } from './ModelTimeline';
import { CameraIcon } from '../ui/icons';
import type { ModelPreviewHandle, ModelPreviewInfo } from './ModelPreview';

const ModelPreview = lazy(() => import('./ModelPreview'));

/** "Gerar imagem" (057): the sizes of the two token images and where a photo goes. */
export interface ModelFieldGenerate {
  upSize: { width: number; height: number };
  downSize: { width: number; height: number };
  onGenerated: (kind: 'up' | 'down', blob: Blob) => void;
}

interface ModelFieldProps {
  id: string;
  state: ModelFileState;
  /** Name of the token, for the preview's label. */
  name: string;
  /** Only in forms that save the token: the paused pose can become the standing or the lying image. */
  generate?: ModelFieldGenerate;
}

/**
 * The "3D" tab of the token form (055): pick a `.glb` (checked here — extension, size, glTF 2.0 header — before
 * anything is sent), see it standing, walking and down (058) in a preview, choose which animation plays in each state (056: a clip
 * of the file, Roll6's own, none, or the automatic rule) and see that choice at once in the same preview, or remove
 * the saved model. The file is uploaded only when the token is saved.
 */
export const ModelField = ({ id, state, name, generate }: ModelFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  /** The state the preview shows (058: Parado, Caminhando or Caído). */
  const [shown, setShown] = useState<AnimationState>('idle');
  const [info, setInfo] = useState<ModelPreviewInfo | null>(null);
  const [sources, setSources] = useState<Record<AnimationState, AnimationSource> | null>(null);
  const [loading, setLoading] = useState(false);
  const [reduced, setReduced] = useState(false);
  /** A chosen guard or death plays in full and stretches this model (058, Q1 = A). */
  const [deforms, setDeforms] = useState(false);
  /** The preview shows a still pose (paused, or a state without animation) — 057. */
  const [still, setStill] = useState(false);
  const previewRef = useRef<ModelPreviewHandle>(null);
  const { previewUrl, clips, setClip, setInvalid } = state;

  // A new model to show: wait for the preview to say what it found.
  useEffect(() => {
    setInfo(null);
    setSources(null);
    setReduced(false);
    setDeforms(false);
    setShown('idle');
    setLoading(previewUrl !== null);
  }, [previewUrl]);

  const options = useMemo(
    () => (info
      ? Object.fromEntries(ANIMATION_STATES.map((animation) => [animation, clipChoiceOptions(info.clipNames, info.boneNames, animation)])) as
        Record<AnimationState, ClipOption[]>
      : null),
    [info],
  );

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const check = await checkModelFile(file);
    if (check !== 'ok') {
      const message = t(`tokens.model.${check}`);
      setError(message);
      toast.error(message);
      return;
    }
    setError(null);
    state.pick(file);
  };

  const onError = () => {
    setLoading(false);
    setInvalid(true);
    setError(t('tokens.model.invalid'));
  };

  /** How a source reads for a state: Roll6's own is the death and nothing is "lying" for the down state (058). */
  const sourceLabel = (source: AnimationSource, animation: AnimationState): string => {
    if (animation === 'down' && source === 'roll6') return t('tokens.model.source.death');
    if (animation === 'down' && source === 'static') return t('tokens.model.source.lying');
    return t(`tokens.model.source.${source}`);
  };

  const optionLabel = (option: ClipOption, animation: AnimationState): string => {
    switch (option.kind) {
      case 'file': return t('tokens.model.choice.file', { name: option.name });
      case 'roll6': return t(animation === 'down' ? 'tokens.model.choice.death' : 'tokens.model.choice.roll6');
      case 'guard': return t('tokens.model.choice.guard');
      case 'none': return t('tokens.model.choice.none');
      default: {
        const resolved = option.resolves === 'file' && option.resolvesName
          ? t('tokens.model.choice.file', { name: option.resolvesName })
          : sourceLabel(option.resolves ?? 'static', animation);
        return t('tokens.model.choice.auto', { resolved });
      }
    }
  };

  const isStatic = sources !== null && sources.idle === 'static' && sources.walk === 'static';

  /** Photographs the paused pose for one of the token's images (057, FR-010…FR-014). */
  const shoot = async (kind: 'up' | 'down') => {
    if (!generate) return;
    try {
      const blob = await previewRef.current!.capture(kind === 'up' ? generate.upSize : generate.downSize);
      generate.onGenerated(kind, blob);
      toast.success(t(kind === 'up' ? 'tokens.model.generate.doneUp' : 'tokens.model.generate.doneDown'));
    } catch {
      toast.error(t('tokens.model.generate.failed'));
    }
  };
  const canShoot = !!generate && !!previewUrl && !loading && !error && still;

  return (
    <div className="stm-model-field">
      <div className="form-text mb-2">{t('tokens.model.help')}</div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <input ref={input} id={id} type="file" accept=".glb,model/gltf-binary" className="d-none" onChange={(e) => { void onFile(e); }} />
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => input.current?.click()}>
          {t(previewUrl ? 'tokens.model.change' : 'tokens.model.pick')}
        </button>
        {previewUrl && (
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { setError(null); state.remove(); }}>
            {t('tokens.model.remove')}
          </button>
        )}
        {previewUrl && sources && (
          <div className="btn-group btn-group-sm" role="group" aria-label={t('tokens.model.showState')}>
            {ANIMATION_STATES.map((animation) => (
              <button
                key={animation}
                type="button"
                className={`btn btn-outline-secondary${shown === animation ? ' active' : ''}`}
                aria-pressed={shown === animation}
                // Walking without a walk would only stand still; down without a death still lies (058).
                disabled={animation === 'walk' && sources.walk === 'static'}
                onClick={() => setShown(animation)}
              >
                {t(`tokens.model.state.${animation}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      {state.picked && <div className="small text-secondary mb-2 text-truncate">{state.picked.name}</div>}
      {error && <div className="invalid-feedback d-block mb-2">{error}</div>}
      <div className="stm-model-stage">
        {previewUrl ? (
          <Suspense fallback={<div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}>
            <ModelPreview
              ref={previewRef}
              url={previewUrl}
              shown={shown}
              clips={clips}
              label={t('tokens.model.previewLabel', { name: name || '—' })}
              onLoaded={(found) => { setLoading(false); setInfo(found); setInvalid(false); }}
              onClips={(found, limited, stretched) => { setSources(found); setReduced(limited); setDeforms(stretched); }}
              onError={onError}
            />
          </Suspense>
        ) : (
          <div className="stm-model-stage-note small text-secondary">{t('tokens.model.none')}</div>
        )}
        {previewUrl && loading && !error && <div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}
      </div>
      {previewUrl && (
        <ModelTimeline
          preview={previewRef}
          disabled={loading || !!error}
          resetKey={`${previewUrl}|${shown}|${clips.idle ?? ''}|${clips.walk ?? ''}|${clips.down ?? ''}`}
          onStillChange={setStill}
        />
      )}
      {generate && previewUrl && (
        <div className="stm-model-generate">
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild disabled={!canShoot}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm dropdown-toggle d-inline-flex align-items-center gap-2"
                disabled={!canShoot}
                title={canShoot ? undefined : t('tokens.model.generate.pauseFirst')}
              >
                <CameraIcon size={14} /> {t('tokens.model.generate.button')}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="dropdown-menu show" align="center" sideOffset={4}>
              <DropdownMenu.Item className="dropdown-item" onSelect={() => { void shoot('up'); }}>
                {t('tokens.model.generate.up')}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="dropdown-item" onSelect={() => { void shoot('down'); }}>
                {t('tokens.model.generate.down')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      )}
      {previewUrl && options && (
        <fieldset className="mt-3">
          <legend className="form-label small fw-semibold mb-1">{t('tokens.model.animations')}</legend>
          <div className="form-text mb-2">{t('tokens.model.animationsHelp')}</div>
          <div className="row g-2">
            {ANIMATION_STATES.map((animation) => (
              <div className="col-12 col-sm-4" key={animation}>
                <label htmlFor={`${id}-clip-${animation}`} className="form-label small mb-1">{t(`tokens.model.state.${animation}`)}</label>
                <select
                  id={`${id}-clip-${animation}`}
                  className="form-select form-select-sm"
                  value={clips[animation] ?? ''}
                  onChange={(e) => { setClip(animation, clipChoiceFromValue(e.target.value)); setShown(animation); }}
                >
                  {options[animation].map((option) => (
                    <option key={option.value} value={option.value}>{optionLabel(option, animation)}</option>
                  ))}
                </select>
                {sources && (
                  <div className="form-text">{t('tokens.model.playing', { source: sourceLabel(sources[animation], animation) })}</div>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      )}
      {isStatic && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.static')}</div>}
      {reduced && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.reduced')}</div>}
      {deforms && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.deforms')}</div>}
    </div>
  );
};

export default ModelField;
