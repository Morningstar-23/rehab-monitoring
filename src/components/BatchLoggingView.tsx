import React, { useState } from 'react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { batchSetAttendance } from '../db/db';
import { Users, Calendar, CheckSquare, Square, Save } from 'lucide-react';

interface BatchLoggingProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

export const BatchLoggingView: React.FC<BatchLoggingProps> = ({ categories, modules, residents, attendance }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());

  const currentCategoryModules = modules.filter(m => m.categoryId === selectedCategoryId);
  const currentModule = modules.find(m => m.id === selectedModuleId);

  React.useEffect(() => {
    if (currentModule?.conductedDates && currentModule.conductedDates.length > 0) {
      setSelectedDate(currentModule.conductedDates[0]);
    }
  }, [selectedModuleId]);

  React.useEffect(() => {
    if (selectedModuleId && selectedDate) {
      const attendees = attendance
        .filter(a => a.moduleId === selectedModuleId && a.dateAttended === selectedDate)
        .map(a => a.residentId);
      setSelectedResidents(new Set(attendees));
    }
  }, [selectedModuleId, selectedDate, attendance]);

  const toggleResident = (resId: string) => {
    const next = new Set(selectedResidents);
    if (next.has(resId)) next.delete(resId);
    else next.add(resId);
    setSelectedResidents(next);
  };

  const handleSelectAll = () => {
    if (selectedResidents.size === residents.length) {
      setSelectedResidents(new Set());
    } else {
      setSelectedResidents(new Set(residents.map(r => r.id)));
    }
  };

  const handleSave = async () => {
    if (!selectedModuleId || !selectedDate) return;
    const attendeeArray = Array.from(selectedResidents);
    const unattendedArray = residents.filter(r => !selectedResidents.has(r.id)).map(r => r.id);

    await batchSetAttendance(attendeeArray, selectedModuleId, selectedDate, true);
    await batchSetAttendance(unattendedArray, selectedModuleId, selectedDate, false);
    alert('Attendance saved successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-slate-800 flex items-center space-x-2">
          <Users className="w-5 h-5 text-rehab-600" />
          <span>Batch Session Attendance Logging</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
            <select
              value={selectedCategoryId}
              onChange={e => {
                setSelectedCategoryId(e.target.value);
                const firstMod = modules.find(m => m.categoryId === e.target.value);
                if (firstMod) setSelectedModuleId(firstMod.id);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rehab-500"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Therapeutic Module</label>
            <select
              value={selectedModuleId}
              onChange={e => setSelectedModuleId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rehab-500"
            >
              {currentCategoryModules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-600 mb-2">Select Session Date</label>
          <div className="flex flex-wrap items-center gap-2">
            {currentModule?.conductedDates?.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                  selectedDate === d
                    ? 'bg-rehab-700 text-white border-rehab-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {formatToUSDate(d)}
              </button>
            ))}

            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Tap Residents Who Attended</h3>
            <p className="text-xs text-slate-500">
              {selectedResidents.size} of {residents.length} marked present
            </p>
          </div>
          <button
            onClick={handleSelectAll}
            className="text-xs font-medium text-rehab-700 hover:text-rehab-800 px-3 py-1.5 rounded-lg bg-rehab-50 border border-rehab-200"
          >
            {selectedResidents.size === residents.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {residents.map(resident => {
            const isSelected = selectedResidents.has(resident.id);
            return (
              <div
                key={resident.id}
                onClick={() => toggleResident(resident.id)}
                className={`p-3 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-sm text-emerald-950'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {resident.fullName.charAt(0)}
                  </div>
                  <span className="text-xs font-medium truncate">{resident.fullName}</span>
                </div>
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 bg-rehab-700 hover:bg-rehab-800 text-white rounded-xl text-sm font-medium shadow-sm transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
};