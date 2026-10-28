import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { LIGHT_RADII } from '../../lib/isoLight';
import { CheckIcon } from '../ui/icons';

/**
 * How far the light of the isometric view (103) reaches around the focused character: 3 to 6 hexes. Only this viewer's
 * view changes; the choice is remembered on this device (`lib/isoLight`).
 */
interface IsoRadiusSelectProps {
  radius: number;
  onRadius: (hexes: number) => void;
}

const IsoRadiusSelect = ({ radius, onRadius }: IsoRadiusSelectProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="btn btn-sm btn-secondary dropdown-toggle" title={t('iso.radiusTitle')}
          aria-label={t('iso.radiusTitle')}>
          {t('iso.radius', { count: radius })}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-popper-menu" side="top" align="center" sideOffset={4}>
          <DropdownMenu.RadioGroup value={String(radius)} onValueChange={(value) => onRadius(Number(value))}>
            {LIGHT_RADII.map((hexes) => (
              <DropdownMenu.RadioItem key={hexes} value={String(hexes)}
                className="dropdown-item d-flex align-items-center gap-2">
                <span className="stm-menu-check">
                  <DropdownMenu.ItemIndicator><CheckIcon size={14} /></DropdownMenu.ItemIndicator>
                </span>
                {t('iso.radiusItem', { count: hexes })}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default IsoRadiusSelect;
