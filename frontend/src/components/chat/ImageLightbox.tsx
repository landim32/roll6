import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

interface ImageLightboxProps {
  image: { url: string; caption: string | null } | null;
  onClose: () => void;
}

/** A chat photo at full size (041). */
export const ImageLightbox = ({ image, onClose }: ImageLightboxProps) => {
  const { t } = useTranslation();
  return (
    <Modal open={image !== null} onOpenChange={(o) => { if (!o) onClose(); }} title={image?.caption ?? t('chat.image')} large>
      {image && <img className="stm-chat-lightbox" src={image.url} alt={image.caption ?? t('chat.image')} />}
    </Modal>
  );
};

export default ImageLightbox;
