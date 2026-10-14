import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ModelFileState } from '../../hooks/useModelFile';
import { checkModelFile } from '../../lib/modelFile';
import { ANIMATION_STATES } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState } from '../../lib/modelAnimations';

const ModelPreview = lazy(() => import('./ModelPreview'));

interface ModelFieldProps {
  id: string;
  state: ModelFileState;
  /** Name of the token, for the preview's label. */
  name: string;
}

/**
 * The "3D" tab of the token form (055): pick a `.glb` (checked here — extension, size, glTF 2.0 header — before
 * anything is sent), see it standing and walking in a preview that says where each animation comes from, or remove the
 * saved one. The file is uploaded only when the token is saved.
 */
export const ModelField = ({ id, state, name }: ModelFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [walking, setWalking] = useState(false);
  const [sources, setSources] = useState<Record<AnimationState, AnimationSource> | null>(null);
  const [loading, setLoading] = useState(false);
  const { previewUrl, setInvalid } = state;

  // A new model to show: wait for the preview to say what it found.
  useEffect(() => {
    setSources(null);
    setWalking(false);
    setLoading(previewUrl !== null);
  }, [previewUrl]);

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
              label={t('tokens.model.previewLabel', { name: name || '—' })}
              onLoaded={(found) => { setLoading(false); setSources(found); setInvalid(false); }}
              onError={onError}
            />
          </Suspense>
        ) : (
          <div className="stm-model-stage-note small text-secondary">{t('tokens.model.none')}</div>
        )}
        {previewUrl && loading && !error && <div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}
      </div>
      {sources && (
        <ul className="list-unstyled small mt-2 mb-0">
          {ANIMATION_STATES.map((animation) => (
            <li key={animation}>{t(`tokens.model.state.${animation}`)}: {t(`tokens.model.source.${sources[animation]}`)}</li>
          ))}
        </ul>
      )}
      {isStatic && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.static')}</div>}
    </div>
  );
};

export default ModelField;
