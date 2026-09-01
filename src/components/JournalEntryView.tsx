import React, { useState } from 'react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { toggleAttendance } from '../db/db';
import { User, Plus, X } from 'lucide-react';

interface JournalEntryProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

export const JournalEntryView: React.FC<JournalEntryProps> = ({ categories, modules, residents, attendance }) => {
  const [selectedResidentId, setSelectedResidentId] = useState<string>(residents[0]?.id || '');
  const [manualDateMap, setManualDateMap] = useState<Record<string, string>>({});

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedMods = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);

  const resAttendance = attendance.filter(a => a.residentId === selectedResidentId);
  const attMap = new Map<string, string[]>();
  resAttendance.forEach(a => {
    const list = attMap.get(a.moduleId) || [];
    list.push(a.dateAttended);
    attMap.set(a.moduleId, list);
  });

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:col-span-1 h-[calc(100vh-140px)] flex flex-col">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
          <User className="w-4 h-4 text-rehab-600" />
          <span>Select Resident Journal</span>
        </h3>
        <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
          {residents.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedResidentId(r.id)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all ${
                selectedResidentId === r.id
                  ? 'bg-rehab-700 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-semibold">{r.fullName}</div>
              <div className={`text-[10px] ${selectedResidentId === r.id ? 'text-rehab-200' : 'text-slate-400'}`}>
                Adm: {formatToUSDate(r.admissionDate) || 'N/A'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-3 space-y-6 overflow-y-auto h-[calc(100vh-140px)]">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{selectedResident?.fullName}</h2>
            <p className="text-xs text-slate-500">Transcribe attended dates from physical journal notebook</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-full font-medium">
            {resAttendance.length} Sessions Logged
          </span>
        </div>

        <div className="space-y-6">
          {sortedCats.map(cat => {
            const catMods = sortedMods.filter(m => m.categoryId === cat.id);
            return (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                  <h4 className="font-bold text-xs text-slate-800 tracking-wide uppercase">{cat.name}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catMods.map(mod => {
                    const attendedDates = attMap.get(mod.id) || [];
                    const curManual = manualDateMap[mod.id] || '';

                    return (
                      <div key={mod.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="font-medium text-xs text-slate-800">{mod.name}</div>

                        <div className="flex flex-wrap gap-1.5">
                          {attendedDates.map(d => (
                            <span
                              key={d}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-mono rounded-lg"
                            >
                              <span>{formatToUSDate(d)}</span>
                              <button
                                onClick={() => selectedResident && toggleAttendance(selectedResident.id, mod.id, d)}
                                className="text-emerald-700 hover:text-emerald-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-medium mr-1">Scheduled:</span>
                          {mod.conductedDates?.map(cd => {
                            const isAdded = attendedDates.includes(cd);
                            return (
                              <button
                                key={cd}
                                disabled={isAdded}
                                onClick={() => selectedResident && toggleAttendance(selectedResident.id, mod.id, cd)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                  isAdded
                                    ? 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-rehab-500'
                                }`}
                              >
                                + {formatToUSDate(cd)}
                              </button>
                            );
                          })}

                          <div className="flex items-center space-x-1 mt-1 w-full">
                            <input
                              type="date"
                              value={curManual}
                              onChange={e => setManualDateMap({ ...manualDateMap, [mod.id]: e.target.value })}
                              className="text-[11px] p-1 border rounded bg-white w-full"
                            />
                            <button
                              onClick={() => {
                                if (curManual && selectedResident) {
                                  toggleAttendance(selectedResident.id, mod.id, curManual);
                                  setManualDateMap({ ...manualDateMap, [mod.id]: '' });
                                }
                              }}
                              className="p-1 bg-rehab-700 text-white rounded hover:bg-rehab-800"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};