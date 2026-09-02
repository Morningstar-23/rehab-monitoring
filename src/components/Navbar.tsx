// src/components/Navbar.tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, Users, BookOpen, SlidersHorizontal, Download, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface NavbarProps {
  activeTab: 'matrix' | 'batch' | 'journal' | 'config';
  onTabChange: (tab: 'matrix' | 'batch' | 'journal' | 'config') => void;
  onExport: () => void;
  residentCount: number;
}

const TABS: { id: NavbarProps['activeTab']; label: string; icon: React.ElementType }[] = [
  { id: 'matrix', label: 'Master Matrix', icon: FileSpreadsheet },
  { id: 'batch', label: 'Batch Session', icon: Users },
  { id: 'journal', label: 'Resident Journal', icon: BookOpen },
  { id: 'config', label: 'Config', icon: SlidersHorizontal },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onExport, residentCount }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass-dark sticky top-0 z-50 text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ rotate: -4, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.25)] flex items-center justify-center shrink-0 p-1"
          >
            <img
              src="/app-icon.png"
              alt="App Icon"
              className="w-full h-full object-contain rounded-lg"
            />
          </motion.div>
          <div>
            <h1 className="font-display text-lg tracking-wide leading-tight text-white font-medium">RehabMonitoring</h1>
            <p className="text-[11px] text-brass-300/90 tracking-wide font-medium">Rehabilitation Activity &amp; Progress Tracker</p>
          </div>
        </div>

        {/* Navigation Tabs (0ms GPU LayoutId Pill) */}
        <nav className="relative flex space-x-1 bg-black/30 p-1.5 rounded-xl border border-white/10 shadow-inner">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`relative z-10 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 select-none ${
                  isActive ? 'text-white' : 'text-sage-300 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.3)] -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 pl-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-brass-300 border border-brass-500/30 font-medium select-none whitespace-nowrap">
            {residentCount} Active Residents
          </span>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brass-300 hover:text-white hover:bg-white/10 transition-colors overflow-hidden shadow-2xs"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-amber-300"
                >
                  <Sun className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-brass-200"
                >
                  <Moon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-brass-600 to-brass-500 text-white text-sm font-medium shadow-[0_2px_10px_rgba(176,141,87,0.35)] transition-opacity hover:opacity-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
};