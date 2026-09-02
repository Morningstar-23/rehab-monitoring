// src/components/Navbar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Users,
  BookOpen,
  SlidersHorizontal,
  Download,
  Sun,
  Moon,
  Check,
  Loader2
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/NotificationProvider';
import type { ExportResult } from '../utils/excelExport';
import packageJson from '../../package.json';

interface NavbarProps {
  activeTab: 'matrix' | 'batch' | 'journal' | 'config';
  onTabChange: (tab: 'matrix' | 'batch' | 'journal' | 'config') => void;
  onExport: () => Promise<ExportResult | void> | void;
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
  const toast = useToast();
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleExportClick = async () => {
    if (exportState === 'loading') return;
    setExportState('loading');

    try {
      const res = await onExport();

      if (res && res.cancelled) {
        setExportState('idle');
        toast.info('Export was cancelled.');
        return;
      }

      if (res && res.success) {
        setExportState('success');
        const displayLocation = res.path ? res.path : res.filename;
        toast.success(`Saved: ${displayLocation}`, 'Excel Export Complete');

        setTimeout(() => {
          setExportState('idle');
        }, 3000);
        return;
      }

      setExportState('success');
      toast.success('Matrix data successfully exported to Excel.', 'Excel Export Complete');
      setTimeout(() => {
        setExportState('idle');
      }, 3000);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportState('idle');
      toast.error(err?.message || 'Failed to export Excel spreadsheet.', 'Export Error');
    }
  };

  return (
    <header className="glass-dark sticky top-0 z-50 text-white transition-colors duration-200 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-6 h-17 flex items-center justify-between">

        {/* Brand & Version Badge */}
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ rotate: -4, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.25)] flex items-center justify-center shrink-0 p-1"
          >
            <img
              src="/app-icon.png"
              alt="RehabMonitoring"
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.svg';
              }}
            />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg tracking-wide leading-tight text-white font-medium">
                RehabMonitoring
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-brass-300 border border-brass-500/20 select-none">
                v{packageJson.version}
              </span>
            </div>
            <p className="text-[11px] text-brass-300/90 tracking-wide font-medium">
              Rehabilitation Activity &amp; Progress Tracker
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="relative flex space-x-1 bg-black/30 p-1.5 rounded-xl border border-white/10 shadow-inner">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onTabChange(id)}
                className={`relative z-10 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 select-none cursor-pointer ${
                  isActive ? 'text-white font-semibold' : 'text-sage-300 hover:text-white'
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
              </motion.button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 pl-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-brass-300 border border-brass-500/30 font-medium select-none whitespace-nowrap">
            {residentCount} Active Residents
          </span>

          {/* Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brass-300 hover:text-white hover:bg-white/10 transition-colors overflow-hidden shadow-2xs cursor-pointer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-amber-300"
                >
                  <Sun className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: -45 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center text-brass-200"
                >
                  <Moon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Export Excel Button with Click Feedback & Animations */}
          <motion.button
            whileHover={{ scale: exportState === 'loading' ? 1 : 1.03 }}
            whileTap={{ scale: exportState === 'loading' ? 1 : 0.95 }}
            onClick={handleExportClick}
            disabled={exportState === 'loading'}
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md select-none cursor-pointer overflow-hidden ${
              exportState === 'success'
                ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                : 'bg-linear-to-r from-brass-600 to-brass-500 hover:from-brass-500 hover:to-brass-400 text-white shadow-brass-900/20'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {exportState === 'loading' ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center space-x-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Preparing...</span>
                </motion.span>
              ) : exportState === 'success' ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, type: 'spring' }}
                  className="flex items-center space-x-2"
                >
                  <Check className="w-4 h-4 stroke-3 text-white" />
                  <span>Exported!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
};