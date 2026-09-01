import React, { useState } from 'react';
import type { Category, Module, Resident } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { db } from '../db/db';
import { SmartImportModal } from './SmartImportModal';
import { Settings, Users, Plus, Trash2, Calendar, Upload, Download } from 'lucide-react';

interface ConfigViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
}

export const ConfigView: React.FC<ConfigViewProps> = ({ modules, residents }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newResidentName, setNewResidentName] = useState('');
  const [selectedModuleForDates, setSelectedModuleForDates] = useState<string>(modules[0]?.id || '');
  const [newConductedDate, setNewConductedDate] = useState('');

  const targetModule = modules.find(m => m.id === selectedModuleForDates);

  const handleAddResident = async () => {
    if (!newResidentName.trim()) return;
    await db.residents.add({
      id: `res_${Date.now()}`,
      fullName: newResidentName.trim(),
      phaseStatus: 'Junior'
    });
    setNewResidentName('');
  };

  const handleDeleteResident = async (id: string) => {
    if (confirm('Delete this resident record?')) {
      await db.residents.delete(id);
    }
  };

  const handleAddConductedDate = async () => {
    if (!targetModule || !newConductedDate) return;
    const current = targetModule.conductedDates || [];
    if (!current.includes(newConductedDate)) {
      await db.modules.update(targetModule.id, {
        conductedDates: [...current, newConductedDate].sort()
      });
      setNewConductedDate('');
    }
  };

  const handleRemoveConductedDate = async (dateStr: string) => {
    if (!targetModule) return;
    await db.modules.update(targetModule.id, {
      conductedDates: targetModule.conductedDates.filter(d => d !== dateStr)
    });
  };

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
    a.download = `RehabTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-rehab-600" />
          <span>System Configuration & Data Management</span>
        </h2>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-rehab-50 border border-rehab-200 text-rehab-800 rounded-xl text-xs font-semibold hover:bg-rehab-100"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Paste Residents</span>
          </button>
          <button
            onClick={handleExportBackup}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
          >
            <Download className="w-4 h-4" />
            <span>Export Full Backup (.json)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-rehab-600" />
            <span>Pre-Configured Session Dates per Module</span>
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Select Module</label>
            <select
              value={selectedModuleForDates}
              onChange={e => setSelectedModuleForDates(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            >
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Conducted Dates on Record</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {targetModule?.conductedDates?.map(d => (
                <span
                  key={d}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono rounded-lg"
                >
                  <span>{formatToUSDate(d)}</span>
                  <button onClick={() => handleRemoveConductedDate(d)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={newConductedDate}
                onChange={e => setNewConductedDate(e.target.value)}
                className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 flex-1"
              />
              <button
                onClick={handleAddConductedDate}
                className="px-4 py-2 bg-rehab-700 text-white rounded-xl text-xs font-semibold hover:bg-rehab-800"
              >
                Add Date
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
            <Users className="w-4 h-4 text-rehab-600" />
            <span>Active Residents Roster ({residents.length})</span>
          </h3>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Full resident name..."
              value={newResidentName}
              onChange={e => setNewResidentName(e.target.value)}
              className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 flex-1"
            />
            <button
              onClick={handleAddResident}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {residents.map(r => (
              <div key={r.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                <span className="font-medium text-slate-800">{r.fullName}</span>
                <button onClick={() => handleDeleteResident(r.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SmartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingResidents={residents}
      />
    </div>
  );
};