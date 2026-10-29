import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationStore } from '../store/navigation.store';

export function NavigationTracker() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (navigationType === 'PUSH') useNavigationStore.getState().push();
    else if (navigationType === 'POP') useNavigationStore.getState().pop();
    // REPLACE doesn't change how many in-app entries are behind us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}
