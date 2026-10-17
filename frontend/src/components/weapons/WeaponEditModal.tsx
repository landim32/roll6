import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import type { WeaponInfo } from '../../types/weapon';
import { Modal } from '../ui/Modal';
import { usePickedUrl } from '../../hooks/usePickedUrl';
import { MAX_WEAPON_NAME, checkWeaponFile } from '../../lib/weaponFile';
import { WeaponStage } from './WeaponStage';

interface WeaponEditModalProps {
  weapon: WeaponInfo | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "Editar arma" (082): the name and, optionally, a new file for one of the user's weapons. The weapon keeps its id, so
 * every token holding it shows the new file (and open tables reload their pieces).
 */
export const WeaponEditModal = ({ weapon, onClose, onSaved }: WeaponEditModalProps) => {
  const { t } = useTranslation();
  const { update } = useWeapon();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const pickedUrl = usePickedUrl(file);

  useEffect(() => {
    if (!weapon) return;
    setName(weapon.name);
    setFile(null);
    setFileError(null);
    setInputKey((key) => key + 1);
  }, [weapon]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(null);
    setFileError(null);
    if (!chosen) return;
    const problem = await checkWeaponFile(chosen);
    if (problem) setFileError(t(problem));
    else setFile(chosen);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!weapon) return;
    setSaving(true);
    try {
      await update(weapon, { name: name.trim(), file });
      toast.success(t('weapons.updated'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={weapon !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={t('weapons.edit')}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="weapon-edit-form" className="btn btn-primary" disabled={saving || !name.trim()}>
            {t('common.save')}
          </button>
        </>
      )}>
      <form id="weapon-edit-form" onSubmit={(event) => { void submit(event); }}>
        <div className="mb-3">
          <WeaponStage url={pickedUrl ?? weapon?.modelFileUrl ?? null} name={name} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="weapon-edit-name">{t('weapons.name')}</label>
          <input id="weapon-edit-name" className="form-control" value={name} maxLength={MAX_WEAPON_NAME} required
            onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="mb-1">
          <label className="form-label" htmlFor="weapon-edit-file">{t('weapons.replaceFile')}</label>
          <input key={inputKey} id="weapon-edit-file" type="file" accept=".glb,model/gltf-binary"
            className={`form-control${fileError ? ' is-invalid' : ''}`} onChange={(event) => { void choose(event); }} />
          {fileError
            ? <div className="invalid-feedback d-block">{fileError}</div>
            : <div className="form-text">{t('weapons.replaceHelp')}</div>}
        </div>
      </form>
    </Modal>
  );
};

export default WeaponEditModal;
