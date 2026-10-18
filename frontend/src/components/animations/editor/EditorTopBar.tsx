import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAnimationEditor } from '../../../hooks/useAnimationEditor';
import type { TokenInfo } from '../../../types/token';
import { BrandLogo } from '../../ui/BrandLogo';
import { ModelTokenSelect } from './ModelTokenSelect';

interface EditorTopBarProps {
  onTokens: (tokens: TokenInfo[]) => void;
}

/** The only thing besides the editor on the page (086): the logo, the animation's name, the agent badge and the model select. */
export const EditorTopBar = ({ onTokens }: EditorTopBarProps) => {
  const { t } = useTranslation();
  const { state, connected, tokenId, setToken } = useAnimationEditor();
  const agent = state.agent;
  const badge = !connected
    ? { cls: 'text-bg-secondary', text: t('editor.offline') }
    : !agent.connected
      ? { cls: 'text-bg-secondary', text: t('editor.agent.disconnected') }
      : agent.busy
        ? { cls: 'text-bg-warning', text: t('editor.agent.busy', { machine: agent.machine ?? '' }) }
        : { cls: 'text-bg-success', text: t('editor.agent.connected', { machine: agent.machine ?? '' }) };

  return (
    <header className="stm-editor-bar">
      <Link to="/" className="stm-editor-brand" title={t('editor.back')} aria-label={t('editor.back')}>
        <span className="d-none d-md-inline"><BrandLogo variant="horizontal" height={32} /></span>
        <span className="d-md-none"><BrandLogo variant="symbol" height={28} /></span>
      </Link>
      <h1 className="stm-editor-title text-truncate" title={state.animation?.name ?? ''}>{state.animation?.name ?? t('editor.title')}</h1>
      <span className={`badge ${badge.cls} stm-editor-agent`} title={agent.connected ? undefined : t('editor.agent.hint')}>
        {badge.text}
      </span>
      <span className="flex-grow-1" />
      <ModelTokenSelect tokenId={tokenId} onChange={setToken} onTokens={onTokens} />
    </header>
  );
};

export default EditorTopBar;
