import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { parseAnimationText, suggestedType } from '../../lib/animationFormat';
import type { AnimationFile } from '../../lib/animationFormat';
import { ANIMATION_TYPE, ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';

const MAX_NAME = 100;

interface AnimationUploadFormProps {
  onUploaded: (animation: AnimationInfo) => void;
}

/** The name a file suggests: its own `name`, else the file name without `.json`. */
const nameFrom = (file: AnimationFile, fileName: string) =>
  (file.name?.trim() || fileName.replace(/\.json$/i, '')).slice(0, MAX_NAME);

/**
 * "Enviar" (059): a `.json` in the `roll6-animation` format, checked here with the server's own rules before sending
 * (`lib/animationFormat`), plus its name and type — both suggested by the file when it carries them.
 */
export const AnimationUploadForm = ({ onUploaded }: AnimationUploadFormProps) => {
  const { t } = useTranslation();
  const { upload } = useAnimation();
  const [content, setContent] = useState<AnimationFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AnimationType>(ANIMATION_TYPE.idle);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    setContent(null);
    setFileError(null);
    setError(null);
    if (!chosen) return;
    const parsed = parseAnimationText(await chosen.text());
    if ('error' in parsed) {
      setFileError(parsed.error.message);
      return;
    }
    setContent(parsed.file);
    setName(nameFrom(parsed.file, chosen.name));
    const suggested = suggestedType(parsed.file);
    if (suggested) setType(suggested as AnimationType);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content) {
      setFileError(t('animations.chooseFile'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const created = await upload({ name: name.trim(), type, content });
      toast.success(t('animations.uploaded'));
      setContent(null);
      setName('');
      setInputKey((key) => key + 1);
      onUploaded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={(event) => { void submit(event); }} noValidate>
      <div className="mb-3">
        <label className="form-label" htmlFor="animation-file">{t('animations.file')}</label>
        <input key={inputKey} id="animation-file" type="file" accept=".json,application/json"
          className={`form-control${fileError ? ' is-invalid' : ''}`} onChange={(event) => { void choose(event); }} />
        {fileError
          ? <div className="invalid-feedback d-block">{fileError}</div>
          : <div className="form-text">{t('animations.fileHelp')}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="animation-name">{t('animations.name')}</label>
        <input id="animation-name" className="form-control" value={name} maxLength={MAX_NAME} required
          onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="animation-type">{t('animations.typeLabel')}</label>
        <select id="animation-type" className="form-select" value={type}
          onChange={(event) => setType(Number(event.target.value) as AnimationType)}>
          {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
        </select>
        <div className="form-text">{t('animations.typeNote')}</div>
      </div>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={sending || !content || !name.trim()}>
        {t('animations.send')}
      </button>
    </form>
  );
};

export default AnimationUploadForm;
