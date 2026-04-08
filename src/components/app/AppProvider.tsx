'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AccentTheme =
  | 'emerald'
  | 'blue'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'lime'
  | 'orange'
  | 'pink';

type SessionStats = {
  wagered: number;
  won: number;
  lost: number;
  profit: number;
};

type Account = {
  username: string;
  bankroll: number;
  streak: number;
  lastLoginDate: string | null;
  session: SessionStats;
};

type AppContextType = {
  account: Account;
  difficulty: Difficulty;
  localPlay: boolean;
  accentTheme: AccentTheme;
  soundOn: boolean;
  readyAutoStartSeconds: number;
  setDifficulty: (value: Difficulty) => void;
  setLocalPlay: (value: boolean) => void;
  setAccentTheme: (value: AccentTheme) => void;
  setSoundOn: (value: boolean) => void;
  setReadyAutoStartSeconds: (value: number) => void;
  setUsername: (value: string) => void;
  addChips: (amount: number) => void;
  spendChips: (amount: number) => boolean;
  resetBankroll: () => void;
  recordWin: (amountWon: number, wager: number) => void;
  claimDailyRewardIfEligible: () => number;
};

const STORAGE_KEY = 'card-hub-app-state-v2';
const AppContext = createContext<AppContextType | null>(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const defaultAccount: Account = {
  username: 'Player 1',
  bankroll: 1000,
  streak: 0,
  lastLoginDate: null,
  session: { wagered: 0, won: 0, lost: 0, profit: 0 },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account>(defaultAccount);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [localPlay, setLocalPlay] = useState(false);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>('emerald');
  const [soundOn, setSoundOn] = useState(true);
  const [readyAutoStartSeconds, setReadyAutoStartSeconds] = useState(30);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.account) setAccount(parsed.account);
      if (parsed.difficulty) setDifficulty(parsed.difficulty);
      if (typeof parsed.localPlay === 'boolean') setLocalPlay(parsed.localPlay);
      if (parsed.accentTheme) setAccentTheme(parsed.accentTheme);
      if (typeof parsed.soundOn === 'boolean') setSoundOn(parsed.soundOn);
      if (typeof parsed.readyAutoStartSeconds === 'number') setReadyAutoStartSeconds(parsed.readyAutoStartSeconds);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        account,
        difficulty,
        localPlay,
        accentTheme,
        soundOn,
        readyAutoStartSeconds,
      })
    );
  }, [account, difficulty, localPlay, accentTheme, soundOn, readyAutoStartSeconds]);

  const value = useMemo<AppContextType>(() => ({
    account,
    difficulty,
    localPlay,
    accentTheme,
    soundOn,
    readyAutoStartSeconds,
    setDifficulty,
    setLocalPlay,
    setAccentTheme,
    setSoundOn,
    setReadyAutoStartSeconds,
    setUsername: (value) => setAccount((a) => ({ ...a, username: value || 'Player 1' })),
    addChips: (amount) =>
      setAccount((a) => ({ ...a, bankroll: a.bankroll + Math.max(0, amount) })),
    spendChips: (amount) => {
      const safe = Math.max(0, amount);
      if (account.bankroll < safe) return false;
      setAccount((a) => ({
        ...a,
        bankroll: a.bankroll - safe,
        session: {
          ...a.session,
          wagered: a.session.wagered + safe,
          lost: a.session.lost + safe,
          profit: a.session.profit - safe,
        },
      }));
      return true;
    },
    resetBankroll: () =>
      setAccount((a) => ({
        ...a,
        bankroll: 1000,
        session: { wagered: 0, won: 0, lost: 0, profit: 0 },
      })),
    recordWin: (amountWon, wager) =>
      setAccount((a) => ({
        ...a,
        bankroll: a.bankroll + Math.max(0, amountWon),
        session: {
          ...a.session,
          won: a.session.won + Math.max(0, amountWon),
          profit: a.session.profit + Math.max(0, amountWon) - Math.max(0, wager),
        },
      })),
    claimDailyRewardIfEligible: () => {
      let reward = 0;
      setAccount((a) => {
        const today = todayKey();
        if (a.lastLoginDate == today) return a;
        const streak = a.lastLoginDate == yesterdayKey() ? a.streak + 1 : 1;
        reward = 100 + (streak - 1) * 25;
        return {
          ...a,
          bankroll: a.bankroll + reward,
          streak,
          lastLoginDate: today,
        };
      });
      return reward;
    },
  }), [account, difficulty, localPlay, accentTheme, soundOn, readyAutoStartSeconds]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppProvider');
  return ctx;
}
