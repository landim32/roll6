import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import type { ImageCrop } from '../ui/ImageCropper';
import { TokenFormFields } from '../tokens/TokenFormFields';
import { TokenGrid } from '../tokens/TokenGrid';
import { TokenEditModal } from './TokenEditModal';
import { useMapToken } from '../../hooks/useMapToken';
import { useToken } from '../../hooks/useToken';
import { imageService } from '../../Services/imageService';
import { cropToFile, TOKEN_IMAGE_SIZE } from '../../lib/cropImage';
import { emptyTokenForm, toTokenInsert, validateTokenForm } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';
import type { PagedList } from '../../types/common';
import type { TokenInfo } from '../../types/token';

interface TokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to "Tokens". */
  title?: string;
  /** What the chosen (or just created) token is for; the modal closes when it succeeds. */
  onSelect: (token: TokenInfo) => Promise<void> | void;
}

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 300;

/** Token images are always square and saved at 240 × 240 px (upscaled or downscaled). */
const uploadTokenImage = async (crop: ImageCrop): Promise<string> =>
  (await imageService.upload(await cropToFile(crop.src, crop.area, { exactSize: TOKEN_IMAGE_SIZE, rotation: crop.rotation, name: 'token' }))).fileName;

/**
 * One list tab ("Meus Tokens" or "Buscar tokens"): its own search (debounced), page and result, loaded
 * only while the tab is visible. `reloadKey` forces a reload (after an edit).
 */
const useTokenList = (active: boolean, mine: boolean, reloadKey: number) => {
  const { t } = useTranslation();
  const { search } = useToken();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedList<TokenInfo> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    search({ search: debounced, page, pageSize: PAGE_SIZE, mine })
      .then((list) => { if (!cancelled) setResult(list); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : t('common.unknownError')); });
    return () => { cancelled = true; };
  }, [active, mine, debounced, page, reloadKey, search, t]);

  const reset = () => {
    setQuery('');
    setDebounced('');
    setPage(1);
    setResult(null);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  return { query, setQuery, page, setPage, result, totalPages, reset };
};

/**
 * Tokens modal: "Meus Tokens" (the user's own, with a floating pencil to edit), "Buscar tokens" (the whole
 * library) — both in 4-column grids — and "Incluir token". Editing swaps this modal for "Editar token" and
 * comes back to "Meus Tokens" keeping the pending action (`onSelect`).
 */
export const TokenModal = ({ open, onOpenChange, title, onSelect }: TokenModalProps) => {
  const { t } = useTranslation();
  const { create } = useToken();
  const { refresh: refreshMapTokens } = useMapToken();
  const [tab, setTab] = useState('mine');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<TokenForm>(emptyTokenForm);
  const [upCrop, setUpCrop] = useState<ImageCrop | null>(null);
  const [downCrop, setDownCrop] = useState<ImageCrop | null>(null);
  /** Own token being edited: this modal hides while "Editar token" is open. */
  const [editing, setEditing] = useState<TokenInfo | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const visible = open && editing === null;
  const mine = useTokenList(visible && tab === 'mine', true, reloadKey);
  const library = useTokenList(visible && tab === 'search', false, reloadKey);

  useEffect(() => {
    if (!open) return;
    setTab('mine');
    setEditing(null);
    setForm(emptyTokenForm());
    setUpCrop(null);
    setDownCrop(null);
    mine.reset();
    library.reset();
  // Reset once per opening.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = async (token: TokenInfo) => {
    setBusy(true);
    try {
      await onSelect(token);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateTokenForm(form);
    if (error) return toast.error(t(`tokens.errors.${error}`));
    setBusy(true);
    let token: TokenInfo;
    try {
      const upImage = upCrop ? await uploadTokenImage(upCrop) : null;
      const downImage = downCrop ? await uploadTokenImage(downCrop) : null;
      token = await create(toTokenInsert(form, upImage, downImage));
      toast.success(t('toast.tokenCreated', { name: token.name }));
    } catch (err) {
      setBusy(false);
      return toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
    await choose(token);
  };

  const onEditClosed = (saved: boolean) => {
    setEditing(null);
    setTab('mine');
    if (saved) {
      setReloadKey((k) => k + 1);
      // Pieces on the open map may use this token: show its new image.
      void refreshMapTokens();
    }
  };

  const listTab = (list: ReturnType<typeof useTokenList>, emptyText: string, editable: boolean) => (
    <>
      <input type="search" className="form-control mb-3" placeholder={t('tokens.search')} aria-label={t('tokens.search')}
        value={list.query} onChange={(e) => list.setQuery(e.target.value)} />
      <TokenGrid
        items={list.result?.items ?? []}
        loading={list.result === null}
        busy={busy}
        emptyText={emptyText}
        onPick={(token) => { void choose(token); }}
        onEdit={editable ? setEditing : undefined}
        page={list.page}
        totalPages={list.totalPages}
        onPage={list.setPage}
      />
    </>
  );

  return (
    <>
      <Modal
        open={visible}
        onOpenChange={(next) => { if (!busy) onOpenChange(next); }}
        title={title ?? t('tokens.modalTitle')}
        large
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>{t('common.cancel')}</button>
            {tab === 'create' && (
              <button type="submit" form="token-form" className="btn btn-primary" disabled={busy}>{t('common.save')}</button>
            )}
          </>
        )}
      >
        <Tabs
          tabs={[
            { key: 'mine', label: t('tokens.mineTab') },
            { key: 'search', label: t('tokens.searchTab') },
            { key: 'create', label: t('tokens.createTab') },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div hidden={tab !== 'mine'}>{listTab(mine, t('tokens.mineEmpty'), true)}</div>
        <div hidden={tab !== 'search'}>{listTab(library, t('tokens.empty'), false)}</div>
        <form id="token-form" hidden={tab !== 'create'} onSubmit={onCreate} noValidate>
          <TokenFormFields
            idPrefix="token"
            form={form}
            onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onUpCrop={setUpCrop}
            onDownCrop={setDownCrop}
          />
        </form>
      </Modal>
      {editing && <TokenEditModal open token={editing} onClose={onEditClosed} />}
    </>
  );
};

export default TokenModal;
