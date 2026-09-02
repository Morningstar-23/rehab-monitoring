// src/components/config/ResidentsTab.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Resident } from '../../types';
import { formatToUSDate } from '../../utils/dateUtils';
import { useSessionStore } from '../../utils/useSessionStore';
import { db } from '../../db/db';
import { SearchBar } from '../SearchBar';
import { Pagination } from '../Pagination';
import { DatePicker } from '../DatePicker';
import { useConfirm } from '../../context/NotificationProvider';
import { Users, Plus, Trash2, Edit2, Check, X, Filter } from 'lucide-react';

interface ResidentsTabProps {
  residents: Resident[];
}

const PHASES = ['ALL', 'Junior', 'Senior', 'Re Entry'];

export const ResidentsTab: React.FC<ResidentsTabProps> = ({ residents }) => {
  const confirm = useConfirm();
  const {
    configResidentSearch,
    configResidentPhaseFilter,
    configResidentPage,
    configResidentPageSize,
    setConfigState
  } = useSessionStore();

  const searchTerm = configResidentSearch;
  const setSearchTerm = (val: string) => setConfigState({ configResidentSearch: val, configResidentPage: 1 });

  const selectedPhaseFilter = configResidentPhaseFilter;
  const setSelectedPhaseFilter = (val: string) => setConfigState({ configResidentPhaseFilter: val, configResidentPage: 1 });

  const currentPage = configResidentPage;
  const setCurrentPage = (page: number) => setConfigState({ configResidentPage: page });

  const pageSize = configResidentPageSize;
  const setPageSize = (size: number) => setConfigState({ configResidentPageSize: size, configResidentPage: 1 });

  const [newResident, setNewResident] = useState({
    fullName: '',
    admissionDate: '',
    elevationDate: '',
    phaseStatus: 'Junior' as Resident['phaseStatus']
  });
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  const filteredResidents = residents.filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhaseFilter === 'ALL' || r.phaseStatus === selectedPhaseFilter;
    return matchesSearch && matchesPhase;
  });

  const totalPages = Math.ceil(filteredResidents.length / pageSize) || 1;
  const paginatedResidents = filteredResidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    const ok = await confirm({
      title: 'Delete resident?',
      message: 'This removes the resident record and all their attendance logs. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Resident'
    });
    if (ok) {
      await db.residents.delete(id);
      await db.attendance.where('residentId').equals(id).delete();
    }
  };

  const phaseBadgeClass = (phase: Resident['phaseStatus']) =>
    phase === 'Junior'
      ? 'bg-brass-100/70 dark:bg-brass-200/30 text-brass-800 border-brass-300/70 dark:border-brass-400/40'
      : phase === 'Senior'
      ? 'bg-rehab-100/80 dark:bg-rehab-100/50 text-rehab-800 border-rehab-500/25'
      : 'bg-sage-100 dark:bg-sage-200 text-sage-600 border-sage-200 dark:border-sage-300';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form: Add Resident */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-4 lg:col-span-1 h-fit">
        <h3 className="font-display text-base font-medium text-sage-900 flex items-center space-x-2.5">
          <Users className="w-4 h-4 text-brass-600" />
          <span>Add New Resident</span>
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-sage-500 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={newResident.fullName}
              onChange={e => setNewResident({ ...newResident, fullName: e.target.value })}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 focus:ring-2 focus:ring-brass-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-500 mb-1">Date of Admission</label>
            <DatePicker
              value={newResident.admissionDate}
              onChange={val => setNewResident({ ...newResident, admissionDate: val })}
              size="sm"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-500 mb-1">Date of Elevation</label>
            <DatePicker
              value={newResident.elevationDate}
              onChange={val => setNewResident({ ...newResident, elevationDate: val })}
              size="sm"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-500 mb-1">Phase Status</label>
            <select
              value={newResident.phaseStatus}
              onChange={e => setNewResident({ ...newResident, phaseStatus: e.target.value as Resident['phaseStatus'] })}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 focus:ring-2 focus:ring-brass-500/40"
            >
              <option value="Junior">Junior Phase</option>
              <option value="Senior">Senior Phase</option>
              <option value="Re Entry">Re Entry</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: newResident.fullName.trim() ? 1.02 : 1 }}
            whileTap={{ scale: newResident.fullName.trim() ? 0.97 : 1 }}
            onClick={handleAddResident}
            disabled={!newResident.fullName.trim()}
            className="w-full py-2.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(28,82,56,0.5)] flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resident</span>
          </motion.button>
        </div>
      </div>

      {/* Right Table: Search, Filter, List & Pagination */}
      <div className="bg-sage-50 p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-4 lg:col-span-2 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Controls with Full Width SearchBar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by resident name..."
              count={filteredResidents.length}
              total={residents.length}
              className="w-full flex-1"
            />

            {/* Phase Filter Tabs */}
            <div className="relative flex items-center space-x-1 bg-sage-100 dark:bg-sage-200 p-1 rounded-xl shrink-0">
              <Filter className="w-3.5 h-3.5 text-sage-400 ml-1.5 mr-0.5" />
              {PHASES.map(phase => {
                const isActive = selectedPhaseFilter === phase;
                return (
                  <button
                    key={phase}
                    onClick={() => setSelectedPhaseFilter(phase)}
                    className={`relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200 ${
                      isActive ? 'text-sage-900 font-semibold' : 'text-sage-500 hover:text-sage-800'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="phase-filter-pill"
                        className="absolute inset-0 bg-white dark:bg-sage-100 rounded-lg shadow-xs"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{phase === 'ALL' ? 'All' : phase}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="border border-sage-200 dark:border-sage-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-sage-100 dark:bg-sage-200 border-b border-sage-200 dark:border-sage-300 text-sage-600">
                <tr>
                  <th className="p-3 font-semibold">Full Name</th>
                  <th className="p-3 font-semibold">Admission</th>
                  <th className="p-3 font-semibold">Elevation</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-200 dark:divide-sage-300">
                {paginatedResidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sage-400 italic">
                      {residents.length === 0
                        ? 'No residents registered yet. Add one on the left or paste from clipboard.'
                        : 'No residents match your search / filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  paginatedResidents.map(r => (
                    <tr key={r.id} className="hover:bg-rehab-100/40 dark:hover:bg-rehab-100/20 transition-colors">
                      <td className="p-3 font-semibold text-sage-900">{r.fullName}</td>
                      <td className="p-3 font-mono text-sage-500">{formatToUSDate(r.admissionDate) || '—'}</td>
                      <td className="p-3 font-mono text-sage-500">{formatToUSDate(r.elevationDate) || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${phaseBadgeClass(r.phaseStatus)}`}>
                          {r.phaseStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setEditingResident(r)}
                          className="p-1.5 text-sage-500 hover:text-rehab-700 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResident(r.id)}
                          className="p-1.5 text-sage-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredResidents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal: Edit Resident */}
      <AnimatePresence>
        {editingResident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingResident(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="bg-sage-50 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
                <h3 className="font-display text-base font-medium text-sage-900">Edit Resident Record</h3>
                <button onClick={() => setEditingResident(null)} className="text-sage-400 hover:text-sage-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-sage-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingResident.fullName}
                    onChange={e => setEditingResident({ ...editingResident, fullName: e.target.value })}
                    className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-500 mb-1">Admission Date</label>
                  <DatePicker
                    value={editingResident.admissionDate || ''}
                    onChange={val => setEditingResident({ ...editingResident, admissionDate: val })}
                    size="sm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-500 mb-1">Elevation Date</label>
                  <DatePicker
                    value={editingResident.elevationDate || ''}
                    onChange={val => setEditingResident({ ...editingResident, elevationDate: val })}
                    size="sm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-500 mb-1">Phase Status</label>
                  <select
                    value={editingResident.phaseStatus}
                    onChange={e => setEditingResident({ ...editingResident, phaseStatus: e.target.value as Resident['phaseStatus'] })}
                    className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 focus:ring-2 focus:ring-brass-500/40"
                  >
                    <option value="Junior">Junior Phase</option>
                    <option value="Senior">Senior Phase</option>
                    <option value="Re Entry">Re Entry</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingResident(null)}
                  className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleUpdateResident}
                  className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};