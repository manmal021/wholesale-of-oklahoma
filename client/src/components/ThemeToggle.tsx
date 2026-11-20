import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../lib/useTheme';

interface ThemeToggleProps {
  variant?: 'sticky-pill' | 'header-button' | 'mobile-row';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'sticky-pill',
  className = '',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  // ── Variant 1: Persistent Floating Sticky Widget ──
  if (variant === 'sticky-pill') {
    return (
      <div
        className={`fixed bottom-6 left-4 sm:left-6 z-40 select-none ${className}`}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
          title={isDark ? 'Active: Dark Obsidian & Amber — Click for Light' : 'Active: Light Slate — Click for Dark'}
          className={`group relative flex items-center gap-2.5 px-3 sm:px-3.5 py-2 rounded-full cursor-pointer transition-all duration-300 shadow-xl border backdrop-blur-xl ${
            isDark
              ? 'bg-[#111827]/95 hover:bg-[#162032] border-[#FF6B00]/40 text-slate-100 shadow-[0_4px_24px_rgba(255,107,0,0.22)]'
              : 'bg-white/95 hover:bg-slate-50 border-slate-200 text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
          } hover:scale-105 active:scale-95`}
        >
          {/* Animated Icon Avatar Circle */}
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isDark
                ? 'bg-[#FF6B00]/20 text-[#FF7A1A] border border-[#FF6B00]/40 group-hover:rotate-12 group-hover:scale-110'
                : 'bg-amber-100 text-amber-600 border border-amber-200 group-hover:rotate-45 group-hover:scale-110'
            }`}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform fill-[#FF7A1A]/20" />
            ) : (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform fill-amber-500/20" />
            )}
          </div>

          {/* Theme Label & Color Combo Indicator */}
          <div className="flex flex-col text-left leading-none pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold tracking-tight">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              {/* Dual-color Swatch Pill showing color combo */}
              <div
                className="flex items-center rounded-full p-0.5 border border-slate-300/60 dark:border-slate-700/80 bg-black/10 dark:bg-black/30"
                title={isDark ? 'Theme Combo: Midnight Obsidian + Warm Amber' : 'Theme Combo: Slate White + Brand Orange'}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isDark ? 'bg-[#0A0E17] ring-1 ring-white/20' : 'bg-slate-100'
                  }`}
                />
                <span className="w-2 h-2 rounded-full bg-[#FF6B00] -ml-0.5" />
              </div>
            </div>

            <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <Palette className="w-2.5 h-2.5 text-[#FF6B00]" />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {isDark ? 'Obsidian & Amber' : 'Clean Slate'}
              </span>
            </div>
          </div>

          {/* Sliding Pill Indicator */}
          <div
            className={`w-8 h-4 sm:w-9 sm:h-4.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
              isDark ? 'bg-[#FF6B00] justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white shadow-xs transition-all duration-300" />
          </div>
        </button>
      </div>
    );
  }

  // ── Variant 2: Compact Top Header Button ──
  if (variant === 'header-button') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={toggleTheme}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme (Obsidian & Amber)'}
        className={`flex items-center gap-1.5 text-xs font-bold transition-all duration-300 cursor-pointer px-3 py-2 rounded-full border shadow-xs select-none ${
          isDark
            ? 'bg-[#162032] hover:bg-[#1E293B] text-slate-100 border-[#FF6B00]/40 hover:border-[#FF6B00]'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-[#FF6B00]'
        } hover:scale-105 active:scale-95 ${className}`}
      >
        {isDark ? (
          <>
            <Moon className="w-3.5 h-3.5 text-[#FF7A1A] fill-[#FF7A1A]/20" />
            <span className="hidden sm:inline">Dark</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span className="hidden sm:inline">Light</span>
          </>
        )}
      </button>
    );
  }

  // ── Variant 3: Mobile Navigation Drawer Row ──
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
        isDark
          ? 'bg-[#162032] border-slate-700/80 text-white'
          : 'bg-slate-50 border-slate-200 text-slate-900'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-[#FF6B00]/20 text-[#FF7A1A]' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-xs font-bold">
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {isDark ? 'Obsidian & Warm Amber Combo' : 'Classic White & Slate'}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
          isDark
            ? 'bg-[#FF6B00] text-white shadow-sm'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        <span>Toggle</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
