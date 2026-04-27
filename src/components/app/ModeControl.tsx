'use client';

import { useAppSettings } from '@/components/app/AppProvider';

export function ModeControl() {
  const {
    localPlay,
    setLocalPlay,
    soundOn,
    setSoundOn,
    readyAutoStartSeconds,
    setReadyAutoStartSeconds,
  } = useAppSettings();

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-medium text-zinc-200">Session Settings</div>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
        <span>Multiplayer</span>
        <input
          type="checkbox"
          checked={localPlay}
          onChange={(e) => setLocalPlay(e.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => setSoundOn(e.target.checked)}
        />
      </label>

      <label className="grid gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
        <span>Auto-start Timer</span>
        <input
          type="range"
          min={5}
          max={30}
          step={5}
          value={readyAutoStartSeconds}
          onChange={(e) => setReadyAutoStartSeconds(Number(e.target.value))}
        />
        <span className="text-xs text-zinc-400">{readyAutoStartSeconds} seconds</span>
      </label>
    </div>
  );
}
