import { useTranslation } from 'react-i18next';
import { POSTURE } from '../../types/mapToken';
import type { Posture } from '../../types/mapToken';

/** Badge of a character/NPC that is down or out of combat (031); nothing while standing. */
export const PostureBadge = ({ posture }: { posture: Posture | null }) => {
  const { t } = useTranslation();
  if (posture === null || posture === POSTURE.standing) return null;
  const variant = posture === POSTURE.outOfCombat ? 'text-bg-secondary' : 'text-bg-warning';
  return <span className={`badge ${variant}`}>{t(`posture.${posture}`)}</span>;
};

export default PostureBadge;
