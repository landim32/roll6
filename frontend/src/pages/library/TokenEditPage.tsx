import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ImageCrop } from '../../components/ui/ImageCropper';
import { TokenFormFields } from '../../components/tokens/TokenFormFields';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';
import { useAuth } from '../../hooks/useAuth';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { useMapToken } from '../../hooks/useMapToken';
import { useModelFile } from '../../hooks/useModelFile';
import { useSpriteImages } from '../../hooks/useSpriteImages';
import { useToken } from '../../hooks/useToken';
import { imageService } from '../../Services/imageService';
import { tokenService } from '../../Services/tokenService';
import { cropToFile, tokenImageSize } from '../../lib/cropImage';
import { idParam, libraryPath, tokenPath } from '../../lib/libraryRoutes';
import { downImageSpace, emptyTokenForm, toTokenForm, toTokenInsert, validateTokenForm } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';
import type { TokenInfo } from '../../types/token';

/** Uploads a token image at the pixel size of its footprint (with the chosen rotation). */
const uploadTokenImage = async (crop: ImageCrop, space: number): Promise<string> =>
  (await imageService.upload(await cropToFile(crop.src, crop.area, { exactSize: tokenImageSize(space), rotation: crop.rotation, name: 'token' }))).fileName;

/**
 * A token in full screen (087; were "Incluir token" and "Editar token"): `/library/tokens/new` creates,
 * `/library/tokens/:id` edits a token of the user's own — the five tabs (Token, 2,5D, 3D, Animação, Armas) with the
 * bigger preview. Another user's token opens read-only (no save). The PUT replaces every field, so the saved images
 * are re-sent unless replaced or removed.
 */
export const TokenEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const creating = id === 'new';
  const tokenId = idParam(id);
  const { session } = useAuth();
  const { create, update } = useToken();
  const { refresh: refreshMapTokens } = useMapToken();
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound'>(creating ? 'ready' : 'loading');
  const [form, setForm] = useState<TokenForm>(emptyTokenForm);
  const [upCrop, setUpCrop] = useState<ImageCrop | null>(null);
  const [downCrop, setDownCrop] = useState<ImageCrop | null>(null);
  const [keepDown, setKeepDown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Both re-seed whenever the token object changes (loaded, saved).
  const sprites = useSpriteImages(token, state === 'ready');
  const model = useModelFile(token, state === 'ready');
  const guard = useLeaveGuard(dirty && !saving);
  const readOnly = token !== null && token.userId !== session?.user.userId;

  useEffect(() => {
    setUpCrop(null);
    setDownCrop(null);
    setDirty(false);
    if (creating) {
      setToken(null);
      setForm(emptyTokenForm());
      setKeepDown(false);
      setState('ready');
      return;
    }
    if (tokenId === null) {
      setState('notFound');
      return;
    }
    let cancelled = false;
    setState('loading');
    tokenService.get(tokenId)
      .then((loaded) => {
        if (cancelled) return;
        setToken(loaded);
        setForm(toTokenForm(loaded));
        setKeepDown(loaded.downImage !== null);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('notFound'); });
    return () => { cancelled = true; };
  }, [creating, tokenId]);

  if (state === 'notFound') return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('tokens')} />;
  if (state === 'loading') return <p className="text-body-secondary">{t('common.loading')}</p>;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    const error = validateTokenForm(form);
    if (error) return toast.error(t(`tokens.errors.${error}`));
    if (model.invalid) return toast.error(t('tokens.model.invalid'));
    setSaving(true);
    try {
      const upImage = upCrop ? await uploadTokenImage(upCrop, Number(form.upSpace)) : token?.upImage ?? null;
      const downImage = downCrop
        ? await uploadTokenImage(downCrop, downImageSpace(form.downSpace))
        : token && keepDown ? token.downImage : null;
      const payload = toTokenInsert(form, upImage, downImage, await sprites.resolve(), await model.resolve());
      if (token) {
        const saved = await update(token.tokenId, payload);
        toast.success(t('toast.tokenUpdated', { name: saved.name }));
        setToken(saved);
        setForm(toTokenForm(saved));
        setKeepDown(saved.downImage !== null);
        setUpCrop(null);
        setDownCrop(null);
        setDirty(false);
        // Pieces on the open map may use this token: show its new image.
        void refreshMapTokens();
      } else {
        const created = await create(payload);
        toast.success(t('toast.tokenCreated', { name: created.name }));
        setDirty(false);
        navigate(tokenPath(created.tokenId), { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stm-library-form is-wide">
      <LibraryPageHeader
        title={token ? token.name : t('tokens.createTab')}
        back={{ to: libraryPath('tokens'), label: t('library.nav.tokens') }}
        actions={readOnly ? <span className="badge text-bg-secondary">{t('library.readOnly')}</span> : (
          <button type="submit" form="token-page-form" className="btn btn-primary btn-sm" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        )}
      />
      <form id="token-page-form" onSubmit={onSubmit} noValidate onChange={() => setDirty(true)}>
        <fieldset disabled={readOnly}>
          <TokenFormFields
            idPrefix="token-page"
            form={form}
            onField={(field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setDirty(true); }}
            onUpCrop={(value) => { setUpCrop(value); if (value) setDirty(true); }}
            onDownCrop={(value) => { setDownCrop(value); if (value) setDirty(true); }}
            sprites={sprites}
            model={model}
            current={token ? {
              name: token.name,
              upUrl: token.upImageUrl,
              hasUp: token.upImage !== null,
              downUrl: token.downImageUrl,
              hasDown: keepDown,
            } : undefined}
            onRemoveDown={() => { setKeepDown(false); setDirty(true); }}
            canGenerate={!readOnly}
          />
        </fieldset>
      </form>
      {guard}
    </section>
  );
};

export default TokenEditPage;
