import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SheetFileView } from './SheetFileView';
import { imageService } from '../../Services/imageService';
import { SHEET_FILE_ACCEPT, validateSheetFile } from '../../lib/sheetFile';
import { SHEET_FILE_TYPE } from '../../types/image';
import type { SheetFileType } from '../../types/image';

/** A sheet file chosen in the form (saved with the character only on "Salvar"). */
export interface SheetFileValue {
  /** Stored name ({guid}.{ext}) sent as the character's sheetFile. */
  fileName: string;
  url: string | null;
  type: SheetFileType;
  /** Name of the file on the user's computer, when it was just uploaded. */
  originalName: string | null;
}

interface SheetFileFieldProps {
  id: string;
  value: SheetFileValue | null;
  onChange: (value: SheetFileValue | null) => void;
  /** Tells the form an upload is running (saving waits for it). */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Picks a character sheet file (image or PDF) and uploads it as it is — no crop, no conversion (022). */
export const SheetFileField = ({ id, value, onChange, onUploadingChange }: SheetFileFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = validateSheetFile(file);
    if (error) {
      toast.error(t(`sheetFile.errors.${error}`));
      return;
    }
    setBusy(true);
    try {
      const uploaded = await imageService.uploadDocument(file);
      onChange({ fileName: uploaded.fileName, url: uploaded.url, type: uploaded.type, originalName: file.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      <input ref={input} id={id} type="file" accept={SHEET_FILE_ACCEPT} hidden onChange={onPick} />
      {value ? (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="badge text-bg-secondary">
            {value.type === SHEET_FILE_TYPE.pdf ? t('sheetFile.pdf') : t('sheetFile.image')}
          </span>
          <span className="text-truncate flex-grow-1">{value.originalName ?? t('sheetFile.current')}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={uploading} onClick={() => input.current?.click()}>
            {t('sheetFile.replace')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" disabled={uploading} onClick={() => onChange(null)}>
            {t('sheetFile.remove')}
          </button>
        </div>
      ) : (
        <div>
          <button type="button" className="btn btn-outline-primary" disabled={uploading} onClick={() => input.current?.click()}>
            {t('sheetFile.choose')}
          </button>
        </div>
      )}
      {uploading && (
        <div className="text-body-secondary">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          {t('sheetFile.uploading')}
        </div>
      )}
      <div className="form-text">{t('sheetFile.hint')}</div>
      {value?.url && <SheetFileView url={value.url} type={value.type} />}
    </div>
  );
};

export default SheetFileField;
