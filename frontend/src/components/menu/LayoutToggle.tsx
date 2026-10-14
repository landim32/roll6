import { useTranslation } from 'react-i18next';
import { ChatDotsIcon, LayoutSplitIcon, MapIcon } from '../ui/icons';
import { useChat } from '../../hooks/useChat';
import { LAYOUT_MODE } from '../../lib/layoutMode';
import type { LayoutMode } from '../../lib/layoutMode';

const OPTIONS: { mode: LayoutMode; key: string }[] = [
  { mode: LAYOUT_MODE.map, key: 'layout.map' },
  { mode: LAYOUT_MODE.split, key: 'layout.split' },
  { mode: LAYOUT_MODE.chat, key: 'layout.chat' },
];

/** Map only · map over chat · chat only (041). */
export const LayoutToggle = () => {
  const { t } = useTranslation();
  const { canRead, layoutMode, setLayoutMode } = useChat();
  if (!canRead) return null;

  return (
    <div className="btn-group stm-layout-toggle" role="group" aria-label={t('layout.label')}>
      {OPTIONS.map(({ mode, key }) => (
        <button key={mode} type="button" aria-pressed={layoutMode === mode} title={t(key)} aria-label={t(key)}
          className={`btn ${layoutMode === mode ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setLayoutMode(mode)}>
          {mode === LAYOUT_MODE.map && <MapIcon size={16} />}
          {mode === LAYOUT_MODE.split && <LayoutSplitIcon size={16} className="stm-rotate-90" />}
          {mode === LAYOUT_MODE.chat && <ChatDotsIcon size={16} />}
        </button>
      ))}
    </div>
  );
};

export default LayoutToggle;
