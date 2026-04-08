'use client';

type RulesModalProps = {
  open: boolean;
  title: string;
  rules: string[];
  onClose: () => void;
};

export function RulesModal({ open, title, rules, onClose }: RulesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-semibold">{title} Rules</h2>
          <button
            className="rounded-lg border border-white/10 px-3 py-1 text-sm hover:bg-white/5"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <ol className="space-y-3 text-sm leading-6 text-zinc-200">
            {rules.map((rule, i) => (
              <li key={i} className="rounded-xl bg-white/5 px-4 py-3">
                <span className="mr-2 font-semibold text-emerald-300">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
