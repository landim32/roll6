import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { modelService } from '../Services/modelService';
import { weaponService } from '../Services/weaponService';
import { uploadThumbnail } from '../lib/thumbnailUpload';
import type { ListQuery, PagedList } from '../types/common';
import type { GripPoint, WeaponInfo, WeaponPose } from '../types/weapon';

/** Weapons offered to the token form's hand selects (the user's own first, then the others'). */
export const WEAPON_CHOICES = 100;

interface WeaponContextType {
  /** Weapons loaded for the token form's selects (082); empty until `loadChoices`. */
  choices: WeaponInfo[];
  /** Loads the choices once (the token's "Armas" tab calls it). */
  loadChoices: () => void;
  /** Reloads the choices ("Atualizar", and after an upload, an edit or a delete). */
  refreshChoices: () => Promise<void>;
  /** Paged library ("Minhas" with `mine`, "Buscar" without), filtered by name. */
  search: (query: ListQuery) => Promise<PagedList<WeaponInfo>>;
  /**
   * Uploads the `.glb` (`POST /api/model`) and creates the weapon with its grip point and standard pose (083) and the
   * picture of its library card (090; a failed picture upload is skipped).
   */
  upload: (name: string, file: File, gripPoint?: GripPoint, pose?: WeaponPose, thumbnail?: Blob | null) => Promise<WeaponInfo>;
  /** Renames, replaces the file (uploaded first), and/or sets the grip point and pose of an own weapon (083). */
  update: (weapon: WeaponInfo, change: WeaponChange) => Promise<WeaponInfo>;
  remove: (weapon: WeaponInfo) => Promise<void>;
  /** Stores the card's picture drawn for an own weapon that had none (090, backfill); failures are ignored. */
  storeThumbnail: (weapon: WeaponInfo, thumbnail: Blob) => Promise<void>;
}

/** What "Editar arma" may change; a field left out (or undefined) keeps its value. */
export interface WeaponChange {
  name?: string;
  file?: File | null;
  gripPoint?: GripPoint;
  pose?: WeaponPose;
  /** A fresh card picture (090), drawn when the file or the pose changes. */
  thumbnail?: Blob | null;
}

const WeaponContext = createContext<WeaponContextType | undefined>(undefined);

/** The weapon library (082): the window "Armas" and the token form's hand selects. */
export const WeaponProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [choices, setChoices] = useState<WeaponInfo[]>([]);
  const requested = useRef(false);

  // A new session (or a logout) forgets everything loaded for the previous one.
  const userId = session?.user?.userId ?? null;
  useEffect(() => {
    requested.current = false;
    setChoices([]);
  }, [userId]);

  const refreshChoices = useCallback(async () => {
    requested.current = true;
    try {
      const page = await weaponService.list({ pageSize: WEAPON_CHOICES });
      setChoices(page.items);
    } catch {
      // The selects simply show no weapons; the next refresh tries again.
      requested.current = false;
    }
  }, []);

  const loadChoices = useCallback(() => {
    if (!requested.current) void refreshChoices();
  }, [refreshChoices]);

  const refreshIfLoaded = useCallback(async () => {
    if (requested.current) await refreshChoices();
  }, [refreshChoices]);

  const search = useCallback((query: ListQuery) => weaponService.list(query), []);

  const upload = useCallback(async (name: string, file: File, gripPoint?: GripPoint, pose?: WeaponPose, thumbnail?: Blob | null) => {
    const stored = await modelService.upload(file);
    const thumbnailImage = await uploadThumbnail(thumbnail, 'weapon');
    const created = await weaponService.create({ name, modelFile: stored.fileName, gripPoint, pose, thumbnailImage });
    await refreshIfLoaded();
    return created;
  }, [refreshIfLoaded]);

  const update = useCallback(async (weapon: WeaponInfo, change: WeaponChange) => {
    const modelFile = change.file ? (await modelService.upload(change.file)).fileName : undefined;
    const thumbnailImage = await uploadThumbnail(change.thumbnail, 'weapon');
    const saved = await weaponService.update(weapon.weaponId, {
      name: change.name, modelFile, gripPoint: change.gripPoint, pose: change.pose, thumbnailImage,
    });
    await refreshIfLoaded();
    return saved;
  }, [refreshIfLoaded]);

  const remove = useCallback(async (weapon: WeaponInfo) => {
    await weaponService.remove(weapon.weaponId);
    await refreshIfLoaded();
  }, [refreshIfLoaded]);

  const storeThumbnail = useCallback(async (weapon: WeaponInfo, thumbnail: Blob) => {
    const thumbnailImage = await uploadThumbnail(thumbnail, 'weapon');
    if (!thumbnailImage) return;
    try {
      await weaponService.update(weapon.weaponId, { thumbnailImage });
    } catch {
      // The card keeps drawing it live.
    }
  }, []);

  const value = useMemo<WeaponContextType>(
    () => ({ choices, loadChoices, refreshChoices, search, upload, update, remove, storeThumbnail }),
    [choices, loadChoices, refreshChoices, search, upload, update, remove, storeThumbnail],
  );
  return <WeaponContext.Provider value={value}>{children}</WeaponContext.Provider>;
};

export default WeaponContext;
