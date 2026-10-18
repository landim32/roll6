import { useCallback, useEffect, useState } from 'react';
import { modelService } from '../Services/modelService';
import { AUTO_CLIPS, parseClipChoice } from '../lib/modelAnimations';
import { MODEL_SCALE } from '../lib/modelScale';
import type { AnimationState, ModelClipChoice, ModelClipChoices } from '../lib/modelAnimations';
import type { ResolvedModel } from '../lib/tokenForm';
import { DEFAULT_GRIP, clampGrip } from '../lib/weaponGrip';
import { clampGripPoint, normalizePose } from '../lib/weaponPose';
import type { TokenInfo } from '../types/token';
import { SOCKET, SOCKETS } from '../types/weapon';
import type { Socket, TokenWeapon, TokenWeaponWrite, WeaponGrip } from '../types/weapon';

/** The "3D" tab of the token form (055): a newly picked `.glb`, or the saved model kept or removed, and its animations (056, the death since 058). */
export interface ModelFileState {
  /** The file picked now (checked, not uploaded yet). */
  picked: File | null;
  /** What the preview shows: the picked file (as a blob URL) or the saved model while it is kept; null = none. */
  previewUrl: string | null;
  /** The saved model is still kept (it is sent back on save). */
  keepsSaved: boolean;
  /** The preview could not open the picked file: saving is blocked. */
  invalid: boolean;
  /** The animation chosen for each state (null = automatic), saved with the token. */
  clips: ModelClipChoices;
  /** Size of the model in the 3D view (063), percent: kept when the file is swapped, 100 when it is removed. */
  scale: number;
  /** The weapon in each socket (083) with its grip: kept when the file is swapped, emptied when the model is removed. */
  weapons: TokenWeapons;
  pick: (file: File) => void;
  /** Removes the model: the picked file and the saved one. */
  remove: () => void;
  setInvalid: (invalid: boolean) => void;
  setClip: (state: AnimationState, choice: ModelClipChoice) => void;
  setScale: (scale: number) => void;
  /** Puts a library weapon in a socket (default grip when the socket was empty or carried another weapon), or empties it. */
  setWeapon: (socket: Socket, weapon: PickedWeapon | null) => void;
  setGrip: (socket: Socket, grip: WeaponGrip) => void;
  /** What to send: uploads the picked file, keeps the saved one, or null — with the chosen animations. */
  resolve: () => Promise<ResolvedModel>;
}

/** What the form needs from a library weapon to put it in a socket. */
export type PickedWeapon = Pick<TokenWeapon, 'weaponId' | 'name' | 'modelFileUrl' | 'gripPoint' | 'pose'>;

export type TokenWeapons = Record<Socket, TokenWeapon | null>;

const NO_WEAPONS: TokenWeapons = {
  [SOCKET.rightHand]: null, [SOCKET.leftHand]: null, [SOCKET.back]: null, [SOCKET.rightHolster]: null, [SOCKET.leftHolster]: null,
};

const savedWeapons = (token: TokenInfo | null): TokenWeapons => {
  if (!token?.modelFile) return NO_WEAPONS;
  const weapons: TokenWeapons = { ...NO_WEAPONS };
  for (const weapon of token.weapons ?? []) {
    if (!SOCKETS.includes(weapon.socket)) continue;
    weapons[weapon.socket] = {
      ...weapon, grip: clampGrip(weapon.grip), gripPoint: clampGripPoint(weapon.gripPoint), pose: normalizePose(weapon.pose),
    };
  }
  return weapons;
};

/** A saved choice as the form keeps it: one it does not know (e.g. the former "roll6", 061) is automatic. */
const known = (choice: ModelClipChoice | undefined): ModelClipChoice =>
  (parseClipChoice(choice ?? null).kind === 'auto' ? null : choice ?? null);

const savedClips = (token: TokenInfo | null): ModelClipChoices =>
  token?.modelFile
    ? { idle: known(token.modelIdleClip), walk: known(token.modelWalkClip), down: known(token.modelDownClip) }
    : AUTO_CLIPS;

const savedScale = (token: TokenInfo | null): number => (token?.modelFile ? token.modelScale ?? MODEL_SCALE.standard : MODEL_SCALE.standard);

/**
 * State of the token's 3D model in the form, for "Incluir token" and "Editar token". `active` is the modal's open flag:
 * the state starts again when it opens or the token changes. The saved model starts kept, because the token PUT replaces
 * every field, and its animation choices come with it; a newly picked file starts automatic (its clips are other ones).
 */
export const useModelFile = (token: TokenInfo | null, active: boolean): ModelFileState => {
  const [picked, setPicked] = useState<File | null>(null);
  const [keepsSaved, setKeepsSaved] = useState(!!token?.modelFile);
  const [invalid, setInvalid] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<ModelClipChoices>(() => savedClips(token));
  const [scale, setScale] = useState(() => savedScale(token));
  const [weapons, setWeapons] = useState<TokenWeapons>(() => savedWeapons(token));

  useEffect(() => {
    if (!active) return;
    setPicked(null);
    setKeepsSaved(!!token?.modelFile);
    setInvalid(false);
    setClips(savedClips(token));
    setScale(savedScale(token));
    setWeapons(savedWeapons(token));
  }, [active, token]);

  // The picked file as a URL for the preview, released when another is picked or the form goes away.
  useEffect(() => {
    if (!picked) {
      setPickedUrl(null);
      return;
    }
    const url = URL.createObjectURL(picked);
    setPickedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const pick = useCallback((file: File) => {
    setPicked(file);
    setInvalid(false);
    setClips(AUTO_CLIPS);
  }, []);

  const remove = useCallback(() => {
    setPicked(null);
    setKeepsSaved(false);
    setInvalid(false);
    setClips(AUTO_CLIPS);
    setScale(MODEL_SCALE.standard);
    setWeapons(NO_WEAPONS);
  }, []);

  const setWeapon = useCallback((socket: Socket, weapon: PickedWeapon | null) => {
    setWeapons((prev) => {
      if (!weapon) return prev[socket] ? { ...prev, [socket]: null } : prev;
      const current = prev[socket];
      const picked: PickedWeapon = { ...weapon, gripPoint: clampGripPoint(weapon.gripPoint), pose: normalizePose(weapon.pose) };
      if (current?.weaponId === weapon.weaponId) return { ...prev, [socket]: { ...current, ...picked } };
      return { ...prev, [socket]: { ...picked, socket, grip: DEFAULT_GRIP } };
    });
  }, []);

  const setGrip = useCallback((socket: Socket, grip: WeaponGrip) => {
    setWeapons((prev) => {
      const current = prev[socket];
      return current ? { ...prev, [socket]: { ...current, grip: clampGrip(grip) } } : prev;
    });
  }, []);

  const setClip = useCallback((state: AnimationState, choice: ModelClipChoice) => {
    setClips((prev) => (prev[state] === choice ? prev : { ...prev, [state]: choice }));
  }, []);

  const resolve = useCallback(async (): Promise<ResolvedModel> => {
    const modelFile = picked ? (await modelService.upload(picked)).fileName : keepsSaved ? token?.modelFile ?? null : null;
    const written: TokenWeaponWrite[] = [];
    for (const socket of SOCKETS) {
      const weapon = weapons[socket];
      if (weapon) written.push({ socket, weaponId: weapon.weaponId, grip: weapon.grip });
    }
    return {
      modelFile, modelIdleClip: clips.idle, modelWalkClip: clips.walk, modelDownClip: clips.down, modelScale: scale, weapons: written,
    };
  }, [picked, keepsSaved, token, clips, scale, weapons]);

  const previewUrl = pickedUrl ?? (keepsSaved ? token?.modelFileUrl ?? null : null);
  return {
    picked, previewUrl, keepsSaved, invalid, clips, scale, weapons, pick, remove, setInvalid, setClip, setScale, setWeapon, setGrip,
    resolve,
  };
};

export default useModelFile;
