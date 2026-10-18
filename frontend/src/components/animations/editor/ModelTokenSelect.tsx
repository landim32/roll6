import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokenService } from '../../../Services/tokenService';
import type { TokenInfo } from '../../../types/token';

interface ModelTokenSelectProps {
  tokenId: number | null;
  onChange: (token: TokenInfo | null) => void;
  /** The tokens with a 3D model, once read; the page needs the chosen one's URL and name. */
  onTokens: (tokens: TokenInfo[]) => void;
}

const PAGE_SIZE = 100;

/**
 * "Modelo": the user's own tokens with a 3D model (086), to play the animation on. The choice is remembered per device
 * by the context.
 */
export const ModelTokenSelect = ({ tokenId, onChange, onTokens }: ModelTokenSelectProps) => {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<TokenInfo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    tokenService.list({ mine: true, pageSize: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        const withModel = page.items.filter((token) => token.modelFileUrl);
        setTokens(withModel);
        onTokens(withModel);
      })
      .catch(() => {
        if (!cancelled) setTokens([]);
      });
    return () => { cancelled = true; };
  }, [onTokens]);

  if (tokens === null) return <span className="text-body-secondary small">{t('common.loading')}</span>;
  if (tokens.length === 0) {
    return (
      <span className="text-body-secondary small" title={t('editor.model.noneHint')}>{t('editor.model.none')}</span>
    );
  }
  return (
    <label className="d-flex align-items-center gap-2 mb-0 small">
      <span className="text-body-secondary d-none d-sm-inline">{t('editor.model.label')}</span>
      <select className="form-select form-select-sm w-auto" aria-label={t('editor.model.label')}
        value={tokenId ?? ''} onChange={(event) => onChange(tokens.find((token) => token.tokenId === Number(event.target.value)) ?? null)}>
        <option value="">{t('editor.model.choose')}</option>
        {tokens.map((token) => <option key={token.tokenId} value={token.tokenId}>{token.name}</option>)}
      </select>
    </label>
  );
};

export default ModelTokenSelect;
