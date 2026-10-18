import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { usePickedUrl } from '../../hooks/usePickedUrl';
import { useWeapon } from '../../hooks/useWeapon';
import { weaponService } from '../../Services/weaponService';
import { idParam, libraryPath } from '../../lib/libraryRoutes';
import { MAX_WEAPON_NAME, checkWeaponFile } from '../../lib/weaponFile';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE, clampGripPoint, normalizePose, sameGripPoint, samePose } from '../../lib/weaponPose';
import type { GripPoint, WeaponInfo, WeaponPose } from '../../types/weapon';
import { WeaponPoseFields } from '../../components/weapons/WeaponPoseFields';
import { WeaponStage } from '../../components/weapons/WeaponStage';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';

/** The library card's picture after a change (090): the new file (or the stored one) in the new pose; null on failure. */
const drawThumbnail = async (file: File | null, storedUrl: string | null, pose: WeaponPose): Promise<Blob | null> => {
  try {
    const { renderWeaponThumbnail } = await import('../../components/library/weaponThumbnail');
    if (file) return await renderWeaponThumbnail({ bytes: await file.arrayBuffer() }, pose);
    return storedUrl ? await renderWeaponThumbnail({ url: storedUrl }, pose) : null;
  } catch {
    return null;
  }
};

/**
 * A weapon in full screen (087; was "Editar arma" of 082/083): for the owner, the name, optionally a new file, the
 * standard pose and the grip point picked on the stage — only what changed is sent; another user's weapon is shown on
 * the stage, read-only.
 */
export const WeaponEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const weaponId = idParam(id);
  const { session } = useAuth();
  const { update } = useWeapon();
  const [weapon, setWeapon] = useState<WeaponInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound'>('loading');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pose, setPose] = useState<WeaponPose>(DEFAULT_POSE);
  const [gripPoint, setGripPoint] = useState<GripPoint>(DEFAULT_GRIP_POINT);
  const [saving, setSaving] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const pickedUrl = usePickedUrl(file);
  const owner = weapon !== null && weapon.userId === session?.user.userId;
  const dirty = weapon !== null && owner && (
    name.trim() !== weapon.name || file !== null
    || !samePose(pose, normalizePose(weapon.pose)) || !sameGripPoint(gripPoint, clampGripPoint(weapon.gripPoint)));
  const guard = useLeaveGuard(dirty && !saving);

  const seed = (loaded: WeaponInfo) => {
    setWeapon(loaded);
    setName(loaded.name);
    setFile(null);
    setFileError(null);
    setPose(normalizePose(loaded.pose));
    setGripPoint(clampGripPoint(loaded.gripPoint));
    setInputKey((key) => key + 1);
  };

  useEffect(() => {
    if (weaponId === null) {
      setState('notFound');
      return;
    }
    let cancelled = false;
    setState('loading');
    weaponService.get(weaponId)
      .then((loaded) => {
        if (cancelled) return;
        seed(loaded);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('notFound'); });
    return () => { cancelled = true; };
  }, [weaponId]);

  if (state === 'notFound') return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('weapons')} />;
  if (state === 'loading' || !weapon) return <p className="text-body-secondary">{t('common.loading')}</p>;

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
    if (!owner) return;
    setSaving(true);
    try {
      const poseChanged = !samePose(pose, normalizePose(weapon.pose));
      const saved = await update(weapon, {
        name: name.trim(),
        file,
        gripPoint: sameGripPoint(gripPoint, clampGripPoint(weapon.gripPoint)) ? undefined : gripPoint,
        pose: poseChanged ? pose : undefined,
        // 090: a new file or pose clears the card's picture on the server, so a fresh one goes along.
        thumbnail: file || poseChanged ? await drawThumbnail(file, weapon.modelFileUrl, pose) : undefined,
      });
      toast.success(t('weapons.updated'));
      seed(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader
        title={weapon.name}
        back={{ to: libraryPath('weapons'), label: t('library.nav.weapons') }}
        actions={owner ? (
          <button type="submit" form="weapon-page-form" className="btn btn-primary btn-sm" disabled={saving || !name.trim()}>
            {t('common.save')}
          </button>
        ) : <span className="badge text-bg-secondary">{t('library.readOnly')}</span>}
      />
      <form id="weapon-page-form" onSubmit={(event) => { void submit(event); }}>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <WeaponStage url={pickedUrl ?? weapon.modelFileUrl} name={name} editable={owner} pose={pose} gripPoint={gripPoint}
              onPickGrip={owner ? setGripPoint : undefined} />
          </div>
          <div className="col-12 col-lg-6">
            {owner && <WeaponPoseFields pose={pose} gripPoint={gripPoint} onPose={setPose} onGripPoint={setGripPoint} />}
            <div className="mb-3 mt-3">
              <label className="form-label" htmlFor="weapon-page-name">{t('weapons.name')}</label>
              <input id="weapon-page-name" className="form-control" value={name} maxLength={MAX_WEAPON_NAME} required disabled={!owner}
                onChange={(event) => setName(event.target.value)} />
            </div>
            {owner && (
              <div className="mb-1">
                <label className="form-label" htmlFor="weapon-page-file">{t('weapons.replaceFile')}</label>
                <input key={inputKey} id="weapon-page-file" type="file" accept=".glb,model/gltf-binary"
                  className={`form-control${fileError ? ' is-invalid' : ''}`} onChange={(event) => { void choose(event); }} />
                {fileError
                  ? <div className="invalid-feedback d-block">{fileError}</div>
                  : <div className="form-text">{t('weapons.replaceHelp')}</div>}
              </div>
            )}
          </div>
        </div>
      </form>
      {guard}
    </section>
  );
};

export default WeaponEditPage;
