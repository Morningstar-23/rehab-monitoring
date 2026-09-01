import React, { useState } from 'react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { toggleAttendance } from '../db/db';
import { Search, Plus, X } from 'lucide-react';

interface MatrixViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

export const MatrixView: React.FC<MatrixViewProps> = ({ categories, modules, residents, attendance }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [popoverCell, setPopoverCell] = useState<{ residentId: string; moduleId: string } | null>(null);
  const [manualDate, setManualDate] = useState('');

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedMods = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);

  // Group modules by category
  const catModuleMap = new Map<string, Module[]>();
  sortedCats.forEach(c => catModuleMap.set(c.id, []));
  sortedMods.forEach(m => {
    const list = catModuleMap.get(m.categoryId) || [];
    list.push(m);
    catModuleMap.set(m.categoryId, list);
  });

  // Fast attendance lookup map
  const attMap = new Map<string, string[]>();
  attendance.forEach(a => {
    const key = `${a.residentId}_${a.moduleId}`;
    const list = attMap.get(key) || [];
    list.push(a.dateAttended);
    attMap.set(key, list);
  });

  const filteredResidents = residents.filter(r =>
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search resident name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rehab-500/20 focus:border-rehab-500"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredResidents.length}</span> of {residents.length} residents
        </div>
      </div>

      {/* Spreadsheet Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              {/* Tier 1 Header: Categories */}
              <tr className="border-b border-slate-300">
                <th colSpan={3} className="sticky top-0 left-0 z-30 bg-slate-100 p-2 font-semibold text-slate-700 text-center border-r border-slate-300">
                  Resident Details
                </th>
                {sortedCats.map(cat => {
                  const mods = catModuleMap.get(cat.id) || [];
                  if (mods.length === 0) return null;
                  return (
                    <th
                      key={cat.id}
                      colSpan={mods.length}
                      style={{ backgroundColor: cat.colorHex }}
                      className="sticky top-0 z-20 p-2 text-center font-bold text-slate-900 border-r border-slate-300"
                    >
                      {cat.name}
                    </th>
                  );
                })}
                <th className="sticky top-0 right-0 z-20 bg-amber-200 p-2 text-center font-bold text-amber-900 border-l border-slate-300">
                  Social Support
                </th>
              </tr>

              {/* Tier 2 Header: Modules */}
              <tr className="border-b border-slate-300 bg-slate-50">
                <th className="sticky top-8 left-0 z-30 bg-slate-100 p-2.5 font-semibold text-slate-700 min-w-[200px] border-r border-slate-200">
                  Name of Resident
                </th>
                <th className="sticky top-8 left-[200px] z-30 bg-slate-100 p-2 font-semibold text-slate-600 min-w-[100px] text-center border-r border-slate-200">
                  Admission
                </th>
                <th className="sticky top-8 left-[300px] z-30 bg-slate-100 p-2 font-semibold text-slate-600 min-w-[100px] text-center border-r border-slate-300">
                  Elevation
                </th>
                {sortedCats.map(cat => {
                  const mods = catModuleMap.get(cat.id) || [];
                  return mods.map(mod => (
                    <th
                      key={mod.id}
                      className="sticky top-8 z-10 p-2 font-medium text-slate-700 text-center min-w-[110px] max-w-[130px] border-r border-slate-200 break-words bg-slate-50/90 backdrop-blur-sm"
                    >
                      {mod.name}
                    </th>
                  ));
                })}
                <th className="sticky top-8 right-0 z-20 bg-amber-100 p-2 font-semibold text-amber-900 text-center min-w-[90px] border-l border-slate-300">
                  Sessions Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredResidents.map(resident => {
                let attendedTotal = 0;

                return (
                  <tr key={resident.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="sticky left-0 z-20 bg-white p-2.5 font-medium text-slate-900 border-r border-slate-200">
                      {resident.fullName}
                    </td>
                    <td className="sticky left-[200px] z-20 bg-white p-2 text-center text-slate-500 border-r border-slate-200">
                      {formatToUSDate(resident.admissionDate) || '—'}
                    </td>
                    <td className="sticky left-[300px] z-20 bg-white p-2 text-center text-slate-500 border-r border-slate-300">
                      {formatToUSDate(resident.elevationDate) || '—'}
                    </td>

                    {sortedCats.map(cat => {
                      const mods = catModuleMap.get(cat.id) || [];
                      return mods.map(mod => {
                        const dates = attMap.get(`${resident.id}_${mod.id}`) || [];
                        if (dates.length > 0) attendedTotal++;

                        const isPopoverOpen = popoverCell?.residentId === resident.id && popoverCell?.moduleId === mod.id;

                        return (
                          <td
                            key={mod.id}
                            onClick={() => setPopoverCell({ residentId: resident.id, moduleId: mod.id })}
                            className="p-1.5 text-center border-r border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition-colors relative"
                          >
                            {dates.length > 0 ? (
                              <div className="space-y-0.5">
                                {dates.map((d, i) => (
                                  <span
                                    key={i}
                                    className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded font-mono text-[11px]"
                                  >
                                    {formatToUSDate(d)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 hover:text-slate-500">—</span>
                            )}

                            {isPopoverOpen && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-3 text-left"
                              >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                  <span className="font-semibold text-slate-800 text-[11px] truncate">{mod.name}</span>
                                  <button onClick={() => setPopoverCell(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <p className="text-[10px] text-slate-500 mb-1.5 font-medium">Quick Dates:</p>
                                <div className="flex flex-wrap gap-1 mb-2.5">
                                  {mod.conductedDates?.map(cd => {
                                    const active = dates.includes(cd);
                                    return (
                                      <button
                                        key={cd}
                                        onClick={() => toggleAttendance(resident.id, mod.id, cd)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                          active
                                            ? 'bg-emerald-600 text-white border-emerald-700'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        {formatToUSDate(cd)}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center space-x-1">
                                  <input
                                    type="date"
                                    value={manualDate}
                                    onChange={e => setManualDate(e.target.value)}
                                    className="text-[11px] p-1 border rounded w-full bg-slate-50"
                                  />
                                  <button
                                    onClick={() => {
                                      if (manualDate) {
                                        toggleAttendance(resident.id, mod.id, manualDate);
                                        setManualDate('');
                                      }
                                    }}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      });
                    })}

                    <td className="sticky right-0 z-20 bg-amber-50/70 p-2 text-center font-bold text-amber-900 border-l border-slate-300">
                      {attendedTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};