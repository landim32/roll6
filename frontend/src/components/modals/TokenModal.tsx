import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTokenList } from '../../hooks/useTokenList';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { TokenGrid } from '../tokens/TokenGrid';
import { tokenPath } from '../../lib/libraryRoutes';
import type { TokenInfo } from '../../types/token';

interface TokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to "Tokens". */
  title?: string;
  /** What the chosen token is for; the modal closes when it succeeds. */
  onSelect: (token: TokenInfo) => Promise<void> | void;
}

/**
 * The token picker of the table (087: editing moved to the library): "Meus Tokens" and "Buscar tokens" (the whole
 * library), both in 4-column grids. "Incluir token" (088) is a footer button that opens the library's new-token page.
 */
export const TokenModal = ({ open, onOpenChange, title, onSelect }: TokenModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [busy, setBusy] = useState(false);
  const visible = open;
  const mine = useTokenList(visible && tab === 'mine', true, 0);
  const library = useTokenList(visible && tab === 'search', false, 0);

  useEffect(() => {
    if (!open) return;
    setTab('mine');
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

  const createInLibrary = () => {
    onOpenChange(false);
    navigate(tokenPath('new'));
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
            <button type="button" className="btn btn-primary" onClick={createInLibrary} disabled={busy}>{t('tokens.createTab')}</button>
          </>
        )}
      >
        <Tabs
          tabs={[
            { key: 'mine', label: t('tokens.mineTab') },
            { key: 'search', label: t('tokens.searchTab') },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div hidden={tab !== 'mine'}>{listTab(mine, t('tokens.mineEmpty'))}</div>
        <div hidden={tab !== 'search'}>{listTab(library, t('tokens.empty'))}</div>
      </Modal>
    </>
  );
};

export default TokenModal;
