import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CharacterAvatar } from '../../components/ui/CharacterAvatar';
import { PagedListView } from '../../components/ui/PagedListView';
import { PencilIcon } from '../../components/ui/icons';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useNpc } from '../../hooks/useNpc';
import { npcPath } from '../../lib/libraryRoutes';
import type { PagedList } from '../../types/common';
import type { NpcInfo } from '../../types/npc';

const PAGE_SIZE = 12;

/** "NPCs" of the library (087): the user's own NPCs, searched by name; each opens its page, "Novo NPC" creates one. */
export const NpcsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { searchMyNpcs } = useNpc();
  const [data, setData] = useState<PagedList<NpcInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      setData(await searchMyNpcs({ page, pageSize: PAGE_SIZE, search: search || undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [searchMyNpcs, search, t]);

  useEffect(() => {
    void load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, []);

  return (
    <section>
      <LibraryPageHeader title={t('library.nav.npcs')}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(npcPath('new'))}>{t('library.npcs.new')}</button>} />
      <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); void load(1); }}>
        <input className="form-control" placeholder={t('library.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
      </form>
      <PagedListView
        data={data}
        loading={loading}
        renderItem={(npc) => (
          <div className="d-flex align-items-center gap-3">
            <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} />
            <div>
              <div className="fw-semibold">{npc.name}</div>
              <small className="text-body-secondary">{t('party.life')} {npc.life} · {t('party.energy')} {npc.energy}</small>
            </div>
          </div>
        )}
        getKey={(npc) => npc.npcId}
        onSelect={(npc) => navigate(npcPath(npc.npcId))}
        renderActions={(npc) => (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(npcPath(npc.npcId))}
            title={t('npcs.edit', { name: npc.name })} aria-label={t('npcs.edit', { name: npc.name })}>
            <PencilIcon size={14} />
          </button>
        )}
        onPageChange={(page) => { void load(page); }}
      />
    </section>
  );
};

export default NpcsPage;
