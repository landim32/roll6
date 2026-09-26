import { useTranslation } from 'react-i18next';
import type { TurnStatus } from '../../lib/turnStatus';

/** Card circle of the turn (016): red until it moves, yellow after moving, green once it acted. */
export const TurnStatusDot = ({ status }: { status: TurnStatus }) => {
  const { t } = useTranslation();
  const label = t(`turn.status.${status}`);
  return <span className={`stm-turn-dot is-${status}`} title={label} aria-label={label} role="img" />;
};

export default TurnStatusDot;
