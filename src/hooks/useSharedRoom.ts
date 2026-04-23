'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '@/lib/realtime/socket';

function mergeState<T extends Record<string, any>>(base: T, incoming: any): T {
  if (!incoming || typeof incoming !== 'object') return base;
  return { ...base, ...incoming };
}

export function useSharedRoom<T extends Record<string, any>>(roomId: string, playerName: string, initialState: T) {
  const [players, setPlayers] = useState<Array<{ socketId: string; playerName: string }>>([]);
  const [sharedState, setSharedState] = useState<T>(initialState);
  const joinedRef = useRef(false);

  const stableInitial = useMemo(() => initialState, [initialState]);

  useEffect(() => {
    const socket = getSocket();
    if (joinedRef.current) return;
    joinedRef.current = true;

    socket.emit('room:join', { roomId, playerName });

    const onRoomUpdate = (room: any) => {
      setPlayers(room?.players || []);
      setSharedState((prev) => mergeState(stableInitial, room?.state || prev));
    };

    const onRoomState = (state: T) => {
      setSharedState((prev) => mergeState(stableInitial, state || prev));
    };

    socket.on('room:update', onRoomUpdate);
    socket.on('room:state', onRoomState);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('room:update', onRoomUpdate);
      socket.off('room:state', onRoomState);
      joinedRef.current = false;
    };
  }, [roomId, playerName, stableInitial]);

  function pushState(nextState: T) {
    const merged = mergeState(stableInitial, nextState);
    setSharedState(merged);
    getSocket().emit('room:setState', { roomId, state: merged });
  }

  return { players, sharedState, pushState };
}
