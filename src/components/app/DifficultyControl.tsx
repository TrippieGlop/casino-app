'use client';

import { useAppSettings, type Difficulty } from '@/components/app/AppProvider';

const levels: Difficulty[] = ['easy', 'medium', 'hard'];

export function DifficultyControl() {
  const { difficulty, setDifficulty } = useAppSettings();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-sm font-medium text-zinc-200">CPU Difficulty</div>
      <div className="flex gap-2">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setDifficulty(level)}
            className={`rounded-lg px-3 py-2 text-sm capitalize transition ${
              difficulty === level
                ? 'bg-emerald-500 text-black'
                : 'border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
