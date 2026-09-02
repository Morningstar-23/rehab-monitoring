// src/components/ConfigView.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident } from '../types';
import { useSessionStore } from '../utils/useSessionStore';
import { CategoriesModulesTab } from './config/CategoriesModulesTab';
import { ResidentsTab } from './config/ResidentsTab';
import { BackupTab } from './config/BackupTab';
import { SmartImportModal } from './SmartImportModal';
import { Users, Layers, Download, Upload } from 'lucide-react';

interface ConfigViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  initialTab?: 'modules' | 'residents' | 'backup';
}

const SUB_TABS: { id: 'modules' | 'residents' | 'backup'; label: string; icon: React.ElementType }[] = [
  { id: 'modules', label: 'Categories & Modules', icon: Layers },
  { id: 'residents', label: 'Residents Roster', icon: Users },
  { id: 'backup', label: 'Data & Backup', icon: Download },
];

export const ConfigView: React.FC<ConfigViewProps> = ({
  categories,
  modules,
  residents,
  initialTab
}) => {
  // Session Store State (Persists active sub-tab across page navigation)
  const { configTab, setConfigState } = useSessionStore();
  const setConfigTab = (tab: 'modules' | 'residents' | 'backup') => setConfigState({ configTab: tab });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setConfigTab(initialTab);
    }
  }, [initialTab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto p-6 space-y-6"
    >
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-sage-100 p-3 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs gap-3">
        <div className="relative flex space-x-1.5">
          {SUB_TABS.map(({ id, label, icon: Icon }) => {
            const count =
              id === 'modules'
                ? `${categories.length} / ${modules.length}`
                : id === 'residents'
                ? `${residents.length}`
                : null;
            const isActive = configTab === id;
            return (
              <button
                key={id}
                onClick={() => setConfigTab(id)}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="config-active-pill"
                    className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-xl shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">
                  {label}
                  {count ? ` (${count})` : ''}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {configTab === 'residents' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-brass-100/70 dark:bg-brass-200/30 border border-brass-300/60 dark:border-brass-400/40 text-brass-800 dark:text-brass-300 rounded-xl text-xs font-semibold hover:bg-brass-200/60 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Paste Residents</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Render Active Sub-Tab with Animated Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={configTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {configTab === 'modules' && (
            <CategoriesModulesTab categories={categories} modules={modules} />
          )}

          {configTab === 'residents' && (
            <ResidentsTab residents={residents} />
          )}

          {configTab === 'backup' && (
            <BackupTab />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingResidents={residents}
      />
    </motion.div>
  );
};