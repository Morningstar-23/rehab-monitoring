import React, { useState } from 'react';
import type { Resident } from '../../types';
import { formatToUSDate } from '../../utils/dateUtils';
import { db } from '../../db/db';
import { Users, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface ResidentsTabProps {
  residents: Resident[];
}

export const ResidentsTab: React.FC<ResidentsTabProps> = ({ residents }) => {
  const [newResident, setNewResident] = useState({
    fullName: '',
    admissionDate: '',
    elevationDate: '',
    phaseStatus: 'Junior' as Resident['phaseStatus']
  });
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  const handleAddResident = async () => {
    if (!newResident.fullName.trim()) return;
    await db.residents.add({
      id: `res_${Date.now()}`,
      fullName: newResident.fullName.trim(),
      admissionDate: newResident.admissionDate || undefined,
      elevationDate: newResident.elevationDate || undefined,
      phaseStatus: newResident.phaseStatus
    });
    setNewResident({ fullName: '', admissionDate: '', elevationDate: '', phaseStatus: 'Junior' });
  };

  const handleUpdateResident = async () => {
    if (!editingResident || !editingResident.fullName.trim()) return;
    await db.residents.update(editingResident.id, {
      fullName: editingResident.fullName.trim(),
      admissionDate: editingResident.admissionDate || undefined,
      elevationDate: editingResident.elevationDate || undefined,
      phaseStatus: editingResident.phaseStatus
    });
    setEditingResident(null);
  };

  const handleDeleteResident = async (id: string) => {
    if (confirm('Delete this resident record and all their attendance logs?')) {
      await db.residents.delete(id);
      await db.attendance.where('residentId').equals(id).delete();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add New Resident Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1 h-fit">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
          <Users className="w-4 h-4 text-rehab-600" />
          <span>Add New Resident</span>
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={newResident.fullName}
              onChange={e => setNewResident({ ...newResident, fullName: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-rehab-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date of Admission</label>
            <input
              type="date"
              value={newResident.admissionDate}
              onChange={e => setNewResident({ ...newResident, admissionDate: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date of Elevation</label>
            <input
              type="date"
              value={newResident.elevationDate}
              onChange={e => setNewResident({ ...newResident, elevationDate: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phase Status</label>
            <select
              value={newResident.phaseStatus}
              onChange={e => setNewResident({ ...newResident, phaseStatus: e.target.value as any })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            >
              <option value="Junior">Junior Phase</option>
              <option value="Senior">Senior Phase</option>
              <option value="Aftercare">Aftercare</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>

          <button
            onClick={handleAddResident}
            disabled={!newResident.fullName.trim()}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resident</span>
          </button>
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
        <h3 className="font-semibold text-slate-800 text-sm">
          Registered Residents ({residents.length})
        </h3>

        <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-xl">
          {residents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No residents registered yet. Use the form on the left or click "Bulk Paste Residents" above.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Admission</th>
                  <th className="p-3">Elevation</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {residents.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{r.fullName}</td>
                    <td className="p-3 font-mono text-slate-500">{formatToUSDate(r.admissionDate) || '—'}</td>
                    <td className="p-3 font-mono text-slate-500">{formatToUSDate(r.elevationDate) || '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {r.phaseStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setEditingResident(r)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteResident(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Edit Resident */}
      {editingResident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Edit Resident Record</h3>
              <button onClick={() => setEditingResident(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingResident.fullName}
                  onChange={e => setEditingResident({ ...editingResident, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Admission Date</label>
                <input
                  type="date"
                  value={editingResident.admissionDate || ''}
                  onChange={e => setEditingResident({ ...editingResident, admissionDate: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Elevation Date</label>
                <input
                  type="date"
                  value={editingResident.elevationDate || ''}
                  onChange={e => setEditingResident({ ...editingResident, elevationDate: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phase Status</label>
                <select
                  value={editingResident.phaseStatus}
                  onChange={e => setEditingResident({ ...editingResident, phaseStatus: e.target.value as any })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Junior">Junior Phase</option>
                  <option value="Senior">Senior Phase</option>
                  <option value="Aftercare">Aftercare</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setEditingResident(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateResident}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};