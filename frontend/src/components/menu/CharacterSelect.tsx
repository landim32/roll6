import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';

interface CharacterSelectProps {
  onManage: () => void;
  onSelectCharacter: () => void;
  onInclude: () => void;
}

/**
 * "Personagem atual": a real dropdown (unlike the campaign/map fake selects). Options are
 * "Mestre (GM)" for the master and the user's own approved characters; below a separator come
 * the actions that open the character modals (spec Q1 = A, Q2 = A).
 */
export const CharacterSelect = ({ onManage, onSelectCharacter, onInclude }: CharacterSelectProps) => {
  const { t } = useTranslation();
  const { currentCampaign, isMaster } = useCampaign();
  const { options, currentSelection, currentCharacter, select } = useCharacter();

  const label = currentSelection === 'gm'
    ? t('character.gm')
    : currentCharacter?.name ?? t('character.none');

  const onValueChange = (value: string) => {
    if (value === 'gm') {
      select('gm');
      toast.info(t('toast.characterSelected', { name: t('character.gm') }));
      return;
    }
    const option = options.find((o) => o.key === Number(value));
    if (option && option.key !== 'gm') {
      select(option.key);
      toast.info(t('toast.characterSelected', { name: option.character.name }));
    }
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={!currentCampaign}>
        <button type="button" className="form-select form-select-sm stm-fake-select stm-character-select">
          <small>{t('character.current')}</small>
          {label}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu" align="start" sideOffset={4}>
          {options.length > 0 && (
            <>
              <DropdownMenu.RadioGroup value={String(currentSelection)} onValueChange={onValueChange}>
                {options.map((option) => (
                  <DropdownMenu.RadioItem key={String(option.key)} value={String(option.key)} className="dropdown-item d-flex align-items-center gap-2">
                    {option.key === 'gm'
                      ? <CharacterAvatar name="GM" size={24} />
                      : <CharacterAvatar name={option.character.name} imageUrl={option.character.imageUrl} size={24} />}
                    <span className="flex-grow-1 text-truncate">{option.key === 'gm' ? t('character.gm') : option.character.name}</span>
                    <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator className="dropdown-divider" />
            </>
          )}
          {isMaster && <DropdownMenu.Item className="dropdown-item" onSelect={onManage}>{t('character.manage')}</DropdownMenu.Item>}
          <DropdownMenu.Item className="dropdown-item" onSelect={onSelectCharacter}>{t('character.select')}</DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onSelect={onInclude}>{t('character.include')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default CharacterSelect;
