import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { imageService } from '../../Services/imageService';
import { mapModelService } from '../../Services/mapModelService';
import { clampSide, displaySize, suggestGrid } from '../../lib/generatedMapGrid';
import { imageSizeOf } from '../../lib/downscaleImage';
import { mapEditPath } from '../../lib/libraryRoutes';
import type { GeneratorVersion } from '../../lib/mapGeneratorState';
import type { MapModelInfo } from '../../types/mapModel';

interface SaveGeneratedMapModalProps {
  /** The version to save; null = closed. */
  version: GeneratorVersion | null;
  /** The edited map (own map) of an edit session, or null for a new map. */
  baseModel: MapModelInfo | null;
  onClose: () => void;
  onSaved: (version: number, model: MapModelInfo) => void;
}

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const fileOf = (version: GeneratorVersion): File => {
  const bytes = Uint8Array.from(atob(version.base64), (c) => c.charCodeAt(0));
  return new File([bytes], `mapa-gerado-v${version.version}.${EXTENSIONS[version.mediaType] ?? 'png'}`, { type: version.mediaType });
};

/**
 * "Salvar" of the generator (095): name and grid (columns × rows suggested by the image's proportion, Q2 = B) for a new
 * map; in an edit session the user chooses (Q1 = A) between replacing the image of the edited map — which changes it
 * in every campaign that uses it — and creating a new map. Existing REST only: the image upload, then the map model.
 */
export const SaveGeneratedMapModal = ({ version, baseModel, onClose, onSaved }: SaveGeneratedMapModalProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'replace' | 'new'>('new');
  const [name, setName] = useState('');
  const [gridWidth, setGridWidth] = useState(20);
  const [gridHeight, setGridHeight] = useState(20);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!version) return;
    setMode(baseModel ? 'replace' : 'new');
    setName(baseModel ? `${baseModel.name} (gerado)` : t('mapGenerator.save.defaultName'));
    void imageSizeOf(version.url).then((natural) => {
      setSize(natural);
      if (natural) {
        const grid = suggestGrid(natural.width, natural.height);
        setGridWidth(grid.gridWidth);
        setGridHeight(grid.gridHeight);
      }
    });
  }, [version, baseModel, t]);

  const replacing = mode === 'replace' && baseModel !== null;
  const canSave = !busy && !!version && (replacing || name.trim().length > 0);

  const save = async () => {
    if (!version || !canSave) return;
    setBusy(true);
    try {
      const uploaded = await imageService.upload(fileOf(version));
      const natural = size ?? { width: 1, height: 1 };
      let model: MapModelInfo;
      if (replacing && baseModel) {
        // Same map, same grid and everything else: only the picture changes, shown as wide as the grid.
        const display = displaySize(baseModel.gridWidth, baseModel.gridHeight, natural.width, natural.height);
        model = await mapModelService.update(baseModel.mapModelId, {
          name: baseModel.name,
          description: baseModel.description,
          image: uploaded.fileName,
          gridWidth: baseModel.gridWidth,
          gridHeight: baseModel.gridHeight,
          imageWidth: display.imageWidth,
          imageHeight: display.imageHeight,
          imageTop: 0,
          imageLeft: 0,
          maskImage: baseModel.maskImage,
          backgroundImage: baseModel.backgroundImage,
          wallTextureImage: baseModel.wallTextureImage,
        });
      } else {
        const display = displaySize(gridWidth, gridHeight, natural.width, natural.height);
        model = await mapModelService.create({
          name: name.trim(),
          description: null,
          image: uploaded.fileName,
          gridWidth,
          gridHeight,
          imageWidth: display.imageWidth,
          imageHeight: display.imageHeight,
          imageTop: 0,
          imageLeft: 0,
          maskImage: null,
          backgroundImage: null,
          wallTextureImage: null,
        });
      }
      toast.success(t(replacing ? 'mapGenerator.save.replaced' : 'mapGenerator.save.created', { name: model.name }));
      onSaved(version.version, model);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={version !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }} title={t('mapGenerator.save.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={() => { void save(); }} disabled={!canSave}>{t('common.save')}</button>
        </>
      )}>
      {version && <img className="stm-generator-save-preview mb-3" src={version.url} alt="" />}
      {baseModel && (
        <fieldset className="mb-3">
          <legend className="form-label fs-6">{t('mapGenerator.save.how')}</legend>
          <div className="form-check">
            <input id="gen-save-replace" className="form-check-input" type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <label className="form-check-label" htmlFor="gen-save-replace">{t('mapGenerator.save.replace', { name: baseModel.name })}</label>
            <div className="form-text">{t('mapGenerator.save.replaceHint')}</div>
          </div>
          <div className="form-check">
            <input id="gen-save-new" className="form-check-input" type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
            <label className="form-check-label" htmlFor="gen-save-new">{t('mapGenerator.save.asNew')}</label>
          </div>
        </fieldset>
      )}
      {!replacing && (
        <>
          <label htmlFor="gen-save-name" className="form-label">{t('mapGenerator.save.name')}</label>
          <input id="gen-save-name" className="form-control mb-3" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} disabled={busy} />
          <div className="row g-2">
            <div className="col">
              <label htmlFor="gen-save-cols" className="form-label">{t('mapGenerator.save.columns')}</label>
              <input id="gen-save-cols" type="number" className="form-control" value={gridWidth} min={5} max={60}
                onChange={(e) => setGridWidth(clampSide(Number(e.target.value)))} disabled={busy} />
            </div>
            <div className="col">
              <label htmlFor="gen-save-rows" className="form-label">{t('mapGenerator.save.rows')}</label>
              <input id="gen-save-rows" type="number" className="form-control" value={gridHeight} min={5} max={60}
                onChange={(e) => setGridHeight(clampSide(Number(e.target.value)))} disabled={busy} />
            </div>
          </div>
          <div className="form-text">{t('mapGenerator.save.gridHint')}</div>
        </>
      )}
      {replacing && baseModel && (
        <p className="small text-body-secondary mb-0">
          {t('mapGenerator.save.keepsGrid', { columns: baseModel.gridWidth, rows: baseModel.gridHeight })}{' '}
          <Link to={mapEditPath(baseModel.mapModelId)}>{t('mapGenerator.save.openMap')}</Link>
        </p>
      )}
    </Modal>
  );
};

export default SaveGeneratedMapModal;
