import { useContext } from 'react';
import WeaponContext from '../Contexts/WeaponContext';

/** Access the Weapon context (082). Throws if used outside WeaponProvider. */
export const useWeapon = () => {
  const context = useContext(WeaponContext);
  if (!context) throw new Error('useWeapon must be used within a WeaponProvider');
  return context;
};

export default useWeapon;
