import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import type { ImageCrop } from '../ui/ImageCropper';
import { TokenFormFields } from '../tokens/TokenFormFields';
import { useToken } from '../../hooks/useToken';
import { imageService } from '../../Services/imageService';
import { cropToFile, tokenImageSize } from '../../lib/cropImage';
import { downImageSpace, toTokenForm, toTokenInsert, validateTokenForm } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';
import type { TokenInfo } from '../../types/token';

interface TokenEditModalProps {
  open: boolean;
  token: TokenInfo;
  /** `saved` tells whether the token was changed. */
  onClose: (saved: boolean) => void;
}

/** Uploads a token image at the pixel size of its footprint (with the chosen rotation). */
const uploadTokenImage = async (crop: ImageCrop, space: number): Promise<string> =>
  (await imageService.upload(await cropToFile(crop.src, crop.area, { exactSize: tokenImageSize(space), rotation: crop.rotation, name: 'token' }))).fileName;

/** "Editar token": the creator changes a library token with the same fields and crop as the create tab. */
export const TokenEditModal = ({ open, token, onClose }: TokenEditModalProps) => {
  const { t } = useTranslation();
  const { update } = useToken();
  const [form, setForm] = useState<TokenForm>(() => toTokenForm(token));
  const [upCrop, setUpCrop] = useState<ImageCrop | null>(null);
  const [downCrop, setDownCrop] = useState<ImageCrop | null>(null);
  /** "2,5D frente" (034): a newly chosen file, uploaded as it is. */
  const [frontFile, setFrontFile] = useState<File | null>(null);
  /** The saved lying and "2,5D frente" images are kept until removed. */
  const [keepDown, setKeepDown] = useState(token.downImage !== null);
  const [keepFront, setKeepFront] = useState(token.frontImage !== null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toTokenForm(token));
    setUpCrop(null);
    setDownCrop(null);
    setFrontFile(null);
    setKeepDown(token.downImage !== null);
    setKeepFront(token.frontImage !== null);
  }, [open, token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateTokenForm(form);
    if (error) return toast.error(t(`tokens.errors.${error}`));
    setSaving(true);
    try {
      const upImage = upCrop ? await uploadTokenImage(upCrop, Number(form.upSpace)) : token.upImage;
      const downImage = downCrop ? await uploadTokenImage(downCrop, downImageSpace(form.downSpace)) : keepDown ? token.downImage : null;
      // PUT replaces every field: the saved "2,5D frente" is sent back unless it was replaced or removed.
      const frontImage = frontFile ? (await imageService.upload(frontFile)).fileName : keepFront ? token.frontImage : null;
      const saved = await update(token.tokenId, toTokenInsert(form, upImage, downImage, frontImage));
      toast.success(t('toast.tokenUpdated', { name: saved.name }));
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => { if (!next && !saving) onClose(false); }}
      title={t('tokens.editTitle')}
      large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="token-edit-form" className="btn btn-primary" disabled={saving}>{t('common.save')}</button>
        </>
      )}
    >
      <form id="token-edit-form" onSubmit={onSubmit} noValidate>
        <TokenFormFields
          idPrefix="token-edit"
          form={form}
          onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onUpCrop={setUpCrop}
          onDownCrop={setDownCrop}
          onFrontFile={setFrontFile}
          current={{
            name: token.name,
            upUrl: token.upImageUrl,
            hasUp: token.upImage !== null,
            downUrl: token.downImageUrl,
            hasDown: keepDown,
            frontUrl: token.frontImageUrl,
            hasFront: keepFront,
          }}
          onRemoveDown={() => setKeepDown(false)}
          onRemoveFront={() => setKeepFront(false)}
        />
      </form>
    </Modal>
  );
};

export default TokenEditModal;
