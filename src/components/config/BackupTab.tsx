import React from 'react';
import { motion } from 'motion/react';
import { db, resetToCleanTemplate } from '../../db/db';
import { Download, AlertTriangle, RotateCcw } from 'lucide-react';

export const BackupTab: React.FC = () => {
  const handleExportBackup = async () => {
    const data = {
      categories: await db.categories.toArray(),
      modules: await db.modules.toArray(),
      residents: await db.residents.toArray(),
      attendance: await db.attendance.toArray(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RehabMonitoring_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleResetClean = async () => {
    if (confirm('⚠️ WARNING: This will permanently wipe all test resident names and attendance dates, resetting the app to the clean 4-category, 33-module government template. Continue?')) {
      await resetToCleanTemplate();
      alert('Database successfully reset to clean production template!');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Backup Card */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-4">
        <h3 className="font-display text-base font-medium text-sage-900 flex items-center space-x-2.5">
          <Download className="w-4 h-4 text-brass-600 dark:text-brass-400" />
          <span>Export Offline Backup</span>
        </h3>
        <p className="text-xs text-sage-500 leading-relaxed">
          Export all local records (modules, residents, and journal attendance) as a single JSON file for offline archival or transferring to another computer.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExportBackup}
          className="px-5 py-2.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(11,42,31,0.5)] transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Backup (.json)</span>
        </motion.button>
      </div>

      {/* Clean Template Reset */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-red-200/70 dark:border-red-900/40 shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(153,27,27,0.15)] space-y-4">
        <h3 className="font-display text-base font-medium text-red-700 dark:text-red-400 flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span>Reset Database to Clean Production Template</span>
        </h3>
        <p className="text-xs text-sage-500 leading-relaxed">
          This will wipe all resident names, admission dates, and attendance records from your machine, leaving only the official 4 categories and 33 blank modules. Use this before delivering the app to the facility.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleResetClean}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(220,38,38,0.5)] transition-colors flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Wipe Test Data & Reset Template</span>
        </motion.button>
      </div>
    </div>
  );
};