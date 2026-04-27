'use client';

import { useEffect, useRef } from 'react';

export function useTableExitCleanup(cleanup: () => void, enabled = true) {
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      try {
        cleanupRef.current();
      } catch {}
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.('a') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute('href') || '';
      if (href === '/' || href === '/hub' || href.includes('/hub')) {
        run();
      }
    };

    document.addEventListener('click', clickHandler, true);
    window.addEventListener('pagehide', run);
    window.addEventListener('beforeunload', run);

    return () => {
      document.removeEventListener('click', clickHandler, true);
      window.removeEventListener('pagehide', run);
      window.removeEventListener('beforeunload', run);
    };
  }, [enabled]);
}
