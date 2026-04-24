'use client';

import { useEffect, useState } from 'react';

export function useAccentGlow() {
  const [accentGlow, setAccentGlow] = useState('rgba(16,185,129,0.28)');

  useEffect(() => {
    const update = () => {
      const cardHub = Array.from(document.querySelectorAll('button, a'))
        .find((el) => String((el as HTMLElement).textContent || '').includes('Card Hub')) as HTMLElement | undefined;

      const source = cardHub || document.documentElement;
      const color = window.getComputedStyle(source).backgroundColor || 'rgb(16,185,129)';

      const rgba = color.startsWith('rgb(')
        ? color.replace('rgb(', 'rgba(').replace(')', ', 0.28)')
        : color.startsWith('rgba(')
          ? color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0.28)')
          : 'rgba(16,185,129,0.28)';

      setAccentGlow(rgba);
      document.documentElement.style.setProperty('--accent-glow', rgba);
    };

    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, []);

  return accentGlow;
}
