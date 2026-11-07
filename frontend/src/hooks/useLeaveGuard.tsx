import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { LeaveGuard } from '../components/library/LeaveGuard';
import { usePendingChanges } from './usePendingChanges';

/**
 * The guard of a library page with unsaved changes (087): while `dirty`, leaving it inside the site — the left nav,
 * "← Voltar para campanha", the user menu, a link, the browser's back/forward — asks "Descartar as alterações?", and
 * the browser warns on reload or close (110: through `usePendingChanges`, which also makes "Atualizar" ask). Returns the
 * dialog to render in the page.
 */
export const useLeaveGuard = (dirty: boolean) => {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);

  usePendingChanges('leave-guard:', dirty);

  // A guard left blocked when the page became clean lets the navigation through.
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty) blocker.proceed();
  }, [blocker, dirty]);

  return (
    <LeaveGuard
      open={blocker.state === 'blocked'}
      onDiscard={() => blocker.proceed?.()}
      onStay={() => blocker.reset?.()}
    />
  );
};

export default useLeaveGuard;
