import { useEffect, useState } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const ls = localStorage.getItem('theme');
  if (ls === 'light' || ls === 'dark') return ls;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? <FiSun className="text-primary-400" /> : <FiMoon className="text-primary-600" />}
    </button>
  );
}
