import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMapEditor } from './useMapEditor';
import type { SaveMapInfo } from '../Contexts/MapEditorContext';
import type { UnsavedChoice } from '../components/modals/UnsavedChangesModal';

/**
 * Save flow + unsaved-changes guard shared by the menu, the map modal and image+.
 * - requestSave(): saves directly, or opens the name modal for new maps / copies.
 * - guard(): resolves true when the current map may be replaced (asks Save/Discard/Cancel if dirty).
 */
export const useUnsavedGuard = () => {
  const { t } = useTranslation();
  const { isDirty, canEdit, needsName, isCopy, draft, saveMap, discardChanges, loading } = useMapEditor();
  const [saveOpen, setSaveOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const saveResolver = useRef<((saved: boolean) => void) | null>(null);
  const unsavedResolver = useRef<((choice: UnsavedChoice) => void) | null>(null);

  const runSave = useCallback(async (info?: SaveMapInfo): Promise<boolean> => {
    try {
      const result = await saveMap(info);
      toast.success(t(result.copied ? 'toast.mapCopied' : 'toast.mapSaved', { name: result.name }));
      if (result.campaignName) toast.success(t('toast.mapAddedToCampaign', { name: result.campaignName }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      return false;
    }
  }, [saveMap, t]);

  const requestSave = useCallback((): Promise<boolean> => {
    if (!canEdit) {
      toast.error(t('toast.readOnly'));
      return Promise.resolve(false);
    }
    if (!needsName) return runSave();
    setSaveOpen(true);
    return new Promise<boolean>((resolve) => { saveResolver.current = resolve; });
  }, [canEdit, needsName, runSave, t]);

  const onSaveSubmit = useCallback(async (info: SaveMapInfo) => {
    const ok = await runSave(info);
    if (!ok) return; // keep the modal open to retry
    setSaveOpen(false);
    saveResolver.current?.(true);
    saveResolver.current = null;
  }, [runSave]);

  const onSaveCancel = useCallback(() => {
    setSaveOpen(false);
    saveResolver.current?.(false);
    saveResolver.current = null;
  }, []);

  const guard = useCallback(async (): Promise<boolean> => {
    if (!isDirty || !canEdit) return true;
    setUnsavedOpen(true);
    const choice = await new Promise<UnsavedChoice>((resolve) => { unsavedResolver.current = resolve; });
    setUnsavedOpen(false);
    unsavedResolver.current = null;
    if (choice === 'cancel') return false;
    if (choice === 'discard') {
      discardChanges();
      toast.info(t('toast.changesDiscarded'));
      return true;
    }
    return requestSave();
  }, [isDirty, canEdit, discardChanges, requestSave, t]);

  const onUnsavedChoose = useCallback((choice: UnsavedChoice) => {
    unsavedResolver.current?.(choice);
  }, []);

  return {
    guard,
    requestSave,
    saveModalProps: { open: saveOpen, isCopy, defaultName: isCopy ? draft.modelName : draft.name, saving: loading, onSubmit: onSaveSubmit, onCancel: onSaveCancel },
    unsavedModalProps: { open: unsavedOpen, onChoose: onUnsavedChoose },
  };
};

export default useUnsavedGuard;
