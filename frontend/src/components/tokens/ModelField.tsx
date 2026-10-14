import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ModelFileState } from '../../hooks/useModelFile';
import { checkModelFile } from '../../lib/modelFile';
import { ANIMATION_STATES, clipChoiceFromValue, clipChoiceOptions } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState, ClipOption } from '../../lib/modelAnimations';
import type { ModelPreviewInfo } from './ModelPreview';

const ModelPreview = lazy(() => import('./ModelPreview'));

interface ModelFieldProps {
  id: string;
  state: ModelFileState;
  /** Name of the token, for the preview's label. */
  name: string;
}

/**
 * The "3D" tab of the token form (055): pick a `.glb` (checked here — extension, size, glTF 2.0 header — before
 * anything is sent), see it standing and walking in a preview, choose which animation plays in each state (056: a clip
 * of the file, Roll6's own, none, or the automatic rule) and see that choice at once in the same preview, or remove
 * the saved model. The file is uploaded only when the token is saved.
 */
export const ModelField = ({ id, state, name }: ModelFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [walking, setWalking] = useState(false);
  const [info, setInfo] = useState<ModelPreviewInfo | null>(null);
  const [sources, setSources] = useState<Record<AnimationState, AnimationSource> | null>(null);
  const [loading, setLoading] = useState(false);
  const [reduced, setReduced] = useState(false);
  const { previewUrl, clips, setClip, setInvalid } = state;

  // A new model to show: wait for the preview to say what it found.
  useEffect(() => {
    setInfo(null);
    setSources(null);
    setReduced(false);
    setWalking(false);
    setLoading(previewUrl !== null);
  }, [previewUrl]);

  const options = useMemo(
    () => (info ? { idle: clipChoiceOptions(info.clipNames, info.boneNames, 'idle'), walk: clipChoiceOptions(info.clipNames, info.boneNames, 'walk') } : null),
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

  const optionLabel = (option: ClipOption): string => {
    switch (option.kind) {
      case 'file': return t('tokens.model.choice.file', { name: option.name });
      case 'roll6': return t('tokens.model.choice.roll6');
      case 'none': return t('tokens.model.choice.none');
      default: {
        const resolved = option.resolves === 'file' && option.resolvesName
          ? t('tokens.model.choice.file', { name: option.resolvesName })
          : t(`tokens.model.source.${option.resolves ?? 'static'}`);
        return t('tokens.model.choice.auto', { resolved });
      }
    }
  };

  const isStatic = sources !== null && sources.idle === 'static' && sources.walk === 'static';

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
        {previewUrl && sources && (sources.walk !== 'static') && (
          <button type="button" className="btn btn-outline-secondary btn-sm" aria-pressed={walking} onClick={() => setWalking((prev) => !prev)}>
            {t(walking ? 'tokens.model.stop' : 'tokens.model.walk')}
          </button>
        )}
      </div>
      {state.picked && <div className="small text-secondary mb-2 text-truncate">{state.picked.name}</div>}
      {error && <div className="invalid-feedback d-block mb-2">{error}</div>}
      <div className="stm-model-stage">
        {previewUrl ? (
          <Suspense fallback={<div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}>
            <ModelPreview
              url={previewUrl}
              walking={walking}
              clips={clips}
              label={t('tokens.model.previewLabel', { name: name || '—' })}
              onLoaded={(found) => { setLoading(false); setInfo(found); setInvalid(false); }}
              onClips={(found, limited) => { setSources(found); setReduced(limited); }}
              onError={onError}
            />
          </Suspense>
        ) : (
          <div className="stm-model-stage-note small text-secondary">{t('tokens.model.none')}</div>
        )}
        {previewUrl && loading && !error && <div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}
      </div>
      {previewUrl && options && (
        <fieldset className="mt-3">
          <legend className="form-label small fw-semibold mb-1">{t('tokens.model.animations')}</legend>
          <div className="form-text mb-2">{t('tokens.model.animationsHelp')}</div>
          <div className="row g-2">
            {ANIMATION_STATES.map((animation) => (
              <div className="col-12 col-sm-6" key={animation}>
                <label htmlFor={`${id}-clip-${animation}`} className="form-label small mb-1">{t(`tokens.model.state.${animation}`)}</label>
                <select
                  id={`${id}-clip-${animation}`}
                  className="form-select form-select-sm"
                  value={clips[animation] ?? ''}
                  onChange={(e) => { setClip(animation, clipChoiceFromValue(e.target.value)); if (animation === 'walk') setWalking(true); else setWalking(false); }}
                >
                  {options[animation].map((option) => (
                    <option key={option.value} value={option.value}>{optionLabel(option)}</option>
                  ))}
                </select>
                {sources && (
                  <div className="form-text">{t('tokens.model.playing', { source: t(`tokens.model.source.${sources[animation]}`) })}</div>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      )}
      {isStatic && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.static')}</div>}
      {reduced && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.reduced')}</div>}
    </div>
  );
};

export default ModelField;
