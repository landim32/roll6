import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { brandAsset, brandSize } from '../../lib/brandAsset';
import type { BrandVariant } from '../../lib/brandAsset';

interface BrandLogoProps {
  variant: BrandVariant;
  /** Display height in px; the width follows the file's proportion. Defaults: vertical 160, horizontal 40, symbol 32. */
  height?: number;
  className?: string;
}

/**
 * The Roll6 logo (038), always the dark version. Sized before it loads (no layout shift) and never stretched; when
 * the file fails to load the name is written instead, so the page is never left without it.
 */
export const BrandLogo = ({ variant, height, className = '' }: BrandLogoProps) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const name = t('common.appName');

  if (failed) return <span className={`stm-brand-text ${className}`.trim()}>{name}</span>;

  const size = brandSize(variant, height);
  return (
    <span className={`stm-brand-logo ${className}`.trim()}>
      <img src={brandAsset(variant).src} alt={name} width={size.width} height={size.height} decoding="async"
        onError={() => setFailed(true)} />
    </span>
  );
};
