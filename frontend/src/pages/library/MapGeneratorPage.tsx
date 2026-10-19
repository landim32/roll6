import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { MapGeneratorProvider } from '../../Contexts/MapGeneratorContext';
import { useMapGenerator } from '../../hooks/useMapGenerator';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { GeneratorConversation } from '../../components/mapGenerator/GeneratorConversation';
import { SaveGeneratedMapModal } from '../../components/mapGenerator/SaveGeneratedMapModal';
import { PrintMarkupModal } from '../../components/animations/editor/PrintMarkupModal';
import type { MarkupResult } from '../../components/animations/editor/PrintMarkupModal';
import { ImageLightbox } from '../../components/chat/ImageLightbox';
import { idParam, libraryPath, mapEditPath } from '../../lib/libraryRoutes';
import { downscaleImage } from '../../lib/downscaleImage';
import { isBusy, selectedVersion } from '../../lib/mapGeneratorState';
import type { GeneratorAttachment } from '../../lib/mapGeneratorState';
import type { Mark } from '../../lib/markup';

/** Marked versions go to the Codex at most this large. */
const MARK_MAX_SIDE = 1600;

/**
 * Biblioteca › Mapas › Gerador (095): the Codex of the user's console draws the map, the page shows every version,
 * the user marks a version in red and asks again, and saves the one on the stage as a map. `?model={id}` edits one of
 * the user's own maps (its image is version 0).
 */
export const MapGeneratorPage = () => {
  const [params] = useSearchParams();
  const mapModelId = idParam(params.get('model') ?? undefined);
  return (
    <MapGeneratorProvider key={mapModelId ?? 'new'} mapModelId={mapModelId}>
      <GeneratorBody />
    </MapGeneratorProvider>
  );
};

const GeneratorBody = () => {
  const { t } = useTranslation();
  const { state, loading, error, connected, baseModel, dirty, select, attach, replaceAttachment, markSaved } = useMapGenerator();
  const guard = useLeaveGuard(dirty);
  const [markup, setMarkup] = useState<{ original: string; version: number; existing: GeneratorAttachment | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const current = selectedVersion(state);
  const busy = isBusy(state);

  if (error) {
    return (
      <section className="stm-library-form">
        <LibraryPageHeader title={t('mapGenerator.title')} />
        <div className="alert alert-warning">{t(`mapGenerator.error.${error === 'offline' ? 'offline' : error === 'forbidden' ? 'forbidden' : 'notFound'}`)}</div>
        <Link to={libraryPath('maps')} className="btn btn-secondary">{t('mapGenerator.backToMaps')}</Link>
      </section>
    );
  }

  const markDone = async (result: MarkupResult) => {
    if (!markup) return;
    const marked = await downscaleImage(result.marked, MARK_MAX_SIDE);
    const caption = t('mapGenerator.marks.caption', { version: markup.version });
    if (markup.existing) replaceAttachment({ ...markup.existing, marked, marks: result.marks, caption });
    else attach({ version: markup.version, original: markup.original, marked, marks: result.marks, caption });
    setMarkup(null);
  };

  const title = baseModel ? t('mapGenerator.titleEdit', { name: baseModel.name }) : t('mapGenerator.title');

  return (
    <section className="stm-generator">
      <LibraryPageHeader title={title} actions={(
        <>
          <span className={`badge align-self-center ${state.agent.connected ? 'text-bg-success' : 'text-bg-secondary'}`}>
            {state.agent.connected ? t('mapGenerator.agentOn', { machine: state.agent.machine ?? '' }) : t('mapGenerator.agentOff')}
          </span>
          {baseModel && <Link to={mapEditPath(baseModel.mapModelId)} className="btn btn-outline-secondary btn-sm">{t('mapGenerator.openMap')}</Link>}
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!current || busy}
            onClick={() => current && setMarkup({ original: current.url, version: current.version, existing: null })}>
            {t('mapGenerator.mark')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!current || current.version === 0 || busy} onClick={() => setSaving(true)}>
            {t('mapGenerator.save.button')}
          </button>
        </>
      )} />
      {!connected && !loading && <div className="alert alert-secondary py-2 small">{t('mapGenerator.reconnecting')}</div>}
      {!state.agent.connected && !loading && <div className="alert alert-info py-2 small">{t('mapGenerator.agentHelp')}</div>}

      <div className="stm-generator-body">
        <div className="stm-generator-stage-column">
          <div className="stm-generator-stage">
            {loading ? (
              <span className="text-body-secondary">{t('common.loading')}</span>
            ) : current ? (
              <button type="button" className="stm-generator-image" onClick={() => setZoom(current.url)}
                title={t('mapGenerator.zoom')} aria-label={t('mapGenerator.zoom')}>
                <img src={current.url} alt={t('mapGenerator.versionLabel', { version: current.version })} />
              </button>
            ) : (
              <p className="text-body-secondary text-center m-3">{t('mapGenerator.noImage')}</p>
            )}
            {busy && <span className="stm-generator-busy badge text-bg-dark">{t('mapGenerator.generating')}</span>}
          </div>
          {state.versions.length > 0 && (
            <div className="stm-generator-versions" role="listbox" aria-label={t('mapGenerator.versions')}>
              {state.versions.map((version) => (
                <button key={version.version} type="button" role="option" aria-selected={version.version === state.selected}
                  className={`stm-generator-version${version.version === state.selected ? ' is-selected' : ''}`}
                  onClick={() => select(version.version)} title={t('mapGenerator.versionLabel', { version: version.version })}>
                  <img src={version.url} alt="" />
                  <span>{version.version === 0 ? t('mapGenerator.original') : `v${version.version}`}</span>
                  {state.savedVersion === version.version && version.version > 0 && <span className="badge text-bg-success">{t('mapGenerator.savedBadge')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <GeneratorConversation onEditAttachment={(attachment) => setMarkup({ original: attachment.original, version: attachment.version, existing: attachment })} />
      </div>

      <PrintMarkupModal original={markup?.original ?? null} initialMarks={(markup?.existing?.marks ?? []) as Mark[]}
        onDone={(result) => { void markDone(result); }} onCancel={() => setMarkup(null)} />
      <SaveGeneratedMapModal version={saving ? current : null} baseModel={baseModel} onClose={() => setSaving(false)}
        onSaved={(version) => markSaved(version)} />
      <ImageLightbox image={zoom ? { url: zoom, caption: null } : null} onClose={() => setZoom(null)} />
      {guard}
    </section>
  );
};

export default MapGeneratorPage;
