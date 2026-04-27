'use client';

import { useEffect, useRef } from 'react';

export function useLeaveTableCleanup(cleanup: () => void, enabled = true) {
  const cleanupRef = useRef(cleanup);
  const ranRef = useRef(false);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (ranRef.current) return;
      ranRef.current = true;
      try {
        cleanupRef.current();
      } catch {}
    };

    window.addEventListener('pagehide', run);
    window.addEventListener('beforeunload', run);

    return () => {
      window.removeEventListener('pagehide', run);
      window.removeEventListener('beforeunload', run);
    };
  }, [enabled]);
}
