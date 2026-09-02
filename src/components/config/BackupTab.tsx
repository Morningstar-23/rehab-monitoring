// src/components/config/BackupTab.tsx
import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { db, resetToCleanTemplate } from '../../db/db';
import { restoreFullBackup, parseJsonBackup } from '../../utils/backupRestore';
import { useToast, useConfirm } from '../../context/NotificationProvider';
import { Download, Upload, AlertTriangle, RotateCcw } from 'lucide-react';

export const BackupTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();

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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (!content) return;

      const payload = parseJsonBackup(content);
      if (!payload) {
        toast.error('Please select a valid exported RehabMonitoring JSON file.', 'Invalid backup file');
        return;
      }

      const ok = await confirm({
        title: 'Restore this backup?',
        message: 'Restoring will replace current local database records with the backup contents. Proceed?',
        variant: 'danger',
        confirmLabel: 'Restore Backup'
      });
      if (!ok) return;

      try {
        const res = await restoreFullBackup(payload);
        toast.success(
          `${res.categoriesCount} Categories · ${res.modulesCount} Modules · ${res.residentsCount} Residents · ${res.attendanceCount} Attendance Logs`,
          'Backup successfully restored'
        );
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : String(err), 'Failed to restore backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetClean = async () => {
    const ok = await confirm({
      title: 'Reset to clean template?',
      message: 'This will permanently wipe all resident names and attendance dates, resetting the app to the clean 4-category, 33-module government template.',
      variant: 'danger',
      confirmLabel: 'Wipe & Reset'
    });
    if (ok) {
      await resetToCleanTemplate();
      toast.success('Database reset to the clean production template.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Export Backup Card */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-display text-base font-medium text-sage-900 flex items-center space-x-2.5">
            <Download className="w-4 h-4 text-brass-600" />
            <span>Export Offline Backup</span>
          </h3>
          <p className="text-xs text-sage-500 leading-relaxed">
            Export all local records (modules, residents, and journal attendance) as a single JSON file for offline archival or transferring to another computer.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExportBackup}
          className="w-full px-5 py-2.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(11,42,31,0.5)] transition-colors flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Backup (.json)</span>
        </motion.button>
      </div>

      {/* Import / Restore Backup Card */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-display text-base font-medium text-sage-900 flex items-center space-x-2.5">
            <Upload className="w-4 h-4 text-brass-600" />
            <span>Import & Restore Backup</span>
          </h3>
          <p className="text-xs text-sage-500 leading-relaxed">
            Transfer data to a new computer by uploading or dropping an exported JSON backup file.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-5 py-2.5 bg-brass-700 dark:bg-brass-600 hover:bg-brass-800 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(176,141,87,0.5)] transition-colors flex items-center justify-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Select Backup (.json) to Restore</span>
        </motion.button>
      </div>

      {/* Clean Template Reset */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-red-200/70 dark:border-red-900/40 shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(153,27,27,0.15)] space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-display text-base font-medium text-red-700 dark:text-red-400 flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Reset Database to Clean Template</span>
          </h3>
          <p className="text-xs text-sage-500 leading-relaxed">
            Wipes all resident names, admission dates, and attendance records from your machine, leaving only the official 4 categories and 33 blank modules.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleResetClean}
          className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(220,38,38,0.5)] transition-colors flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Wipe & Reset Template</span>
        </motion.button>
      </div>
    </div>
  );
};