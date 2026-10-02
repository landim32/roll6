import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TurnHistoryList } from '../turns/TurnHistoryList';
import { TurnConsoleModal } from '../modals/TurnConsoleModal';
import { useTurnHistory } from '../../hooks/useTurnHistory';
import { OpenIcon } from '../ui/icons';

/**
 * Turn console over the map (028): a translucent strip above the footer with the narration of each turn of the
 * campaign — the turn being played comes first — newest first, and "Ampliar" to read them in a full-screen window
 * (same history, no reload).
 */
export const TurnConsole = () => {
  const { t } = useTranslation();
  const history = useTurnHistory(true);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <section className="stm-turn-console" aria-label={t('turnConsole.title')}>
        <header className="stm-turn-console-header">
          <span>{t('turnConsole.title')}</span>
          <button type="button" className="btn btn-link btn-sm p-0 ms-auto" title={t('turnConsole.expand')}
            aria-label={t('turnConsole.expand')} onClick={() => setExpanded(true)}>
            <OpenIcon size={12} />
          </button>
        </header>
        <TurnHistoryList history={history} compact />
      </section>
      <TurnConsoleModal open={expanded} onOpenChange={setExpanded} history={history} />
    </>
  );
};

export default TurnConsole;
