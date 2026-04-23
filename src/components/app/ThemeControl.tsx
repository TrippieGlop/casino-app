'use client';

import { useAppSettings, type AccentTheme } from '@/components/app/AppProvider';

const themes: AccentTheme[] = ['emerald', 'blue', 'violet', 'rose', 'amber', 'cyan', 'lime', 'orange', 'pink', 'gold', 'neon'];

export function ThemeControl() {
  const { accentTheme, setAccentTheme } = useAppSettings();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-sm font-medium text-zinc-200">Accent Theme</div>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => (
          <button
            key={theme}
            onClick={() => setAccentTheme(theme)}
            className={`rounded-lg px-3 py-2 text-sm capitalize ${
              accentTheme === theme
                ? 'bg-white text-black'
                : 'border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {theme}
          </button>
        ))}
      </div>
    </div>
  );
}
