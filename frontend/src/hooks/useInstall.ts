import { useContext } from 'react';
import InstallContext from '../Contexts/InstallContext';

/** Access the Install context. Throws if used outside InstallProvider. */
export const useInstall = () => {
  const context = useContext(InstallContext);
  if (!context) throw new Error('useInstall must be used within an InstallProvider');
  return context;
};

export default useInstall;
