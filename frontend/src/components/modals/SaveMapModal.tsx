import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import type { SaveMapInfo } from '../../Contexts/MapEditorContext';

interface SaveMapModalProps {
  open: boolean;
  /** Saving someone else's map creates a copy. */
  isCopy: boolean;
  defaultName: string;
  saving: boolean;
  onSubmit: (info: SaveMapInfo) => void;
  onCancel: () => void;
}

/** Asks the name of a new map (or of the copy of someone else's map). */
export const SaveMapModal = ({ open, isCopy, defaultName, saving, onSubmit, onCancel }: SaveMapModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription('');
    }
  }, [open, defaultName]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error(t('save.nameRequired'));
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || null });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onCancel(); }}
      title={t(isCopy ? 'save.copyTitle' : 'save.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="save-map-form" className="btn btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </>
      )}
    >
      {isCopy && <p className="text-body-secondary">{t('save.copyHint')}</p>}
      <form id="save-map-form" onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="save-name">{t('save.name')}</label>
          <input id="save-name" className="form-control" value={name} maxLength={260} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="save-description">{t('save.description')}</label>
          <textarea id="save-description" className="form-control" rows={2} maxLength={2000}
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
};

export default SaveMapModal;
