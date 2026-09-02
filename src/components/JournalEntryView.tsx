// src/components/JournalEntryView.tsx
import React, { useMemo, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { useSessionStore } from '../utils/useSessionStore';
import { toggleAttendance } from '../db/db';
import { DatePicker } from './DatePicker';
import { Pagination } from './Pagination';
import {
  User,
  Users,
  Search,
  Plus,
  X,
  Calendar,
  Check,
  ChevronDown,
  ChevronsUpDown,
  BookOpen,
  Layers,
  Sparkles
} from 'lucide-react';

interface JournalEntryProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

const PHASES = ['ALL', 'Junior', 'Senior', 'Re Entry'] as const;

export const JournalEntryView: React.FC<JournalEntryProps> = ({
  categories,
  modules,
  residents,
  attendance
}) => {
  const {
    journalResidentId,
    journalResidentSearch,
    journalPhaseFilter,
    journalModuleSearch,
    journalCatFilter,
    journalCollapsedCats,
    journalManualDates,
    journalRosterPage,
    journalRosterPageSize,
    setJournalState
  } = useSessionStore();

  const rosterPage = journalRosterPage;
  const setRosterPage = (p: number) => setJournalState({ journalRosterPage: p });

  const rosterPageSize = journalRosterPageSize;
  const setRosterPageSize = (s: number) => setJournalState({ journalRosterPageSize: s, journalRosterPage: 1 });

  const selectedResidentId = journalResidentId || residents[0]?.id || '';
  const setSelectedResidentId = (id: string) => setJournalState({ journalResidentId: id });

  const residentSearch = journalResidentSearch;
  const deferredResidentSearch = useDeferredValue(residentSearch);
  const setResidentSearch = (val: string) => {
    setJournalState({ journalResidentSearch: val, journalRosterPage: 1 });
  };

  const residentPhaseFilter = journalPhaseFilter;
  const setResidentPhaseFilter = (val: string) => {
    setJournalState({ journalPhaseFilter: val, journalRosterPage: 1 });
  };

  const moduleSearch = journalModuleSearch;
  const deferredModuleSearch = useDeferredValue(moduleSearch);
  const setModuleSearch = (val: string) => setJournalState({ journalModuleSearch: val });

  const selectedCatFilter = journalCatFilter;
  const setSelectedCatFilter = (val: string) => setJournalState({ journalCatFilter: val });

  const collapsedCategories = useMemo(() => new Set(journalCollapsedCats), [journalCollapsedCats]);

  const manualDateMap = journalManualDates;
  const setManualDateMap = (map: Record<string, string>) => setJournalState({ journalManualDates: map });

  const sortedCats = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const sortedMods = useMemo(() => [...modules].sort((a, b) => a.sortOrder - b.sortOrder), [modules]);

  const residentAttendanceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of attendance) {
      counts.set(a.residentId, (counts.get(a.residentId) || 0) + 1);
    }
    return counts;
  }, [attendance]);

  const filteredResidents = useMemo(() => {
    const query = deferredResidentSearch.toLowerCase().trim();
    return residents.filter(r => {
      const matchesName = !query || r.fullName.toLowerCase().includes(query);
      const matchesPhase = residentPhaseFilter === 'ALL' || r.phaseStatus === residentPhaseFilter;
      return matchesName && matchesPhase;
    });
  }, [residents, deferredResidentSearch, residentPhaseFilter]);

  // Paginate filtered residents
  const totalRosterPages = Math.ceil(filteredResidents.length / rosterPageSize) || 1;
  const paginatedResidents = useMemo(() => {
    if (rosterPageSize >= filteredResidents.length) return filteredResidents;
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredResidents.slice(start, start + rosterPageSize);
  }, [filteredResidents, rosterPage, rosterPageSize]);

  const selectedResident = useMemo(
    () => residents.find(r => r.id === selectedResidentId) || filteredResidents[0] || residents[0],
    [residents, selectedResidentId, filteredResidents]
  );

  const currentResidentAttendance = useMemo(() => {
    if (!selectedResident) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const a of attendance) {
      if (a.residentId === selectedResident.id) {
        const list = map.get(a.moduleId) || [];
        list.push(a.dateAttended);
        map.set(a.moduleId, list);
      }
    }
    return map;
  }, [attendance, selectedResident]);

  const totalSessionsLogged = useMemo(() => {
    let sum = 0;
    currentResidentAttendance.forEach(dates => {
      sum += dates.length;
    });
    return sum;
  }, [currentResidentAttendance]);

  const toggleCategoryCollapse = (catId: string) => {
    const next = new Set(journalCollapsedCats);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setJournalState({ journalCollapsedCats: Array.from(next) });
  };

  const toggleExpandCollapseAll = () => {
    if (journalCollapsedCats.length === categories.length) {
      setJournalState({ journalCollapsedCats: [] });
    } else {
      setJournalState({ journalCollapsedCats: categories.map(c => c.id) });
    }
  };

  const phaseBadgeClass = (phase?: Resident['phaseStatus']) => {
    switch (phase) {
      case 'Junior':
        return 'bg-brass-100/80 dark:bg-brass-500/20 text-brass-800 border-brass-300/70 dark:border-brass-400/40';
      case 'Senior':
        return 'bg-rehab-100/80 dark:bg-rehab-500/20 text-rehab-800 border-rehab-500/25';
      case 'Re Entry':
      default:
        return 'bg-sage-100 dark:bg-sage-200 text-sage-600 border-sage-200 dark:border-sage-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-[1600px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-88px)]"
    >
      {/* ========================================================= */}
      {/* LEFT COLUMN: RESIDENT ROSTER (4 cols on lg)                */}
      {/* ========================================================= */}
      <div className="lg:col-span-4 bg-white dark:bg-sage-100 p-4 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs flex flex-col h-full overflow-hidden space-y-3 min-w-0">
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brass-100/70 dark:bg-brass-500/20 text-brass-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-sage-900">
                Resident Roster
              </h3>
              <p className="text-[11px] text-sage-500 font-medium">
                {filteredResidents.length} of {residents.length} residents
              </p>
            </div>
          </div>
        </div>

        {/* Resident Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search resident name..."
            value={residentSearch}
            onChange={e => setResidentSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 font-medium focus:outline-none focus:ring-2 focus:ring-brass-500/40 focus:border-brass-500"
          />
          {residentSearch && (
            <button
              onClick={() => setResidentSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Phase Filter Tabs (Smooth Sliding Segmented Control) */}
        <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-xl border border-sage-200/70 dark:border-sage-300/50 overflow-x-auto scrollbar-none text-[11px]">
          {PHASES.map(phase => {
            const isActive = residentPhaseFilter === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => setResidentPhaseFilter(phase)}
                className={`relative flex-1 px-2.5 py-1 rounded-lg font-semibold text-center whitespace-nowrap transition-colors duration-150 shrink-0 select-none ${
                  isActive
                    ? 'text-white'
                    : 'text-sage-600 hover:text-sage-900 dark:text-sage-400 dark:hover:text-sage-100'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="journal-roster-phase-pill"
                    className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{phase === 'ALL' ? 'All Phases' : phase}</span>
              </button>
            );
          })}
        </div>

        {/* Paginated Scrollable Resident List */}
        <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 divide-y divide-sage-100 dark:divide-sage-200/50">
          {paginatedResidents.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <User className="w-8 h-8 text-sage-300 dark:text-sage-400 mx-auto" />
              <p className="text-xs text-sage-400 italic">No residents found matching your search.</p>
            </div>
          ) : (
            paginatedResidents.map(r => {
              const isSelected = selectedResident?.id === r.id;
              const attendedCount = residentAttendanceCounts.get(r.id) || 0;

              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedResidentId(r.id)}
                  className={`relative w-full text-left p-3 rounded-2xl transition-all duration-150 overflow-hidden group ${
                    isSelected
                      ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-md'
                      : 'text-sage-800 hover:bg-sage-50 dark:hover:bg-sage-200/60'
                  }`}
                >
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-xs truncate leading-snug">
                          {r.fullName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 font-mono text-[10px]">
                        <span className={isSelected ? 'text-white/80' : 'text-sage-500'}>
                          Adm: {formatToUSDate(r.admissionDate) || '—'}
                        </span>
                        {r.elevationDate && (
                          <>
                            <span className={isSelected ? 'text-white/40' : 'text-sage-300'}>•</span>
                            <span className={isSelected ? 'text-white/80' : 'text-sage-500'}>
                              Elv: {formatToUSDate(r.elevationDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1 shrink-0">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold border ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : phaseBadgeClass(r.phaseStatus)
                        }`}
                      >
                        {r.phaseStatus || 'Junior'}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : 'bg-sage-100 dark:bg-sage-200 text-sage-600'
                        }`}
                        title="Total sessions attended"
                      >
                        {attendedCount} logged
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Resident Sidebar Pagination Controls */}
        <div className="pt-2 border-t border-sage-200 dark:border-sage-300">
          <Pagination
            currentPage={rosterPage}
            totalPages={totalRosterPages}
            totalItems={filteredResidents.length}
            pageSize={rosterPageSize}
            onPageChange={setRosterPage}
            onPageSizeChange={size => {
              setRosterPageSize(size);
              setRosterPage(1);
            }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: MODULES & TRANSCRIPTION (8 cols on lg)       */}
      {/* ========================================================= */}
      <div className="lg:col-span-8 bg-white dark:bg-sage-100 p-5 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs flex flex-col h-full overflow-hidden space-y-4 min-w-0">
        {/* Active Resident Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sage-200 dark:border-sage-300 gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-rehab-100 dark:bg-rehab-500/20 text-rehab-800">
                <BookOpen className="w-4 h-4" />
              </span>
              <h2 className="font-display text-lg font-semibold text-sage-900 leading-none">
                {selectedResident ? selectedResident.fullName : 'Select a Resident'}
              </h2>
            </div>
            <p className="text-xs text-sage-500 pl-8">
              Transcribe attended dates from physical journal notebook into module records
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto pl-8 sm:pl-0">
            <div className="px-3.5 py-1.5 bg-rehab-50 dark:bg-rehab-500/10 border border-rehab-500/25 rounded-xl flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-rehab-600" />
              <span className="text-xs font-semibold text-rehab-900 font-mono">
                {totalSessionsLogged} Total Sessions Logged
              </span>
            </div>
          </div>
        </div>

        {/* Modules Filter & Category Scrollable Legend Bar */}
        <div className="space-y-2.5 shrink-0 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search modules by topic or name (e.g. Triggers, Relapse)..."
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 font-medium focus:outline-none focus:ring-2 focus:ring-brass-500/40 focus:border-brass-500"
              />
              {moduleSearch && (
                <button
                  onClick={() => setModuleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={toggleExpandCollapseAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-700 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 transition-colors shrink-0 shadow-2xs"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>
                {journalCollapsedCats.length === categories.length ? 'Expand All' : 'Collapse All'}
              </span>
            </button>
          </div>

          {/* Fully Scrollable Category Legend Filter Pills with Sliding Animation */}
          <div className="w-full min-w-0 overflow-x-auto pb-1.5 pt-0.5 flex items-center gap-1.5 scrollbar-thin">
            <span className="text-[11px] font-semibold text-sage-400 uppercase tracking-wider mr-1 shrink-0 flex items-center space-x-1 select-none">
              <Layers className="w-3 h-3 text-brass-600" />
              <span>Categories:</span>
            </span>

            <button
              onClick={() => setSelectedCatFilter('ALL')}
              className={`relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 border select-none ${
                selectedCatFilter === 'ALL'
                  ? 'border-transparent text-white'
                  : 'border-sage-200 dark:border-sage-300 bg-sage-50 dark:bg-sage-200 text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-300'
              }`}
            >
              {selectedCatFilter === 'ALL' && (
                <motion.div
                  layoutId="journal-cat-pill"
                  className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">All Categories ({modules.length})</span>
            </button>

            {sortedCats.map(cat => {
              const count = modules.filter(m => m.categoryId === cat.id).length;
              const isSelected = selectedCatFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatFilter(isSelected ? 'ALL' : cat.id)}
                  className={`relative flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 border whitespace-nowrap shrink-0 select-none ${
                    isSelected
                      ? 'border-transparent text-white'
                      : 'border-sage-200 dark:border-sage-300 bg-sage-50 dark:bg-sage-200 text-sage-700 hover:bg-sage-100 dark:hover:bg-sage-300'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="journal-cat-pill"
                      className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span
                    className="relative z-10 w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: cat.colorHex }}
                  />
                  <span className="relative z-10">{cat.name}</span>
                  <span
                    className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-sage-200/80 dark:bg-sage-300/80 text-sage-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories & Modules Matrix */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {sortedCats
            .filter(cat => selectedCatFilter === 'ALL' || cat.id === selectedCatFilter)
            .map(cat => {
              const catMods = sortedMods
                .filter(m => m.categoryId === cat.id)
                .filter(
                  m =>
                    !deferredModuleSearch ||
                    m.name.toLowerCase().includes(deferredModuleSearch.toLowerCase()) ||
                    cat.name.toLowerCase().includes(deferredModuleSearch.toLowerCase())
                );

              const isCollapsed = collapsedCategories.has(cat.id) && !deferredModuleSearch;

              if (deferredModuleSearch && catMods.length === 0) return null;

              let catAttendedSessions = 0;
              catMods.forEach(m => {
                const attended = currentResidentAttendance.get(m.id) || [];
                catAttendedSessions += attended.length;
              });

              return (
                <div
                  key={cat.id}
                  className="bg-sage-50/70 dark:bg-sage-200/40 rounded-2xl border border-sage-200 dark:border-sage-300 overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => toggleCategoryCollapse(cat.id)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-sage-100/60 dark:hover:bg-sage-200/80 transition-colors border-b border-sage-200/70 dark:border-sage-300/70"
                    style={{ borderLeft: `6px solid ${cat.colorHex}` }}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-xs shrink-0"
                        style={{ backgroundColor: cat.colorHex }}
                      />
                      <h4 className="font-display font-semibold text-sm text-sage-900 truncate">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] font-mono text-sage-500 font-medium shrink-0">
                        ({catMods.length} Modules)
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-2xs"
                        style={{
                          backgroundColor: `${cat.colorHex}18`,
                          borderColor: `${cat.colorHex}50`,
                          color: cat.colorHex
                        }}
                      >
                        {catAttendedSessions} Sessions
                      </span>
                      <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-sage-500" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {catMods.length === 0 ? (
                            <div className="col-span-2 p-6 text-center text-xs text-sage-400 italic">
                              No modules match "{deferredModuleSearch}" in this category.
                            </div>
                          ) : (
                            catMods.map(mod => {
                              const attendedDates = currentResidentAttendance.get(mod.id) || [];
                              const curManual = manualDateMap[mod.id] || '';

                              return (
                                <div
                                  key={mod.id}
                                  className="p-3.5 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 rounded-xl space-y-3 flex flex-col justify-between shadow-xs hover:border-brass-400/60 transition-colors"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="font-semibold text-xs text-sage-900 leading-snug">
                                        {mod.name}
                                      </span>
                                      <span
                                        className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
                                        style={{
                                          backgroundColor: `${cat.colorHex}18`,
                                          borderColor: `${cat.colorHex}45`,
                                          color: cat.colorHex
                                        }}
                                      >
                                        {attendedDates.length} attended
                                      </span>
                                    </div>

                                    <div className="min-h-6.5">
                                      {attendedDates.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {attendedDates.map(d => (
                                            <span
                                              key={d}
                                              className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-rehab-100/90 dark:bg-rehab-500/25 text-rehab-900 border border-rehab-500/30 text-[11px] font-mono font-semibold rounded-lg shadow-2xs"
                                            >
                                              <span>{formatToUSDate(d)}</span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  selectedResident &&
                                                  toggleAttendance(selectedResident.id, mod.id, d)
                                                }
                                                className="text-rehab-700 hover:text-red-600 dark:hover:text-red-400 p-0.5"
                                                title="Remove attended date"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-sage-400 italic">
                                          No attendance logged yet
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-2.5 border-t border-sage-100 dark:border-sage-200/70 space-y-2">
                                    {mod.conductedDates && mod.conductedDates.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-semibold text-sage-400 uppercase tracking-wider block items-center space-x-1">
                                          <Calendar className="w-3 h-3 text-brass-600" />
                                          <span>Pre-Scheduled:</span>
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {mod.conductedDates.map(cd => {
                                            const isAttended = attendedDates.includes(cd);
                                            return (
                                              <button
                                                key={cd}
                                                type="button"
                                                onClick={() =>
                                                  selectedResident &&
                                                  toggleAttendance(selectedResident.id, mod.id, cd)
                                                }
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border flex items-center space-x-1 transition-all ${
                                                  isAttended
                                                    ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 dark:border-rehab-500 shadow-2xs'
                                                    : 'bg-sage-50 dark:bg-sage-200 text-sage-700 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                                                }`}
                                              >
                                                {isAttended && <Check className="w-2.5 h-2.5 stroke-3" />}
                                                <span>{formatToUSDate(cd)}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center space-x-1.5 pt-0.5">
                                      <div className="flex-1 min-w-0">
                                        <DatePicker
                                          value={curManual}
                                          onChange={val =>
                                            setManualDateMap({ ...manualDateMap, [mod.id]: val })
                                          }
                                          conductedDates={mod.conductedDates || []}
                                          size="xs"
                                          className="w-full"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        disabled={!curManual || !selectedResident}
                                        onClick={() => {
                                          if (curManual && selectedResident) {
                                            toggleAttendance(selectedResident.id, mod.id, curManual);
                                            setManualDateMap({ ...manualDateMap, [mod.id]: '' });
                                          }
                                        }}
                                        className="px-2.5 py-1.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shrink-0 shadow-2xs transition-colors"
                                        title="Log manual date"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
};