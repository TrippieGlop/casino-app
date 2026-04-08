'use client';

type Props = {
  open: boolean;
  title: string;
  rules: string[];
  onClose: () => void;
};

export function RulesModal({ open, title, rules, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="max-w-lg rounded-2xl bg-zinc-900 p-6 text-white">
        <h2 className="text-xl font-bold mb-4">{title} Rules</h2>

        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={i}>
              {i + 1}. {rule}
            </li>
          ))}
        </ul>

        <button
          className="mt-6 rounded-lg bg-emerald-500 px-4 py-2 text-black"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
