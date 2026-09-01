import React, { useState } from 'react';
import type { Category, Module, Resident } from '../types';
import { CategoriesModulesTab } from './config/CategoriesModulesTab';
import { ResidentsTab } from './config/ResidentsTab';
import { BackupTab } from './config/BackupTab';
import { SmartImportModal } from './SmartImportModal';
import { Users, Layers, Download, Upload } from 'lucide-react';

interface ConfigViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
}

export const ConfigView: React.FC<ConfigViewProps> = ({ categories, modules, residents }) => {
  const [configTab, setConfigTab] = useState<'modules' | 'residents' | 'backup'>('modules');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm gap-3">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setConfigTab('modules')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              configTab === 'modules'
                ? 'bg-rehab-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories & Modules ({categories.length} / {modules.length})</span>
          </button>

          <button
            onClick={() => setConfigTab('residents')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              configTab === 'residents'
                ? 'bg-rehab-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Residents Roster ({residents.length})</span>
          </button>

          <button
            onClick={() => setConfigTab('backup')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              configTab === 'backup'
                ? 'bg-rehab-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Data & Backup</span>
          </button>
        </div>

        {configTab === 'residents' && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rehab-50 border border-rehab-200 text-rehab-800 rounded-xl text-xs font-semibold hover:bg-rehab-100 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Paste Residents</span>
          </button>
        )}
      </div>

      {/* Render Active Sub-Tab */}
      {configTab === 'modules' && (
        <CategoriesModulesTab categories={categories} modules={modules} />
      )}

      {configTab === 'residents' && (
        <ResidentsTab residents={residents} />
      )}

      {configTab === 'backup' && (
        <BackupTab />
      )}

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingResidents={residents}
      />
    </div>
  );
};