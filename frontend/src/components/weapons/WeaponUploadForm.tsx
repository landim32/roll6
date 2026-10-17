import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import { usePickedUrl } from '../../hooks/usePickedUrl';
import { MAX_WEAPON_NAME, checkWeaponFile, weaponNameFrom } from '../../lib/weaponFile';
import type { WeaponInfo } from '../../types/weapon';
import { WeaponStage } from './WeaponStage';

interface WeaponUploadFormProps {
  onUploaded: (weapon: WeaponInfo) => void;
}

/**
 * "Enviar" (082): a `.glb` (checked here like the token models before it leaves the device), previewed at once, and
 * its name — suggested by the file name. The file goes through `POST /api/model`, then the weapon is created.
 */
export const WeaponUploadForm = ({ onUploaded }: WeaponUploadFormProps) => {
  const { t } = useTranslation();
  const { upload } = useWeapon();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const url = usePickedUrl(file);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(null);
    setFileError(null);
    setError(null);
    if (!chosen) return;
    const problem = await checkWeaponFile(chosen);
    if (problem) {
      setFileError(t(problem));
      return;
    }
    setFile(chosen);
    if (!name.trim()) setName(weaponNameFrom(chosen.name));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setFileError(t('weapons.chooseFile'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const created = await upload(name.trim(), file);
      toast.success(t('weapons.uploaded'));
      setFile(null);
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
        <label className="form-label" htmlFor="weapon-file">{t('weapons.file')}</label>
        <input key={inputKey} id="weapon-file" type="file" accept=".glb,model/gltf-binary"
          className={`form-control${fileError ? ' is-invalid' : ''}`} onChange={(event) => { void choose(event); }} />
        {fileError
          ? <div className="invalid-feedback d-block">{fileError}</div>
          : <div className="form-text">{t('weapons.fileHelp')}</div>}
      </div>
      {url && <div className="mb-3"><WeaponStage url={url} name={name} /></div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="weapon-name">{t('weapons.name')}</label>
        <input id="weapon-name" className="form-control" value={name} maxLength={MAX_WEAPON_NAME} required
          onChange={(event) => setName(event.target.value)} />
      </div>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={sending || !file || !name.trim()}>
        {sending ? t('weapons.sending') : t('weapons.send')}
      </button>
    </form>
  );
};

export default WeaponUploadForm;
