export function StatusBar({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center text-sm text-zinc-300">
      {text}
    </div>
  );
}
