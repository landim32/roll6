import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { PagedListView } from '../ui/PagedListView';
import { useMapEditor } from '../../hooks/useMapEditor';
import { readFileImageSize } from '../../lib/imageSize';
import { formatRatio, sameRatio } from '../../lib/maskImage';
import { ThreeDImagesTab } from './ThreeDImagesTab';
import { ACCEPTED_IMAGE_TYPES, imageService, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { mapModelService } from '../../Services/mapModelService';
import type { PagedList } from '../../types/common';
import type { MapModelInfo } from '../../types/mapModel';

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 10;

/**
 * Scene image: upload a new file or reuse the image of a library map, and (034) the 3D mask and background of the 3D
 * view. Changes only the draft.
 */
export const ImageModal = ({ open, onOpenChange }: ImageModalProps) => {
  const { t } = useTranslation();
  const { setImage, setMaskImage, canEdit } = useMapEditor();
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [models, setModels] = useState<PagedList<MapModelInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      setModels(await mapModelService.list({ page, pageSize: PAGE_SIZE, search }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    if (open && tab === 'library') load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [open, tab]);

  /** Type and size checks of a picked file (the toast is already shown when it is not valid). */
  const validFile = (picked: File): boolean => {
    if (!ACCEPTED_IMAGE_TYPES.includes(picked.type)) {
      toast.error(t('image.invalidType'));
      return false;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error(t('image.tooLarge'));
      return false;
    }
    return true;
  };

  const onUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return toast.error(t('image.noFile'));
    if (!validFile(file)) return;
    // The new image and the new 3D mask (034) go together: the mask must have the proportion of the new image.
    if (maskFile) {
      if (!validFile(maskFile)) return;
      const [imageSize, maskSize] = await Promise.all([readFileImageSize(file), readFileImageSize(maskFile)]);
      if (!imageSize || !maskSize) return toast.error(t('image.invalidType'));
      if (!sameRatio(maskSize, imageSize))
        return toast.error(t('raycast.maskRatio', { mask: formatRatio(maskSize), map: formatRatio(imageSize) }));
    }
    setUploading(true);
    try {
      const uploaded = await imageService.upload(file);
      await setImage(uploaded.fileName, uploaded.url);
      if (maskFile) {
        const mask = await imageService.upload(maskFile);
        setMaskImage(mask.fileName, mask.url);
      }
      toast.success(t('toast.imageUploaded'));
      setFile(null);
      setMaskFile(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setUploading(false);
    }
  };

  const reuse = async (model: MapModelInfo) => {
    if (!model.image) return toast.info(t('image.noImage'));
    await setImage(model.image, model.imageUrl);
    toast.success(t('toast.imageReused', { name: model.name }));
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('image.title')} large>
      <Tabs
        tabs={[
          { key: 'upload', label: t('image.uploadTab') },
          { key: 'library', label: t('image.libraryTab') },
          ...(canEdit ? [{ key: 'threeD', label: t('raycast.tab') }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'threeD' ? (
        <ThreeDImagesTab />
      ) : tab === 'upload' ? (
        <form onSubmit={onUpload}>
          <div className="mb-3">
            <label className="form-label" htmlFor="image-file">{t('image.file')}</label>
            <input id="image-file" type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {canEdit && (
            <div className="mb-3">
              <label className="form-label" htmlFor="image-mask-file">{t('image.maskFile')}</label>
              <input id="image-mask-file" type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={(e) => setMaskFile(e.target.files?.[0] ?? null)} />
              <div className="form-text">{t('image.maskHint')}</div>
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
            {uploading ? t('common.loading') : t('image.upload')}
          </button>
        </form>
      ) : (
        <>
          <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); load(1); }}>
            <input className="form-control" placeholder={t('mapModal.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
          </form>
          <PagedListView
            data={models}
            loading={loading}
            renderItem={(m) => (
              <div className="d-flex align-items-center gap-3">
                {m.imageUrl ? <img className="stm-thumb" src={m.imageUrl} alt="" /> : <div className="stm-thumb" />}
                <div className="fw-semibold">{m.name}</div>
              </div>
            )}
            getKey={(m) => m.mapModelId}
            onSelect={reuse}
            onPageChange={load}
          />
        </>
      )}
    </Modal>
  );
};

export default ImageModal;
