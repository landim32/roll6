import { useEffect, useState } from 'react';
import { useTokenList } from '../../hooks/useTokenList';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import type { ImageCrop } from '../ui/ImageCropper';
import { TokenFormFields } from '../tokens/TokenFormFields';
import { TokenGrid } from '../tokens/TokenGrid';
import { useModelFile } from '../../hooks/useModelFile';
import { useSpriteImages } from '../../hooks/useSpriteImages';
import { useToken } from '../../hooks/useToken';
import { imageService } from '../../Services/imageService';
import { cropToFile, tokenImageSize } from '../../lib/cropImage';
import { downImageSpace, emptyTokenForm, toTokenInsert, validateTokenForm } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';
import type { TokenInfo } from '../../types/token';

interface TokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to "Tokens". */
  title?: string;
  /** What the chosen (or just created) token is for; the modal closes when it succeeds. */
  onSelect: (token: TokenInfo) => Promise<void> | void;
}

/** Uploads a token image at the pixel size of its footprint (upscaled or downscaled). */
const uploadTokenImage = async (crop: ImageCrop, space: number): Promise<string> =>
  (await imageService.upload(await cropToFile(crop.src, crop.area, { exactSize: tokenImageSize(space), rotation: crop.rotation, name: 'token' }))).fileName;

/**
 * The token picker of the table (087: editing moved to the library): "Meus Tokens", "Buscar tokens" (the whole
 * library) — both in 4-column grids — and "Incluir token".
 */
export const TokenModal = ({ open, onOpenChange, title, onSelect }: TokenModalProps) => {
  const { t } = useTranslation();
  const { create } = useToken();
  const [tab, setTab] = useState('mine');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<TokenForm>(emptyTokenForm);
  const [upCrop, setUpCrop] = useState<ImageCrop | null>(null);
  const [downCrop, setDownCrop] = useState<ImageCrop | null>(null);
  /** The four "2,5D" images of the 3D view (035), edited in the form's own tab. */
  const sprites = useSpriteImages(null, open);
  /** The 3D model of the new token (055). */
  const model = useModelFile(null, open);
  const visible = open;
  const mine = useTokenList(visible && tab === 'mine', true, 0);
  const library = useTokenList(visible && tab === 'search', false, 0);

  useEffect(() => {
    if (!open) return;
    setTab('mine');
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
    if (model.invalid) return toast.error(t('tokens.model.invalid'));
    setBusy(true);
    let token: TokenInfo;
    try {
      const upImage = upCrop ? await uploadTokenImage(upCrop, Number(form.upSpace)) : null;
      const downImage = downCrop ? await uploadTokenImage(downCrop, downImageSpace(form.downSpace)) : null;
      token = await create(toTokenInsert(form, upImage, downImage, await sprites.resolve(), await model.resolve()));
      toast.success(t('toast.tokenCreated', { name: token.name }));
    } catch (err) {
      setBusy(false);
      return toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
    await choose(token);
  };

  const listTab = (list: ReturnType<typeof useTokenList>, emptyText: string) => (
    <>
      <input type="search" className="form-control mb-3" placeholder={t('tokens.search')} aria-label={t('tokens.search')}
        value={list.query} onChange={(e) => list.setQuery(e.target.value)} />
      <TokenGrid
        items={list.result?.items ?? []}
        loading={list.result === null}
        busy={busy}
        emptyText={emptyText}
        onPick={(token) => { void choose(token); }}
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
        <div hidden={tab !== 'mine'}>{listTab(mine, t('tokens.mineEmpty'))}</div>
        <div hidden={tab !== 'search'}>{listTab(library, t('tokens.empty'))}</div>
        <form id="token-form" hidden={tab !== 'create'} onSubmit={onCreate} noValidate>
          <TokenFormFields
            idPrefix="token"
            form={form}
            onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onUpCrop={setUpCrop}
            onDownCrop={setDownCrop}
            sprites={sprites}
            model={model}
            canGenerate
          />
        </form>
      </Modal>
    </>
  );
};

export default TokenModal;
