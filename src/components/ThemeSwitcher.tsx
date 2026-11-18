import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types/workspace';

interface ThemeSwitcherProps {
  themeMode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  compact?: boolean;
}

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function ThemeSwitcher({
  themeMode,
  onChange,
  compact = false,
}: ThemeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Appearance theme mode"
      className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
    >
      {OPTIONS.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(mode)}
            className={`cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
              compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ThemeToggleButtonProps {
  resolvedTheme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggleButton({
  resolvedTheme,
  onToggle,
}: ThemeToggleButtonProps) {
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 whitespace-nowrap shrink-0 shadow-xs"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-[#E8A735] shrink-0" />
          <span className="hidden sm:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#2C3A57] shrink-0" />
          <span className="hidden sm:inline">Dark Mode</span>
        </>
      )}
    </button>
  );
}
