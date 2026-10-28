import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import type { FocusCandidate } from '../../lib/isoFocus';
import { CheckIcon } from '../ui/icons';

/**
 * Who the isometric view (103) follows: every character of the party with a piece on the map, and — for a player whose
 * own character is there — the way back to it. A piece in the dark cannot be clicked, so this list is the other way
 * to move the focus. Only this viewer's camera and light change.
 */
interface IsoFocusSelectProps {
  candidates: readonly FocusCandidate[];
  focus: number | null;
  /** The viewer's own character on the map, if any. */
  own: FocusCandidate | null;
  onFocus: (campaignCharacterId: number) => void;
}

const IsoFocusSelect = ({ candidates, focus, own, onFocus }: IsoFocusSelectProps) => {
  const { t } = useTranslation();
  const current = candidates.find((candidate) => candidate.campaignCharacterId === focus);
  const label = current ? t('iso.focus', { name: current.name }) : t('iso.noFocus');

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="btn btn-sm btn-secondary dropdown-toggle" title={t('iso.focusTitle')}
          aria-label={t('iso.focusTitle')} disabled={candidates.length === 0}>
          {label}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-popper-menu" side="top" align="center" sideOffset={4}>
          {candidates.map((candidate) => (
            <DropdownMenu.Item key={candidate.campaignCharacterId}
              className="dropdown-item d-flex align-items-center gap-2" onSelect={() => onFocus(candidate.campaignCharacterId)}>
              <span className="stm-menu-check">
                {candidate.campaignCharacterId === focus && <CheckIcon size={14} />}
              </span>
              {candidate.name}
            </DropdownMenu.Item>
          ))}
          {own && own.campaignCharacterId !== focus && (
            <>
              <DropdownMenu.Separator className="dropdown-divider" />
              <DropdownMenu.Item className="dropdown-item" onSelect={() => onFocus(own.campaignCharacterId)}>
                {t('iso.focusMine')}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default IsoFocusSelect;
