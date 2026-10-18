import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAnimationEditor } from '../../../hooks/useAnimationEditor';
import type { TokenInfo } from '../../../types/token';
import { animationPath, libraryPath } from '../../../lib/libraryRoutes';
import { ArrowLeftIcon } from '../../ui/icons';
import { ModelTokenSelect } from './ModelTokenSelect';

interface EditorTopBarProps {
  onTokens: (tokens: TokenInfo[]) => void;
}

/**
 * The editor's bar (086), inside the library since 089 (the library's own bar has the logo, "← Voltar para campanha"
 * and the user menu): back to the animation's page, the animation's name, the agent badge and the model select.
 */
export const EditorTopBar = ({ onTokens }: EditorTopBarProps) => {
  const { t } = useTranslation();
  const { state, connected, tokenId, setToken } = useAnimationEditor();
  const agent = state.agent;
  const backTo = state.animation ? animationPath(state.animation.animationId) : libraryPath('animations');
  const badge = !connected
    ? { cls: 'text-bg-secondary', text: t('editor.offline') }
    : !agent.connected
      ? { cls: 'text-bg-secondary', text: t('editor.agent.disconnected') }
      : agent.busy
        ? { cls: 'text-bg-warning', text: t('editor.agent.busy', { machine: agent.machine ?? '' }) }
        : { cls: 'text-bg-success', text: t('editor.agent.connected', { machine: agent.machine ?? '' }) };

  return (
    <header className="stm-editor-bar">
      <Link to={backTo} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center" title={t('editor.back')} aria-label={t('editor.back')}>
        <ArrowLeftIcon size={14} />
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
