"use client";

import Link from "next/link";

interface Props {
  /** Where the button links to. Defaults to the main games menu. */
  href?: string;
  /** Optional label override. Defaults to "← Main Menu". */
  label?: string;
  /** Visual variant. Default suits dark game backgrounds. */
  variant?: "dark" | "light";
}

export function BackButton({
  href = "/",
  label = "← Main Menu",
  variant = "dark",
}: Props) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all";

  const styles = {
    dark:  "bg-white/10 text-white hover:bg-white/20 border border-white/20",
    light: "bg-black/10 text-gray-800 hover:bg-black/20 border border-black/10",
  };

  return (
    <Link href={href} className={`${base} ${styles[variant]}`}>
      {label}
    </Link>
  );
}
