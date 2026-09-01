import React from 'react';
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
          <Download className="w-4 h-4 text-rehab-600" />
          <span>Export Offline Backup</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Export all local records (modules, residents, and journal attendance) as a single JSON file for offline archival or transferring to another computer.
        </p>
        <button
          onClick={handleExportBackup}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Backup (.json)</span>
        </button>
      </div>

      {/* Clean Template Reset */}
      <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-red-700 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>Reset Database to Clean Production Template</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          This will wipe all resident names, admission dates, and attendance records from your machine, leaving only the official 4 categories and 33 blank modules. Use this before delivering the app to the facility.
        </p>
        <button
          onClick={handleResetClean}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Wipe Test Data & Reset Template</span>
        </button>
      </div>
    </div>
  );
};