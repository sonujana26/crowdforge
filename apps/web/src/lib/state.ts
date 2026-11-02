import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { ContributionRejection, RoundState } from '@crowdforge/shared';
export const socket = io({ autoConnect: false });
export function useGameState() {
  const [state, setState] = useState<RoundState | null>(null);
  const [connected, setConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [rejection, setRejection] = useState<ContributionRejection | null>(null);
  useEffect(() => {
    const snapshot = (value: RoundState) => {
      setState(value);
      setOffset(value.serverNow - Date.now());
    };
    const connect = () => {
      setConnected(true);
      socket.emit('client:ready');
    };
    const disconnect = () => {
      setConnected(false);
      setRejection(null);
    };
    const reject = (feedback: ContributionRejection) => setRejection(feedback);
    socket.on('state:snapshot', snapshot);
    socket.on('connect', connect);
    socket.on('disconnect', disconnect);
    socket.on('contribution:rejected', reject);
    socket.connect();
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => {
      clearInterval(timer);
      socket.off('state:snapshot', snapshot);
      socket.off('connect', connect);
      socket.off('disconnect', disconnect);
      socket.off('contribution:rejected', reject);
      socket.disconnect();
    };
  }, []);
  const seconds =
    state?.phase === 'PAUSED'
      ? Math.ceil((state.remainingMs || 0) / 1000)
      : Math.max(0, Math.ceil(((state?.phaseEndsAt || now + offset) - now - offset) / 1000));

  useEffect(() => {
    if (!rejection) return;
    const timer = setTimeout(() => setRejection(null), 8000);
    return () => clearTimeout(timer);
  }, [rejection]);
  const feedback =
    rejection?.roundId === state?.roundId &&
    (rejection?.source === 'demo') === state?.demoMode &&
    state?.phase === 'CONTRIBUTION'
      ? rejection
      : null;
  return { state, connected, seconds, feedback };
}
