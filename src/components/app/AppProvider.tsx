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
  | 'pink'
  | 'gold'
  | 'neon';

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
  theme: AccentTheme;
  soundOn: boolean;
  readyAutoStartSeconds: number;
  displayNameError: string;
  setDifficulty: (value: Difficulty) => void;
  setLocalPlay: (value: boolean) => void;
  setTheme: (value: AccentTheme) => void;
  setSoundOn: (value: boolean) => void;
  setReadyAutoStartSeconds: (value: number) => void;
  setUsername: (value: string) => void;
  addChips: (amount: number) => void;
  spendChips: (amount: number) => boolean;
  canAfford: (amount: number) => boolean;
  resetBankroll: () => void;
  recordWin: (amountWon: number, wager: number) => void;
  claimDailyRewardIfEligible: () => number;
};

const STORAGE_KEY = 'card-hub-app-state-v7';
const AppContext = createContext<AppContextType | null>(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const blockedWords = ['fuck', 'shit', 'bitch', 'asshole', 'motherfucker', 'dick', 'pussy'];

function validateDisplayName(value: string) {
  const trimmed = value.trim();

  if (trimmed.length > 24) return 'Display name must be 24 characters or fewer.';
  if (/[<>\\{}[\]|`]/.test(trimmed)) return 'Display name contains unsupported characters.';
  if (blockedWords.some((word) => trimmed.toLowerCase().includes(word))) return 'That display name is not allowed.';
  return '';
}

const defaultAccount: Account = {
  username: '',
  bankroll: 1000,
  streak: 0,
  lastLoginDate: null,
  session: { wagered: 0, won: 0, lost: 0, profit: 0 },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account>(defaultAccount);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [localPlay, setLocalPlay] = useState(false);
  const [theme, setTheme] = useState<AccentTheme>('emerald');
  const [soundOn, setSoundOn] = useState(true);
  const [readyAutoStartSeconds, setReadyAutoStartSeconds] = useState(15);
  const [displayNameError, setDisplayNameError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.account) setAccount(parsed.account);
      if (parsed.difficulty) setDifficulty(parsed.difficulty);
      if (typeof parsed.localPlay === 'boolean') setLocalPlay(parsed.localPlay);
      if (parsed.theme) setTheme(parsed.theme);
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
        theme,
        soundOn,
        readyAutoStartSeconds,
      })
    );
  }, [account, difficulty, localPlay, theme, soundOn, readyAutoStartSeconds]);

  const value = useMemo<AppContextType>(() => ({
    account,
    difficulty,
    localPlay,
    theme,
    soundOn,
    readyAutoStartSeconds,
    displayNameError,
    setDifficulty,
    setLocalPlay,
    setTheme,
    setSoundOn,
    setReadyAutoStartSeconds,
    setUsername: (value) => {
      const error = validateDisplayName(value);
      if (error) {
        setDisplayNameError(error);
        return;
      }
      setDisplayNameError('');
      setAccount((a) => ({ ...a, username: value }));
    },
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
    canAfford: (amount) => account.bankroll >= Math.max(0, amount),
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
        if (a.lastLoginDate === today) return a;
        const streak = a.lastLoginDate === yesterdayKey() ? a.streak + 1 : 1;
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
  }), [account, difficulty, localPlay, theme, soundOn, readyAutoStartSeconds, displayNameError]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppProvider');
  return ctx;
}
