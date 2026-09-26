import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import type { ImageCrop } from '../ui/ImageCropper';
import { TokenFormFields } from '../tokens/TokenFormFields';
import { useToken } from '../../hooks/useToken';
import { imageService } from '../../Services/imageService';
import { cropToFile, TOKEN_IMAGE_SIZE } from '../../lib/cropImage';
import { toTokenForm, toTokenInsert, validateTokenForm } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';
import type { TokenInfo } from '../../types/token';

interface TokenEditModalProps {
  open: boolean;
  token: TokenInfo;
  /** `saved` tells whether the token was changed. */
  onClose: (saved: boolean) => void;
}

/** Uploads a token image cropped square at 240 × 240 (with the chosen rotation). */
const uploadTokenImage = async (crop: ImageCrop): Promise<string> =>
  (await imageService.upload(await cropToFile(crop.src, crop.area, { exactSize: TOKEN_IMAGE_SIZE, rotation: crop.rotation, name: 'token' }))).fileName;

/** "Editar token": the creator changes a library token with the same fields and crop as the create tab. */
export const TokenEditModal = ({ open, token, onClose }: TokenEditModalProps) => {
  const { t } = useTranslation();
  const { update } = useToken();
  const [form, setForm] = useState<TokenForm>(() => toTokenForm(token));
  const [upCrop, setUpCrop] = useState<ImageCrop | null>(null);
  const [downCrop, setDownCrop] = useState<ImageCrop | null>(null);
  /** The saved lying image is kept until removed. */
  const [keepDown, setKeepDown] = useState(token.downImage !== null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toTokenForm(token));
    setUpCrop(null);
    setDownCrop(null);
    setKeepDown(token.downImage !== null);
  }, [open, token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateTokenForm(form);
    if (error) return toast.error(t(`tokens.errors.${error}`));
    setSaving(true);
    try {
      const upImage = upCrop ? await uploadTokenImage(upCrop) : token.upImage;
      const downImage = downCrop ? await uploadTokenImage(downCrop) : keepDown ? token.downImage : null;
      const saved = await update(token.tokenId, toTokenInsert(form, upImage, downImage));
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
          current={{
            name: token.name,
            upUrl: token.upImageUrl,
            hasUp: token.upImage !== null,
            downUrl: token.downImageUrl,
            hasDown: keepDown,
          }}
          onRemoveDown={() => setKeepDown(false)}
        />
      </form>
    </Modal>
  );
};

export default TokenEditModal;
