export function ActionLog({ items }: { items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-200">Action Log</div>
      <div className="space-y-2 text-sm text-zinc-200">
        {items.length ? (
          items.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-black/20 px-3 py-2">
              {item}
            </div>
          ))
        ) : (
          <div className="text-zinc-400">No actions yet.</div>
        )}
      </div>
    </div>
  );
}
