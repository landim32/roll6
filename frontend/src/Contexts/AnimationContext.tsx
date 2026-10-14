import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { animationService } from '../Services/animationService';
import type { PagedList } from '../types/common';
import type {
  AnimationInfo, AnimationInsertInfo, AnimationQuery, AnimationType, AnimationUpdateInfo,
} from '../types/animation';

/** Animations of one type offered to a token state's select (the user's own first, then the others'). */
export const ANIMATIONS_PER_TYPE = 100;

interface AnimationContextType {
  /** Animations of each type already loaded for the token selects (059). */
  byType: Partial<Record<AnimationType, AnimationInfo[]>>;
  /** Loads the animations of a type once (the token's "3D" tab calls it for each state). */
  listForType: (type: AnimationType) => void;
  /** Reloads one type (after an upload, an edit or a delete). */
  refreshType: (type: AnimationType) => Promise<void>;
  /** Paged library ("Minhas" with `mine`, "Buscar" without), filtered by type and name. */
  search: (query: AnimationQuery) => Promise<PagedList<AnimationInfo>>;
  upload: (data: AnimationInsertInfo) => Promise<AnimationInfo>;
  update: (animation: AnimationInfo, data: AnimationUpdateInfo) => Promise<AnimationInfo>;
  remove: (animation: AnimationInfo) => Promise<void>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

/** The animation library (059): the window "Animações" and the token form's selects. */
export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [byType, setByType] = useState<Partial<Record<AnimationType, AnimationInfo[]>>>({});
  const requested = useRef(new Set<AnimationType>());

  // A new session (or a logout) forgets everything loaded for the previous one.
  const userId = session?.user?.userId ?? null;
  useEffect(() => {
    requested.current = new Set();
    setByType({});
  }, [userId]);

  const refreshType = useCallback(async (type: AnimationType) => {
    requested.current.add(type);
    try {
      const page = await animationService.list({ type, pageSize: ANIMATIONS_PER_TYPE });
      setByType((current) => ({ ...current, [type]: page.items }));
    } catch {
      // The selects simply show no library animations; the next refresh tries again.
      requested.current.delete(type);
    }
  }, []);

  const listForType = useCallback((type: AnimationType) => {
    if (!requested.current.has(type)) void refreshType(type);
  }, [refreshType]);

  const search = useCallback((query: AnimationQuery) => animationService.list(query), []);

  const upload = useCallback(async (data: AnimationInsertInfo) => {
    const created = await animationService.create(data);
    if (requested.current.has(created.type)) await refreshType(created.type);
    return created;
  }, [refreshType]);

  const update = useCallback(async (animation: AnimationInfo, data: AnimationUpdateInfo) => {
    const saved = await animationService.update(animation.animationId, data);
    for (const type of new Set([animation.type, saved.type])) if (requested.current.has(type)) await refreshType(type);
    return saved;
  }, [refreshType]);

  const remove = useCallback(async (animation: AnimationInfo) => {
    await animationService.remove(animation.animationId);
    if (requested.current.has(animation.type)) await refreshType(animation.type);
  }, [refreshType]);

  const value = useMemo<AnimationContextType>(
    () => ({ byType, listForType, refreshType, search, upload, update, remove }),
    [byType, listForType, refreshType, search, upload, update, remove],
  );
  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>;
};

export default AnimationContext;
