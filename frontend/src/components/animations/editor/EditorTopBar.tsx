import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAnimationEditor } from '../../../hooks/useAnimationEditor';
import type { TokenInfo } from '../../../types/token';
import { animationPath, libraryPath } from '../../../lib/libraryRoutes';
import { ArrowLeftIcon } from '../../ui/icons';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { ModelTokenSelect } from './ModelTokenSelect';

interface EditorTopBarProps {
  onTokens: (tokens: TokenInfo[]) => void;
}

/**
 * The editor's bar (086), inside the library since 089 (the library's own bar has the logo, "← Voltar para campanha"
 * and the user menu): back to the animation's page, the animation's name, the agent badge, the model select and,
 * since 091, "Salvar" / "Descartar" with the "Alterações não salvas" badge — nothing reaches the library before
 * "Salvar".
 */
export const EditorTopBar = ({ onTokens }: EditorTopBarProps) => {
  const { t } = useTranslation();
  const { state, connected, tokenId, setToken, dirty, saving, save, discard } = useAnimationEditor();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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
      {state.savedChanged && <span className="badge text-bg-info">{t('editor.save.savedChanged')}</span>}
      {dirty && <span className="badge text-bg-warning">{t('editor.save.dirty')}</span>}
      <span className="flex-grow-1" />
      <ModelTokenSelect tokenId={tokenId} onChange={setToken} onTokens={onTokens} />
      {state.animation && (
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!dirty && !state.savedChanged}
            onClick={() => setConfirmDiscard(true)}>
            {t('editor.save.discard')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={() => { void save(); }}
            title={t('editor.save.shortcut')}>
            {saving && <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />}
            {t('editor.save.button')}
          </button>
        </div>
      )}
      <ConfirmModal
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={t('editor.save.discardTitle')}
        message={t('editor.save.discardMessage')}
        confirmLabel={t('editor.save.discard')}
        onConfirm={() => { discard(); setConfirmDiscard(false); }}
        danger
      />
    </header>
  );
};

export default EditorTopBar;
