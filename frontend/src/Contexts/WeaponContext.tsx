import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { modelService } from '../Services/modelService';
import { weaponService } from '../Services/weaponService';
import type { ListQuery, PagedList } from '../types/common';
import type { WeaponInfo } from '../types/weapon';

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
  /** Uploads the `.glb` (`POST /api/model`) and creates the weapon. */
  upload: (name: string, file: File) => Promise<WeaponInfo>;
  /** Renames and/or replaces the file (uploaded first) of an own weapon. */
  update: (weapon: WeaponInfo, change: { name?: string; file?: File | null }) => Promise<WeaponInfo>;
  remove: (weapon: WeaponInfo) => Promise<void>;
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

  const upload = useCallback(async (name: string, file: File) => {
    const stored = await modelService.upload(file);
    const created = await weaponService.create({ name, modelFile: stored.fileName });
    await refreshIfLoaded();
    return created;
  }, [refreshIfLoaded]);

  const update = useCallback(async (weapon: WeaponInfo, change: { name?: string; file?: File | null }) => {
    const modelFile = change.file ? (await modelService.upload(change.file)).fileName : undefined;
    const saved = await weaponService.update(weapon.weaponId, { name: change.name, modelFile });
    await refreshIfLoaded();
    return saved;
  }, [refreshIfLoaded]);

  const remove = useCallback(async (weapon: WeaponInfo) => {
    await weaponService.remove(weapon.weaponId);
    await refreshIfLoaded();
  }, [refreshIfLoaded]);

  const value = useMemo<WeaponContextType>(
    () => ({ choices, loadChoices, refreshChoices, search, upload, update, remove }),
    [choices, loadChoices, refreshChoices, search, upload, update, remove],
  );
  return <WeaponContext.Provider value={value}>{children}</WeaponContext.Provider>;
};

export default WeaponContext;
