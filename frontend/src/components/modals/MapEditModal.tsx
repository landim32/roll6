import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { TrashIcon } from '../ui/icons';
import { MaskPreview } from './MaskPreview';
import { useAuth } from '../../hooks/useAuth';
import { useMapEditor } from '../../hooks/useMapEditor';
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from '../../lib/draft';
import { loadImageSize, readFileImageSize } from '../../lib/imageSize';
import { formatRatio, sameRatio } from '../../lib/maskImage';
import type { ImageSize } from '../../lib/maskImage';
import { ACCEPTED_IMAGE_TYPES, imageService, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { mapModelService } from '../../Services/mapModelService';
import { mapService } from '../../Services/mapService';
import type { MapInfo } from '../../types/map';
import type { MapModelInfo } from '../../types/mapModel';

/** The map to edit: a library model, or a campaign map (which also has its own name). */
export interface MapEditTarget {
  mapModelId: number;
  map: MapInfo | null;
}

interface MapEditModalProps {
  target: MapEditTarget | null;
  onClose: () => void;
  /** Called after the map is saved (the lists reload). */
  onSaved?: () => void;
}

/** A stored image of the map: file name + temporary URL. */
interface StoredImage {
  fileName: string;
  url: string | null;
}

type Kind = 'image' | 'mask' | 'background';

/**
 * "Editar mapa": name, description, grid size, scene image, 3D mask and 3D background of a map, straight from the
 * lists, without opening it on the table. The model fields are the owner's (PUT replaces the whole model); the name of
 * a campaign map is the master's.
 */
export const MapEditModal = ({ target, onClose, onSaved }: MapEditModalProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { draft, isDirty, loadMapModel } = useMapEditor();
  const userId = session?.user.userId ?? null;
  const open = target !== null;

  const [model, setModel] = useState<MapModelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<Kind | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState('');
  const [rows, setRows] = useState('');
  const [image, setImage] = useState<StoredImage | null>(null);
  const [mask, setMask] = useState<StoredImage | null>(null);
  const [background, setBackground] = useState<StoredImage | null>(null);
  /** Natural size of the image picked here; null while the model's own image is kept. */
  const [newImageSize, setNewImageSize] = useState<ImageSize | null>(null);

  useEffect(() => {
    if (!target) {
      setModel(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNewImageSize(null);
    mapModelService.getById(target.mapModelId)
      .then((loaded) => {
        if (cancelled) return;
        setModel(loaded);
        setName(target.map ? target.map.name : loaded.name);
        setDescription(loaded.description ?? '');
        setColumns(String(loaded.gridWidth));
        setRows(String(loaded.gridHeight));
        setImage(loaded.image ? { fileName: loaded.image, url: loaded.imageUrl } : null);
        setMask(loaded.maskImage ? { fileName: loaded.maskImage, url: loaded.maskImageUrl } : null);
        setBackground(loaded.backgroundImage ? { fileName: loaded.backgroundImage, url: loaded.backgroundImageUrl } : null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
        onClose();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when another map is chosen
  }, [target?.mapModelId, target?.map?.mapId]);

  const ownsModel = model !== null && model.userId === userId;
  const canRenameMap = target?.map != null && target.map.userId === userId;
  const canEditName = target?.map ? canRenameMap : ownsModel;
  const busy = saving || sending !== null;

  /**
   * Size of the area the mask covers: the image picked here (it comes back at its natural size), else the size the
   * model's image is displayed at (that is the area the 3D view lays the mask over), else its natural size.
   */
  const currentImageSize = async (): Promise<ImageSize | null> => {
    if (newImageSize) return newImageSize;
    if (model?.imageWidth && model.imageHeight) return { width: model.imageWidth, height: model.imageHeight };
    return image?.url ? loadImageSize(image.url) : null;
  };

  /** Type and size checks; returns the file (the toast is already shown otherwise). */
  const pickFile = (event: ChangeEvent<HTMLInputElement>): File | null => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return null;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('image.invalidType'));
      return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('image.tooLarge'));
      return null;
    }
    return file;
  };

  const onPick = async (kind: Kind, event: ChangeEvent<HTMLInputElement>) => {
    const file = pickFile(event);
    if (!file) return;
    const size = kind === 'background' ? null : await readFileImageSize(file);
    if (kind !== 'background' && !size) return toast.error(t('image.invalidType'));
    if (kind === 'mask') {
      const imageSize = await currentImageSize();
      if (!imageSize) return toast.error(t('raycast.maskNeedsImage'));
      if (size && !sameRatio(size, imageSize))
        return toast.error(t('raycast.maskRatio', { mask: formatRatio(size), map: formatRatio(imageSize) }));
    }
    if (kind === 'image' && size && mask?.url) {
      // The mask covers the map image: warn when the new image breaks its proportion.
      const maskSize = await loadImageSize(mask.url);
      if (maskSize && !sameRatio(maskSize, size)) toast.warning(t('raycast.maskMismatch'));
    }
    setSending(kind);
    try {
      const uploaded = await imageService.upload(file);
      const stored = { fileName: uploaded.fileName, url: uploaded.url };
      if (kind === 'image') {
        setImage(stored);
        setNewImageSize(size);
      } else if (kind === 'mask') setMask(stored);
      else setBackground(stored);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSending(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target || !model) return;
    if (!name.trim() && canEditName) return toast.error(t('save.nameRequired'));
    const cols = Number(columns);
    const rowCount = Number(rows);
    const validGrid = (value: number) => Number.isInteger(value) && value >= MIN_GRID_SIZE && value <= MAX_GRID_SIZE;
    if (ownsModel && (!validGrid(cols) || !validGrid(rowCount))) return toast.error(t('grid.range'));

    setSaving(true);
    try {
      if (ownsModel) {
        if (mask && image) {
          const [imageSize, maskSize] = await Promise.all([currentImageSize(), mask.url ? loadImageSize(mask.url) : null]);
          if (imageSize && maskSize && !sameRatio(maskSize, imageSize))
            throw new Error(t('raycast.maskRatio', { mask: formatRatio(maskSize), map: formatRatio(imageSize) }));
        }
        if (mask && !image) throw new Error(t('raycast.maskNeedsImage'));
        const replaced = newImageSize !== null;
        await mapModelService.update(model.mapModelId, {
          // The library name changes only when no campaign map is being renamed.
          name: target.map ? model.name : name.trim(),
          description: description.trim() || null,
          image: image?.fileName ?? null,
          gridWidth: cols,
          gridHeight: rowCount,
          // A new image comes back at its natural size and position; the old one keeps its layout.
          imageWidth: replaced ? newImageSize.width : model.imageWidth,
          imageHeight: replaced ? newImageSize.height : model.imageHeight,
          imageTop: replaced ? 0 : model.imageTop,
          imageLeft: replaced ? 0 : model.imageLeft,
          maskImage: mask?.fileName ?? null,
          backgroundImage: background?.fileName ?? null,
        });
      }
      if (target.map && canRenameMap && name.trim() !== target.map.name)
        await mapService.update(target.map.mapId, { name: name.trim(), status: target.map.status });

      toast.success(t('mapEdit.saved', { name: name.trim() || model.name }));

      // The map open on the table shows the new content, unless it has unsaved changes of its own.
      if (draft.mapModelId === model.mapModelId) {
        if (isDirty) toast.warning(t('realtime.mapChangedDirty'));
        else {
          const openMap = draft.mapId !== null ? await mapService.getById(draft.mapId) : null;
          await loadMapModel(model.mapModelId, openMap, { keepView: true });
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const picker = (kind: Kind, label: string, hint: string | null, current: StoredImage | null, onRemove: (() => void) | null) => (
    <div className="mb-3">
      <label className="form-label fw-semibold" htmlFor={`map-edit-${kind}`}>{label}</label>
      <input id={`map-edit-${kind}`} type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
        disabled={!ownsModel || busy} onChange={(event) => { void onPick(kind, event); }} />
      {hint && <div className="form-text">{hint}</div>}
      {current?.url ? (
        <div className="mt-2">
          {kind === 'mask'
            ? <MaskPreview url={current.url} />
            : <img className="stm-mask-preview" src={current.url} alt={label} />}
          {onRemove && ownsModel && (
            <div>
              <button type="button" className="btn btn-sm btn-outline-danger mt-2" disabled={busy} onClick={onRemove}>
                <TrashIcon size={14} /> {t('raycast.remove')}
              </button>
            </div>
          )}
        </div>
      ) : <div className="text-secondary small mt-2">{t('raycast.none')}</div>}
      {sending === kind && <div className="text-secondary small mt-2">{t('raycast.sending')}</div>}
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value && !saving) onClose(); }}
      title={t('mapEdit.title')}
      large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="map-edit-form" className="btn btn-primary"
            disabled={loading || busy || !model || (!ownsModel && !canRenameMap)}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </>
      )}
    >
      {loading || !model ? (
        <p className="text-body-secondary">{t('common.loading')}</p>
      ) : (
        <form id="map-edit-form" onSubmit={(event) => { void submit(event); }}>
          {!ownsModel && <p className="text-body-secondary">{t(canRenameMap ? 'mapEdit.onlyName' : 'mapEdit.readOnly')}</p>}
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="map-edit-name">{t('save.name')}</label>
            <input id="map-edit-name" className="form-control" value={name} maxLength={260} disabled={!canEditName || busy}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="map-edit-description">{t('save.description')}</label>
            <textarea id="map-edit-description" className="form-control" rows={2} maxLength={2000} value={description}
              disabled={!ownsModel || busy} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold" htmlFor="map-edit-columns">{t('grid.columns')}</label>
              <input id="map-edit-columns" type="number" className="form-control" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE}
                value={columns} disabled={!ownsModel || busy} onChange={(e) => setColumns(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label fw-semibold" htmlFor="map-edit-rows">{t('grid.rows')}</label>
              <input id="map-edit-rows" type="number" className="form-control" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE}
                value={rows} disabled={!ownsModel || busy} onChange={(e) => setRows(e.target.value)} />
            </div>
          </div>
          <div className="row g-4">
            <div className="col-12 col-lg-4">
              {picker('image', t('mapEdit.image'), t('mapEdit.imageHint'), image, null)}
            </div>
            <div className="col-12 col-lg-4">
              {picker('mask', t('raycast.mask'), t('raycast.maskHint'), mask, () => setMask(null))}
            </div>
            <div className="col-12 col-lg-4">
              {picker('background', t('raycast.background'), t('raycast.backgroundHint'), background, () => setBackground(null))}
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default MapEditModal;
