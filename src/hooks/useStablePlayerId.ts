'use client';

import { useMemo } from 'react';

export function useStablePlayerId(gameKey: string, displayName: string) {
  return useMemo(() => {
    if (typeof window === 'undefined') return `${gameKey}-server`;

    const cleanName = displayName.trim() || 'Guest';
    const storageKey = `cardhub:${gameKey}:playerId`;
    const nameKey = `cardhub:${gameKey}:displayName`;

    let id = window.localStorage.getItem(storageKey);
    const savedName = window.localStorage.getItem(nameKey);

    if (!id || savedName !== cleanName) {
      id = `${gameKey}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(storageKey, id);
      window.localStorage.setItem(nameKey, cleanName);
    }

    return id;
  }, [gameKey, displayName]);
}
