import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { useAuth } from '../../hooks/useAuth';
import { useWeapon } from '../../hooks/useWeapon';
import { weaponService } from '../../Services/weaponService';
import { handWeaponsOf } from '../../lib/weaponGrip';
import { HAND, HANDS } from '../../types/weapon';
import type { Hand } from '../../types/weapon';
import type { WeaponHands } from '../story/attachWeapons';
import { WeaponGripFields } from './WeaponGripFields';
import type { ModelFileState } from '../../hooks/useModelFile';
import { animationService } from '../../Services/animationService';
import type { AnimationInfo } from '../../types/animation';
import { checkModelFile } from '../../lib/modelFile';
import { MODEL_SCALE, clampModelScale, formatModelScale, modelScaleFactor } from '../../lib/modelScale';
import {
  ANIMATION_STATES, STATE_ANIMATION_TYPE, animationChoice, clipChoiceFromValue, clipChoiceOptions, isMixamoSkeleton, parseClipChoice,
} from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState, ClipOption } from '../../lib/modelAnimations';
import { ModelTimeline } from './ModelTimeline';
import { ArrowClockwiseIcon, CameraIcon } from '../ui/icons';
import type { ModelPreviewHandle, ModelPreviewInfo } from './ModelPreview';

const ModelPreview = lazy(() => import('./ModelPreview'));

/** "Gerar imagem" (057): the sizes of the two token images and where a photo goes. */
export interface ModelFieldGenerate {
  upSize: { width: number; height: number };
  downSize: { width: number; height: number };
  onGenerated: (kind: 'up' | 'down', blob: Blob) => void;
}

interface ModelFieldProps {
  id: string;
  state: ModelFileState;
  /** Name of the token, for the preview's label. */
  name: string;
  /** Only in forms that save the token: the paused pose can become the standing or the lying image. */
  generate?: ModelFieldGenerate;
  /**
   * Which tab shows it (060): "model" = the "3D" tab (pick or remove the `.glb`, seen in its rest pose — the T-pose of
   * the rig); "animation" = the "Animação" tab (the state, the animated preview with its timeline and "Gerar imagem",
   * and the animation of that state with "Atualizar" for the library); "weapons" (082) = the "Armas" tab (the animated
   * preview with the weapon of each hand, chosen from the library, and its grip).
   */
  section: 'model' | 'animation' | 'weapons';
}

/**
 * The token's 3D model, in two tabs of the token form (060). "3D" (055): pick a `.glb` (checked here — extension, size,
 * glTF 2.0 header — before anything is sent) or remove the saved one, seen in its rest pose. "Animação": choose the
 * state (Parado, Caminhando, Caído — 058), watch it in the preview card (timeline, "Gerar imagem" — 057) and choose the
 * animation of that state (056: a clip of the file, a library animation of the state's type from every
 * user (059), none, or the automatic rule), refreshing the library list with "Atualizar". The file is uploaded only
 * when the token is saved.
 */
export const ModelField = ({ id, state, name, generate, section }: ModelFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  /** The state the preview shows (058: Parado, Caminhando or Caído). */
  const [shown, setShown] = useState<AnimationState>('idle');
  const [info, setInfo] = useState<ModelPreviewInfo | null>(null);
  const [sources, setSources] = useState<Record<AnimationState, AnimationSource> | null>(null);
  const [loading, setLoading] = useState(false);
  /** A chosen library animation plays in full and stretches this model (058, Q1 = A). */
  const [deforms, setDeforms] = useState(false);
  /** The preview shows a still pose (paused, or a state without animation) — 057. */
  const [still, setStill] = useState(false);
  const previewRef = useRef<ModelPreviewHandle>(null);
  const { previewUrl, clips, setClip, setInvalid, scale, setScale } = state;
  const { byType, listForType, refreshType } = useAnimation();
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuth();
  const userId = session?.user.userId;
  /** Names of chosen library animations that are not in the loaded lists (another user's, beyond the first page). */
  const [chosenNames, setChosenNames] = useState<Record<number, string>>({});
  const mixamo = info !== null && isMixamoSkeleton(info.boneNames);
  /** "Armas" (082): the hand being edited, which hands the model has, and the library's weapons. */
  const [hand, setHand] = useState<Hand>(HAND.right);
  const [hands, setHands] = useState<WeaponHands | null>(null);
  const { choices: weaponChoices, loadChoices, refreshChoices } = useWeapon();
  const [refreshingWeapons, setRefreshingWeapons] = useState(false);
  const { weapons, setWeapon, setGrip } = state;
  const heldWeapons = useMemo(() => handWeaponsOf({ rightWeapon: weapons.right, leftWeapon: weapons.left }), [weapons]);

  // A new model to show: wait for the preview to say what it found.
  useEffect(() => {
    setInfo(null);
    setSources(null);
    setDeforms(false);
    setShown('idle');
    setHands(null);
    setLoading(previewUrl !== null);
  }, [previewUrl]);

  // The weapon selects (082) read the library once, when the "Armas" tab first shows.
  useEffect(() => {
    if (section === 'weapons') loadChoices();
  }, [section, loadChoices]);

  const options = useMemo(
    () => (info
      ? Object.fromEntries(ANIMATION_STATES.map((animation) => [animation, clipChoiceOptions(info.clipNames, info.boneNames, animation)])) as
        Record<AnimationState, ClipOption[]>
      : null),
    [info],
  );

  // The library animations each state may take (059): loaded once per type, only for a Mixamo skeleton.
  useEffect(() => {
    if (!mixamo) return;
    for (const animation of ANIMATION_STATES) listForType(STATE_ANIMATION_TYPE[animation]);
  }, [mixamo, listForType]);

  const libraryOf = (animation: AnimationState): AnimationInfo[] => byType[STATE_ANIMATION_TYPE[animation]] ?? [];

  /** A chosen library animation, by id, as it reads: its name (or "Animação #id" until it is known). */
  const animationName = (animationId: number): string => {
    for (const animation of ANIMATION_STATES) {
      const found = libraryOf(animation).find((item) => item.animationId === animationId);
      if (found) return found.name;
    }
    return chosenNames[animationId] || t('tokens.model.choice.libraryLoading', { id: animationId });
  };

  // Chosen library animations missing from the loaded lists: read their names.
  useEffect(() => {
    for (const animation of ANIMATION_STATES) {
      const parsed = parseClipChoice(clips[animation]);
      if (parsed.kind !== 'animation' || chosenNames[parsed.id] !== undefined) continue;
      const list = byType[STATE_ANIMATION_TYPE[animation]];
      if (!list || list.some((item) => item.animationId === parsed.id)) continue;
      const id = parsed.id;
      setChosenNames((current) => ({ ...current, [id]: current[id] ?? '' }));
      animationService.get(id)
        .then((found) => setChosenNames((current) => ({ ...current, [id]: found.name })))
        .catch(() => undefined);
    }
  }, [clips, byType, chosenNames]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const check = await checkModelFile(file);
    if (check !== 'ok') {
      const message = t(`tokens.model.${check}`);
      setError(message);
      toast.error(message);
      return;
    }
    setError(null);
    state.pick(file);
  };

  const onError = () => {
    setLoading(false);
    setInvalid(true);
    setError(t('tokens.model.invalid'));
  };

  /** How a source reads for a state: nothing is "lying" for the down state (058). */
  const sourceLabel = (source: AnimationSource, animation: AnimationState): string => {
    if (animation === 'down' && source === 'static') return t('tokens.model.source.lying');
    if (source === 'library') {
      const parsed = parseClipChoice(clips[animation]);
      return t('tokens.model.source.library', { name: parsed.kind === 'animation' ? animationName(parsed.id) : '' });
    }
    return t(`tokens.model.source.${source}`);
  };

  const optionLabel = (option: ClipOption, animation: AnimationState): string => {
    switch (option.kind) {
      case 'file': return t('tokens.model.choice.file', { name: option.name });
      case 'none': return t('tokens.model.choice.none');
      default: {
        const resolved = option.resolves === 'file' && option.resolvesName
          ? t('tokens.model.choice.file', { name: option.resolvesName })
          : sourceLabel(option.resolves ?? 'static', animation);
        return t('tokens.model.choice.auto', { resolved });
      }
    }
  };

  const isStatic = sources !== null && sources.idle === 'static' && sources.walk === 'static';

  /** Photographs the paused pose for one of the token's images (057, FR-010…FR-014). */
  const shoot = async (kind: 'up' | 'down') => {
    if (!generate) return;
    try {
      const blob = await previewRef.current!.capture(kind === 'up' ? generate.upSize : generate.downSize);
      generate.onGenerated(kind, blob);
      toast.success(t(kind === 'up' ? 'tokens.model.generate.doneUp' : 'tokens.model.generate.doneDown'));
    } catch {
      toast.error(t('tokens.model.generate.failed'));
    }
  };
  const canShoot = !!generate && !!previewUrl && !loading && !error && still;

  const libraryType = STATE_ANIMATION_TYPE[shown];
  /** "Atualizar" (060): reads again the library animations of the state's type, from every user. */
  const refreshLibrary = async () => {
    setRefreshing(true);
    try {
      await refreshType(libraryType);
    } catch {
      toast.error(t('tokens.model.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  /** The library animations of the state shown (059), plus a chosen one outside the loaded list. */
  const libraryGroup = () => {
    const list = mixamo ? libraryOf(shown) : [];
    const chosen = parseClipChoice(clips[shown]);
    const extra = chosen.kind === 'animation' && !list.some((item) => item.animationId === chosen.id) ? chosen.id : null;
    if (list.length === 0 && extra === null) return null;
    return (
      <optgroup label={t('tokens.model.libraryGroup')}>
        {list.map((item) => (
          <option key={item.animationId} value={animationChoice(item.animationId)}>
            {item.userId === userId || !item.ownerName
              ? t('tokens.model.choice.library', { name: item.name })
              : t('tokens.model.choice.libraryOther', { name: item.name, owner: item.ownerName })}
          </option>
        ))}
        {extra !== null && (
          <option value={animationChoice(extra)}>{t('tokens.model.choice.library', { name: animationName(extra) })}</option>
        )}
      </optgroup>
    );
  };

  const animating = section === 'animation';
  /** The "Animação" and "Armas" tabs show the model moving, with the state select and the timeline (082). */
  const live = section !== 'model';
  const arming = section === 'weapons';

  /** "Atualizar" (082): reads the weapon library again. */
  const refreshWeapons = async () => {
    setRefreshingWeapons(true);
    try {
      await refreshChoices();
    } finally {
      setRefreshingWeapons(false);
    }
  };

  const heldWeapon = weapons[hand];
  const handReady = hands !== null && hands[hand];
  /** The weapons offered for a hand: the library's, plus the held one when it is not in the loaded list. */
  const weaponOptions = heldWeapon && !weaponChoices.some((item) => item.weaponId === heldWeapon.weaponId)
    ? [{ weaponId: heldWeapon.weaponId, name: heldWeapon.name ?? `#${heldWeapon.weaponId}`, userId, ownerName: null }, ...weaponChoices]
    : weaponChoices;

  /** A weapon picked for the hand: its name and file come from the library (or are read when not loaded). */
  const pickWeapon = async (value: string) => {
    if (!value) {
      setWeapon(hand, null);
      return;
    }
    const weaponId = Number(value);
    const found = weaponChoices.find((item) => item.weaponId === weaponId)
      ?? await weaponService.get(weaponId).catch(() => null);
    if (!found) {
      toast.error(t('tokens.weapons.loadFailed'));
      return;
    }
    setWeapon(hand, { weaponId: found.weaponId, name: found.name, modelFileUrl: found.modelFileUrl });
  };

  // The card stays at the same place in both sections, so switching tabs keeps the loaded model (060).
  return (
    <div className="stm-model-field">
      {live ? (
        <div className="mb-2">
          {previewUrl ? (
            <>
              <label htmlFor={`${id}-state`} className="form-label small mb-1">{t('tokens.model.showState')}</label>
              <select
                id={`${id}-state`}
                className="form-select form-select-sm"
                value={shown}
                onChange={(e) => setShown(e.target.value as AnimationState)}
              >
                {ANIMATION_STATES.map((animation) => (
                  <option key={animation} value={animation}>{t(`tokens.model.state.${animation}`)}</option>
                ))}
              </select>
            </>
          ) : (
            <div className="form-text">{t(arming ? 'tokens.weapons.needsModel' : 'tokens.model.animationNeedsModel')}</div>
          )}
        </div>
      ) : (
        <div>
          <div className="form-text mb-2">{t('tokens.model.help')}</div>
          <div className="d-flex flex-wrap gap-2 mb-2">
            <input ref={input} id={id} type="file" accept=".glb,model/gltf-binary" className="d-none" onChange={(e) => { void onFile(e); }} />
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => input.current?.click()}>
              {t(previewUrl ? 'tokens.model.change' : 'tokens.model.pick')}
            </button>
            {previewUrl && (
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { setError(null); state.remove(); }}>
                {t('tokens.model.remove')}
              </button>
            )}
          </div>
          {state.picked && <div className="small text-secondary mb-2 text-truncate">{state.picked.name}</div>}
          {error && <div className="invalid-feedback d-block mb-2">{error}</div>}
          {previewUrl && <div className="form-text mb-2">{t('tokens.model.restPose')}</div>}
        </div>
      )}
      <div className="stm-model-card" hidden={live && !previewUrl}>
        <div className="stm-model-stage">
          {previewUrl ? (
            <Suspense fallback={<div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}>
              <ModelPreview
                ref={previewRef}
                url={previewUrl}
                shown={shown}
                animated={live}
                clips={clips}
                scale={modelScaleFactor(scale)}
                weapons={heldWeapons}
                onHands={setHands}
                label={t('tokens.model.previewLabel', { name: name || '—' })}
                onLoaded={(found) => { setLoading(false); setInfo(found); setInvalid(false); }}
                onClips={(found, stretched) => { setSources(found); setDeforms(stretched); }}
                onError={onError}
              />
            </Suspense>
          ) : (
            <div className="stm-model-stage-note small text-secondary">{t('tokens.model.none')}</div>
          )}
          {previewUrl && loading && !error && <div className="stm-model-stage-note small text-secondary">{t('tokens.model.loading')}</div>}
        </div>
        {live && previewUrl && (
          <ModelTimeline
            preview={previewRef}
            disabled={loading || !!error}
            resetKey={`${previewUrl}|${shown}|${clips.idle ?? ''}|${clips.walk ?? ''}|${clips.down ?? ''}`}
            onStillChange={setStill}
          />
        )}
        {animating && generate && previewUrl && (
          <div className="stm-model-generate">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild disabled={!canShoot}>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm dropdown-toggle d-inline-flex align-items-center gap-2"
                  disabled={!canShoot}
                  title={canShoot ? undefined : t('tokens.model.generate.pauseFirst')}
                >
                  <CameraIcon size={14} /> {t('tokens.model.generate.button')}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="dropdown-menu show" align="center" sideOffset={4}>
                <DropdownMenu.Item className="dropdown-item" onSelect={() => { void shoot('up'); }}>
                  {t('tokens.model.generate.up')}
                </DropdownMenu.Item>
                <DropdownMenu.Item className="dropdown-item" onSelect={() => { void shoot('down'); }}>
                  {t('tokens.model.generate.down')}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        )}
      </div>
      {section === 'model' && previewUrl && (
        <div className="stm-model-scale mt-3">
          <label htmlFor={`${id}-scale`} className="form-label small mb-1 d-flex justify-content-between">
            <span>{t('tokens.model.scale')}</span>
            <output htmlFor={`${id}-scale`} className="fw-semibold">{formatModelScale(scale)}</output>
          </label>
          <input
            id={`${id}-scale`}
            type="range"
            className="form-range"
            min={MODEL_SCALE.min}
            max={MODEL_SCALE.max}
            step={MODEL_SCALE.step}
            value={scale}
            aria-valuetext={formatModelScale(scale)}
            onChange={(e) => setScale(clampModelScale(Number(e.target.value)))}
          />
          <div className="d-flex justify-content-between align-items-center">
            <div className="form-text mt-0">{t('tokens.model.scaleHint')}</div>
            {scale !== MODEL_SCALE.standard && (
              <button type="button" className="btn btn-link btn-sm p-0 flex-shrink-0" onClick={() => setScale(MODEL_SCALE.standard)}>
                {t('tokens.model.scaleReset')}
              </button>
            )}
          </div>
        </div>
      )}
      {animating && previewUrl && options && (
        <div className="stm-model-choice mt-3">
          <label htmlFor={`${id}-clip`} className="form-label small mb-1">
            {t('tokens.model.animationOf', { state: t(`tokens.model.state.${shown}`) })}
          </label>
          <div className="d-flex gap-2">
            <select
              id={`${id}-clip`}
              className="form-select form-select-sm"
              value={clips[shown] ?? ''}
              onChange={(e) => setClip(shown, clipChoiceFromValue(e.target.value))}
            >
              {options[shown].map((option) => (
                <option key={option.value} value={option.value}>{optionLabel(option, shown)}</option>
              ))}
              {libraryGroup()}
            </select>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              onClick={() => { void refreshLibrary(); }}
              disabled={refreshing || !mixamo}
              title={t('tokens.model.refreshTitle')}
              aria-label={t('tokens.model.refreshTitle')}
            >
              <ArrowClockwiseIcon size={14} /> <span className="d-none d-sm-inline">{t('tokens.model.refresh')}</span>
            </button>
          </div>
          {sources && (
            <div className="form-text">{t('tokens.model.playing', { source: sourceLabel(sources[shown], shown) })}</div>
          )}
          <div className="form-text">{t('tokens.model.animationsHelp')}</div>
        </div>
      )}
      {arming && previewUrl && (
        <div className="stm-weapon-choice mt-3">
          <div className="btn-group btn-group-sm mb-2" role="group" aria-label={t('tokens.weapons.handLabel')}>
            {HANDS.map((value) => (
              <button key={value} type="button" aria-pressed={hand === value}
                className={`btn ${hand === value ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setHand(value)}>
                {t(`tokens.weapons.hand.${value}`)}
              </button>
            ))}
          </div>
          <label htmlFor={`${id}-weapon`} className="form-label small mb-1 d-block">
            {t(`tokens.weapons.weaponOf.${hand}`)}
          </label>
          <div className="d-flex gap-2">
            <select
              id={`${id}-weapon`}
              className="form-select form-select-sm"
              value={heldWeapon ? String(heldWeapon.weaponId) : ''}
              disabled={!handReady}
              onChange={(e) => { void pickWeapon(e.target.value); }}
            >
              <option value="">{t('tokens.weapons.none')}</option>
              {weaponOptions.map((item) => (
                <option key={item.weaponId} value={item.weaponId}>
                  {item.userId === userId || !item.ownerName
                    ? item.name
                    : t('tokens.weapons.other', { name: item.name, owner: item.ownerName })}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              onClick={() => { void refreshWeapons(); }}
              disabled={refreshingWeapons}
              title={t('tokens.weapons.refreshTitle')}
              aria-label={t('tokens.weapons.refreshTitle')}
            >
              <ArrowClockwiseIcon size={14} /> <span className="d-none d-sm-inline">{t('tokens.model.refresh')}</span>
            </button>
          </div>
          {hands !== null && !hands[hand] && (
            <div className="alert alert-warning small mt-2 mb-0">{t('tokens.weapons.noHands')}</div>
          )}
          {heldWeapon && (
            <WeaponGripFields id={`${id}-grip-${hand}`} grip={heldWeapon.grip} disabled={!handReady}
              onChange={(grip) => setGrip(hand, grip)} />
          )}
          <div className="form-text">{t('tokens.weapons.help')}</div>
        </div>
      )}
      {animating && isStatic && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.static')}</div>}
      {animating && deforms && <div className="alert alert-warning small mt-2 mb-0">{t('tokens.model.deforms')}</div>}
    </div>
  );
};

export default ModelField;
