import { useTranslation } from 'react-i18next';
import { SHEET_FILE_TYPE } from '../../types/image';
import type { SheetFileType } from '../../types/image';

interface SheetFileViewProps {
  /** Presigned URL of the stored file. */
  url: string;
  type: SheetFileType;
}

/** Shows a character sheet file (022): images in place, PDFs in the browser's own viewer (new tab). */
export const SheetFileView = ({ url, type }: SheetFileViewProps) => {
  const { t } = useTranslation();

  if (type === SHEET_FILE_TYPE.pdf) {
    return (
      <a className="btn btn-outline-primary" href={url} target="_blank" rel="noopener noreferrer">
        {t('sheetFile.openPdf')}
      </a>
    );
  }
  return (
    <div className="d-flex flex-column gap-2">
      <img src={url} alt={t('sheetFile.imageAlt')} className="img-fluid border rounded" />
      <a href={url} target="_blank" rel="noopener noreferrer">{t('sheetFile.openFullSize')}</a>
    </div>
  );
};

export default SheetFileView;
