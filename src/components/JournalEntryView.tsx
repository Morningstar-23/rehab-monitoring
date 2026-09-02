// src/components/JournalEntryView.tsx
import React, { useState, useMemo, useDeferredValue, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { useSessionStore } from '../utils/useSessionStore';
import { toggleAttendance, updateModuleSessionNote, db } from '../db/db';
import { useConfirm, useToast } from '../context/NotificationProvider';
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
  Sparkles,
  StickyNote,
  FolderPlus,
  CheckCircle2,
  Clock,
  Filter,
  Trash2,
  Award,
  CheckCheck,
  ArrowDownAZ,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';

interface JournalEntryProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

const PHASES = ['ALL', 'Junior', 'Senior', 'Re Entry'] as const;

type ModuleFilterMode = 'ALL' | 'ATTENDED' | 'PENDING' | 'SCHEDULED' | 'HAS_NOTE';
type ModuleSortMode = 'DEFAULT' | 'ALPHA' | 'ATTENDED_DESC';

const PRESET_COLORS = [
  '#2F7A54',
  '#B08D57',
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#DC2626',
  '#0D9488',
  '#4B5563'
];

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#171A15' : '#FAF8F3';
}

// In-Place Reusable Modal Shell
const ModalShell: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 6 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
          className={`bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl ${maxWidth} w-full p-6 space-y-4 text-left`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-sage-200 dark:border-sage-300">
            <h3 className="font-display font-semibold text-base text-sage-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-sage-400 hover:text-sage-600 p-1 rounded-xl hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const JournalEntryView: React.FC<JournalEntryProps> = ({
  categories,
  modules,
  residents,
  attendance
}) => {
  const confirm = useConfirm();
  const toast = useToast();

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
  const setRosterPageSize = (s: number) =>
    setJournalState({ journalRosterPageSize: s, journalRosterPage: 1 });

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

  // Module Filtering & Sorting States
  const [moduleFilterMode, setModuleFilterMode] = useState<ModuleFilterMode>('ALL');
  const [moduleSortMode, setModuleSortMode] = useState<ModuleSortMode>('DEFAULT');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // In-Place Modals State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#2F7A54');

  const [targetCategoryForNewMod, setTargetCategoryForNewMod] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState('');

  // Note Editor/Viewer Modal state
  const [activeNoteTarget, setActiveNoteTarget] = useState<{
    moduleId: string;
    moduleName: string;
    date: string;
  } | null>(null);
  const [activeNoteInput, setActiveNoteInput] = useState('');

  const sortedCats = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const sortedMods = useMemo(() => [...modules].sort((a, b) => a.sortOrder - b.sortOrder), [modules]);

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Resident Progress KPI Stats
  const residentStats = useMemo(() => {
    if (!selectedResident) {
      return { attendedModules: 0, totalSessions: 0, completionRate: 0, activeCategories: 0, pendingModules: 0, scheduledModules: 0, notesModules: 0 };
    }

    let totalSessions = 0;
    let attendedModulesCount = 0;
    let scheduledModulesCount = 0;
    let notesModulesCount = 0;
    const activeCategorySet = new Set<string>();

    for (const mod of modules) {
      const dates = currentResidentAttendance.get(mod.id) || [];
      if (dates.length > 0) {
        attendedModulesCount += 1;
        totalSessions += dates.length;
        activeCategorySet.add(mod.categoryId);
      }
      if (mod.conductedDates && mod.conductedDates.length > 0) {
        scheduledModulesCount += 1;
      }
      if (mod.sessionNotes && Object.keys(mod.sessionNotes).length > 0) {
        notesModulesCount += 1;
      }
    }

    const completionRate = modules.length > 0
      ? Math.round((attendedModulesCount / modules.length) * 100)
      : 0;

    return {
      attendedModules: attendedModulesCount,
      totalSessions,
      completionRate,
      activeCategories: activeCategorySet.size,
      pendingModules: modules.length - attendedModulesCount,
      scheduledModules: scheduledModulesCount,
      notesModules: notesModulesCount
    };
  }, [selectedResident, modules, currentResidentAttendance]);

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

  // Add Date directly into Module pre-scheduled conducted dates AND log attendance
  const handleAddAndScheduleDate = async (moduleId: string) => {
    const dateValue = manualDateMap[moduleId];
    if (!dateValue || !selectedResident) return;

    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    // 1. Auto-persist to module's conducted dates configuration
    const currentDates = mod.conductedDates || [];
    if (!currentDates.includes(dateValue)) {
      await db.modules.update(moduleId, {
        conductedDates: [...currentDates, dateValue].sort()
      });
    }

    // 2. Log attendance for current resident if not attended yet
    const attended = currentResidentAttendance.get(moduleId) || [];
    if (!attended.includes(dateValue)) {
      await toggleAttendance(selectedResident.id, moduleId, dateValue);
    }

    setManualDateMap({ ...manualDateMap, [moduleId]: '' });
    toast.success(`Logged and scheduled ${formatToUSDate(dateValue)} for ${mod.name}`);
  };

  // Delete Scheduled Date with confirmation pop-up
  const handleDeleteScheduledDate = async (moduleId: string, dateToDelete: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    const ok = await confirm({
      title: 'Delete Scheduled Session Date?',
      message: `Removing ${formatToUSDate(dateToDelete)} from "${mod.name}" will delete this scheduled date, its facilitator note, and all resident attendance logs for this session. Proceed?`,
      variant: 'danger',
      confirmLabel: 'Delete Date & Records'
    });

    if (!ok) return;

    const nextDates = (mod.conductedDates || []).filter(d => d !== dateToDelete);
    const nextNotes = { ...(mod.sessionNotes || {}) };
    delete nextNotes[dateToDelete];

    await db.modules.update(moduleId, {
      conductedDates: nextDates,
      sessionNotes: nextNotes
    });

    await db.attendance
      .where('moduleId')
      .equals(moduleId)
      .and(a => a.dateAttended === dateToDelete)
      .delete();

    toast.success(`Removed session date ${formatToUSDate(dateToDelete)} from ${mod.name}.`);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newId = `cat_${Date.now()}`;
    await db.categories.add({
      id: newId,
      name: newCategoryName.trim(),
      colorHex: newCategoryColor,
      headerBgHex: newCategoryColor,
      headerTextHex: getContrastTextColor(newCategoryColor),
      sortOrder: categories.length + 1
    });

    setNewCategoryName('');
    setShowCategoryModal(false);
    toast.success(`Category "${newCategoryName.trim()}" created successfully.`);
  };

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !targetCategoryForNewMod) return;
    const catMods = modules.filter(m => m.categoryId === targetCategoryForNewMod);
    const newId = `mod_${targetCategoryForNewMod}_${Date.now()}`;

    await db.modules.add({
      id: newId,
      categoryId: targetCategoryForNewMod,
      name: newModuleName.trim(),
      sortOrder: catMods.length + 1,
      conductedDates: [],
      sessionNotes: {}
    });

    setNewModuleName('');
    setTargetCategoryForNewMod(null);
    toast.success(`Module "${newModuleName.trim()}" created successfully.`);
  };

  const handleSaveNote = async () => {
    if (!activeNoteTarget) return;
    await updateModuleSessionNote(activeNoteTarget.moduleId, activeNoteTarget.date, activeNoteInput);
    setActiveNoteTarget(null);
    setActiveNoteInput('');
    toast.success('Session note updated.');
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

  const SORT_OPTIONS: { id: ModuleSortMode; label: string; icon: React.ElementType }[] = [
    { id: 'DEFAULT', label: 'Category Order', icon: Layers },
    { id: 'ALPHA', label: 'Alphabetical (A → Z)', icon: ArrowDownAZ },
    { id: 'ATTENDED_DESC', label: 'Most Attended First', icon: TrendingUp }
  ];

  const currentSortOption = SORT_OPTIONS.find(s => s.id === moduleSortMode) || SORT_OPTIONS[0];
  const SortIcon = currentSortOption.icon;

  const STATUS_FILTER_TABS: {
    id: ModuleFilterMode;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { id: 'ALL', label: 'All Modules', icon: LayoutGrid, count: modules.length },
    { id: 'ATTENDED', label: 'Attended', icon: CheckCircle2, count: residentStats.attendedModules },
    { id: 'PENDING', label: 'Pending', icon: Clock, count: residentStats.pendingModules },
    { id: 'SCHEDULED', label: 'Scheduled', icon: Calendar, count: residentStats.scheduledModules },
    { id: 'HAS_NOTE', label: 'Notes Attached', icon: StickyNote, count: residentStats.notesModules }
  ];

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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Phase Filter Tabs */}
        <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-xl border border-sage-200/70 dark:border-sage-300/50 overflow-x-auto scrollbar-none text-[11px]">
          {PHASES.map(phase => {
            const isActive = residentPhaseFilter === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => setResidentPhaseFilter(phase)}
                className={`relative flex-1 px-2.5 py-1 rounded-lg font-semibold text-center whitespace-nowrap transition-colors duration-150 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-sage-600 hover:text-sage-900 dark:text-sage-400 dark:hover:text-sage-900'
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
                  className={`relative w-full text-left p-3 rounded-2xl transition-all duration-150 overflow-hidden group cursor-pointer ${
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

        {/* Resident Pagination Controls */}
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
        {/* Active Resident Header & KPI Metrics Cards */}
        <div className="space-y-3 pb-3 border-b border-sage-200 dark:border-sage-300 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-rehab-100 dark:bg-rehab-500/20 text-rehab-800">
                  <BookOpen className="w-4 h-4" />
                </span>
                <h2 className="font-display text-lg font-semibold text-sage-900 leading-none">
                  {selectedResident ? selectedResident.fullName : 'Select a Resident'}
                </h2>
                {selectedResident && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${phaseBadgeClass(selectedResident.phaseStatus)}`}>
                    {selectedResident.phaseStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-sage-500 pl-8">
                Resident progress dashboard & direct attendance log manager
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto pl-8 sm:pl-0">
              <div className="px-3.5 py-1.5 bg-rehab-50 dark:bg-rehab-500/10 border border-rehab-500/25 rounded-xl flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-rehab-600" />
                <span className="text-xs font-semibold text-rehab-900 font-mono">
                  {residentStats.totalSessions} Total Sessions Logged
                </span>
              </div>
            </div>
          </div>

          {/* Quick KPI Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 bg-sage-50/80 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-sage-500">
                <span className="font-semibold flex items-center space-x-1">
                  <CheckCheck className="w-3.5 h-3.5 text-rehab-600" />
                  <span>Modules Started</span>
                </span>
                <span className="font-mono font-bold text-rehab-700">{residentStats.completionRate}%</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-base font-bold font-display text-sage-900">{residentStats.attendedModules}</span>
                <span className="text-[11px] text-sage-500 font-mono">/ {modules.length}</span>
              </div>
              <div className="w-full bg-sage-200 dark:bg-sage-300 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-rehab-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${residentStats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 bg-sage-50/80 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-sage-500">
                <span className="font-semibold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Modules</span>
                </span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-base font-bold font-display text-sage-900">{residentStats.pendingModules}</span>
                <span className="text-[11px] text-sage-500 font-mono">remaining</span>
              </div>
              <div className="text-[10px] text-sage-400">0 sessions attended yet</div>
            </div>

            <div className="p-2.5 bg-sage-50/80 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-sage-500">
                <span className="font-semibold flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-brass-600" />
                  <span>Active Categories</span>
                </span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-base font-bold font-display text-sage-900">{residentStats.activeCategories}</span>
                <span className="text-[11px] text-sage-500 font-mono">/ {categories.length}</span>
              </div>
              <div className="text-[10px] text-sage-400">with logged attendance</div>
            </div>

            <div className="p-2.5 bg-sage-50/80 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-sage-500">
                <span className="font-semibold flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-rehab-600" />
                  <span>Total Logged Sessions</span>
                </span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-base font-bold font-display text-sage-900">{residentStats.totalSessions}</span>
                <span className="text-[11px] text-sage-500 font-mono">session entries</span>
              </div>
              <div className="text-[10px] text-sage-400">across entire stay</div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* REORGANIZED CLEAN 3-TIER TOOLBAR                          */}
        {/* ========================================================= */}
        <div className="space-y-2.5 shrink-0 min-w-0 w-full">
          {/* TIER 1: Full-Width SearchBar + Sort + Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search modules by topic or name (e.g. Triggers, Relapse)..."
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 font-medium focus:outline-none focus:ring-2 focus:ring-brass-500/40 focus:border-brass-500"
              />
              {moduleSearch && (
                <button
                  onClick={() => setModuleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {/* Custom Animated Sort Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(prev => !prev)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 rounded-xl text-xs font-semibold hover:border-brass-500/60 transition-all cursor-pointer shadow-2xs"
                >
                  <SortIcon className="w-3.5 h-3.5 text-brass-600" />
                  <span>{currentSortOption.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-sage-400 ml-0.5" />
                </button>

                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1 w-48 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 hairline-brass rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5"
                    >
                      {SORT_OPTIONS.map(opt => {
                        const isSelected = moduleSortMode === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setModuleSortMode(opt.id);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-rehab-700 dark:bg-rehab-600 text-white font-semibold'
                                : 'text-sage-800 hover:bg-sage-100 dark:hover:bg-sage-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{opt.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Add Category Button */}
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rehab-700 dark:bg-rehab-600 text-white rounded-xl text-xs font-semibold hover:bg-rehab-800 transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Add Category</span>
              </button>

              {/* Expand / Collapse All Button */}
              <button
                onClick={toggleExpandCollapseAll}
                className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-700 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>
                  {journalCollapsedCats.length === categories.length ? 'Expand All' : 'Collapse All'}
                </span>
              </button>
            </div>
          </div>

          {/* TIER 2: Animated Status Filter Segmented Control (Using Clean Vector Icons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[11px] font-semibold text-sage-400 uppercase tracking-wider mr-1 shrink-0 flex items-center space-x-1 select-none">
              <Filter className="w-3 h-3 text-brass-600" />
              <span>Status:</span>
            </span>

            <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-2xl border border-sage-200/70 dark:border-sage-300/60 overflow-x-auto scrollbar-none gap-1">
              {STATUS_FILTER_TABS.map(tab => {
                const isActive = moduleFilterMode === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModuleFilterMode(tab.id)}
                    className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 select-none cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      isActive ? 'text-white' : 'text-sage-600 hover:text-sage-900 dark:text-sage-400 dark:hover:text-sage-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="journal-status-filter-pill"
                        className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-xl shadow-xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-sage-500 dark:text-sage-400'}`} />
                    <span className="relative z-10">{tab.label}</span>
                    <span
                      className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-sage-200/80 dark:bg-sage-300/80 text-sage-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIER 3: Scrollable Category Legend Filter Pills */}
          <div className="w-full min-w-0 overflow-x-auto pb-1 pt-0.5 flex items-center gap-1.5 scrollbar-thin">
            <span className="text-[11px] font-semibold text-sage-400 uppercase tracking-wider mr-1 shrink-0 flex items-center space-x-1 select-none">
              <Layers className="w-3 h-3 text-brass-600" />
              <span>Categories:</span>
            </span>

            <button
              onClick={() => setSelectedCatFilter('ALL')}
              className={`relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 border select-none cursor-pointer ${
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
                  className={`relative flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 border whitespace-nowrap shrink-0 select-none cursor-pointer ${
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
              let catMods = sortedMods.filter(m => m.categoryId === cat.id);

              // Apply Search Filter
              if (deferredModuleSearch) {
                catMods = catMods.filter(
                  m =>
                    m.name.toLowerCase().includes(deferredModuleSearch.toLowerCase()) ||
                    cat.name.toLowerCase().includes(deferredModuleSearch.toLowerCase())
                );
              }

              // Apply Module Filter Mode
              if (moduleFilterMode === 'ATTENDED') {
                catMods = catMods.filter(m => (currentResidentAttendance.get(m.id) || []).length > 0);
              } else if (moduleFilterMode === 'PENDING') {
                catMods = catMods.filter(m => (currentResidentAttendance.get(m.id) || []).length === 0);
              } else if (moduleFilterMode === 'SCHEDULED') {
                catMods = catMods.filter(m => (m.conductedDates || []).length > 0);
              } else if (moduleFilterMode === 'HAS_NOTE') {
                catMods = catMods.filter(m => Object.keys(m.sessionNotes || {}).length > 0);
              }

              // Apply Sorting
              if (moduleSortMode === 'ALPHA') {
                catMods = [...catMods].sort((a, b) => a.name.localeCompare(b.name));
              } else if (moduleSortMode === 'ATTENDED_DESC') {
                catMods = [...catMods].sort((a, b) => {
                  const countA = (currentResidentAttendance.get(a.id) || []).length;
                  const countB = (currentResidentAttendance.get(b.id) || []).length;
                  return countB - countA;
                });
              }

              const isCollapsed = collapsedCategories.has(cat.id) && !deferredModuleSearch;

              if (catMods.length === 0 && (deferredModuleSearch || moduleFilterMode !== 'ALL')) {
                return null;
              }

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
                  {/* Category Header */}
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

                    <div className="flex items-center space-x-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setTargetCategoryForNewMod(cat.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-sage-100 hover:bg-sage-100 dark:hover:bg-sage-200 text-sage-700 text-[11px] font-semibold rounded-lg transition-colors border border-sage-200 dark:border-sage-300 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-brass-600" />
                        <span>Add Module</span>
                      </button>

                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-2xs"
                        style={{
                          backgroundColor: `${cat.colorHex}18`,
                          borderColor: `${cat.colorHex}50`,
                          color: cat.colorHex
                        }}
                      >
                        {catAttendedSessions} Sessions Logged
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
                        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {catMods.length === 0 ? (
                            <div className="col-span-2 p-6 text-center text-xs text-sage-400 italic">
                              No modules match your filter in this category.
                            </div>
                          ) : (
                            catMods.map(mod => {
                              const attendedDates = currentResidentAttendance.get(mod.id) || [];
                              const curManual = manualDateMap[mod.id] || '';
                              const hasAttendance = attendedDates.length > 0;

                              return (
                                <div
                                  key={mod.id}
                                  className={`p-4 rounded-2xl space-y-3.5 flex flex-col justify-between transition-all ${
                                    hasAttendance
                                      ? 'bg-white dark:bg-sage-100 border-2 border-rehab-500/50 dark:border-rehab-400/50 shadow-xs'
                                      : 'bg-white/80 dark:bg-sage-100/80 border border-sage-200 dark:border-sage-300 shadow-2xs'
                                  }`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center space-x-1.5 truncate">
                                        {hasAttendance && (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="font-semibold text-xs text-sage-900 leading-snug truncate">
                                          {mod.name}
                                        </span>
                                      </div>

                                      {/* Attendance Badge Visualizer */}
                                      <span
                                        className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                          hasAttendance
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400/50'
                                            : 'bg-sage-100 dark:bg-sage-200 text-sage-500 border-sage-200 dark:border-sage-300'
                                        }`}
                                      >
                                        {hasAttendance ? `${attendedDates.length} attended` : '0 attended'}
                                      </span>
                                    </div>

                                    {/* Attended Dates Display with Large Note Buttons */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] text-sage-500 dark:text-sage-400 font-bold uppercase tracking-wider block">
                                        Resident Attended Dates:
                                      </span>
                                      {attendedDates.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {attendedDates.map(d => {
                                            const note = mod.sessionNotes?.[d];
                                            const hasNote = Boolean(note?.trim());

                                            return (
                                              <span
                                                key={d}
                                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-rehab-100/90 dark:bg-rehab-500/25 text-rehab-900 border border-rehab-500/30 text-xs font-mono font-semibold rounded-lg shadow-2xs"
                                              >
                                                <span>{formatToUSDate(d)}</span>

                                                {/* Edit / View Note Button */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveNoteTarget({
                                                      moduleId: mod.id,
                                                      moduleName: mod.name,
                                                      date: d
                                                    });
                                                    setActiveNoteInput(mod.sessionNotes?.[d] || '');
                                                  }}
                                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                                    hasNote
                                                      ? 'text-brass-800 dark:text-brass-300 bg-brass-200/70 dark:bg-brass-500/30'
                                                      : 'text-rehab-700 hover:text-rehab-900'
                                                  }`}
                                                  title={hasNote ? `Note: "${note}"` : 'Add note for this date'}
                                                >
                                                  <StickyNote className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    selectedResident &&
                                                    toggleAttendance(selectedResident.id, mod.id, d)
                                                  }
                                                  className="text-rehab-700 hover:text-red-600 dark:hover:text-red-400 p-0.5 cursor-pointer"
                                                  title="Remove attended date"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-sage-400 italic block py-0.5">
                                          No attendance logged yet for this resident
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pre-Scheduled Dates with Inline Note Previews & Delete Button */}
                                  <div className="pt-2.5 border-t border-sage-100 dark:border-sage-200/70 space-y-2.5">
                                    {mod.conductedDates && mod.conductedDates.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-sage-500 uppercase tracking-wider flex items-center space-x-1">
                                          <Calendar className="w-3 h-3 text-brass-600" />
                                          <span>Pre-Scheduled Dates & Notes ({mod.conductedDates.length}):</span>
                                        </span>

                                        <div className="space-y-1.5">
                                          {mod.conductedDates.map(cd => {
                                            const isAttended = attendedDates.includes(cd);
                                            const dateNote = mod.sessionNotes?.[cd];
                                            const hasDateNote = Boolean(dateNote?.trim());

                                            return (
                                              <div
                                                key={cd}
                                                className="p-2 bg-sage-50 dark:bg-sage-200/60 rounded-xl border border-sage-200 dark:border-sage-300 space-y-1"
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  {/* Clickable Attendance Toggle Button */}
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      selectedResident &&
                                                      toggleAttendance(selectedResident.id, mod.id, cd)
                                                    }
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                                                      isAttended
                                                        ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 dark:border-rehab-500 shadow-2xs'
                                                        : 'bg-white dark:bg-sage-100 text-sage-700 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                                                    }`}
                                                  >
                                                    {isAttended && <Check className="w-3 h-3 stroke-3" />}
                                                    <span>{formatToUSDate(cd)}</span>
                                                    <span className="text-[10px] opacity-80">
                                                      {isAttended ? '(Attended)' : '(Click to log)'}
                                                    </span>
                                                  </button>

                                                  <div className="flex items-center space-x-1">
                                                    {/* Big Note Button */}
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setActiveNoteTarget({
                                                          moduleId: mod.id,
                                                          moduleName: mod.name,
                                                          date: cd
                                                        });
                                                        setActiveNoteInput(mod.sessionNotes?.[cd] || '');
                                                      }}
                                                      className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                                        hasDateNote
                                                          ? 'bg-brass-100 dark:bg-brass-500/25 text-brass-800 dark:text-brass-300 border border-brass-300/60 hover:bg-brass-200'
                                                          : 'bg-white dark:bg-sage-100 text-sage-600 hover:bg-sage-100 border border-sage-200 dark:border-sage-300'
                                                      }`}
                                                      title="View or edit note"
                                                    >
                                                      <StickyNote className="w-3 h-3 text-brass-600" />
                                                      <span>{hasDateNote ? 'Edit Note' : '+ Add Note'}</span>
                                                    </button>

                                                    {/* Delete Scheduled Date Button with warning */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => handleDeleteScheduledDate(mod.id, cd, e)}
                                                      className="p-1 text-sage-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                                      title={`Delete date ${formatToUSDate(cd)}`}
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Live Inline Note Preview */}
                                                {hasDateNote && (
                                                  <div
                                                    onClick={() => {
                                                      setActiveNoteTarget({
                                                        moduleId: mod.id,
                                                        moduleName: mod.name,
                                                        date: cd
                                                      });
                                                      setActiveNoteInput(mod.sessionNotes?.[cd] || '');
                                                    }}
                                                    className="p-1.5 bg-white dark:bg-sage-100 rounded-lg text-[11px] text-sage-700 dark:text-sage-300 italic border border-sage-200/70 cursor-pointer hover:border-brass-400 transition-colors line-clamp-2"
                                                    title="Click to edit full note"
                                                  >
                                                    "{dateNote}"
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Auto-Add Date Input: Automatically saves to module config and logs attendance */}
                                    <div className="flex items-center space-x-1.5 pt-1">
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
                                        onClick={() => handleAddAndScheduleDate(mod.id)}
                                        className="px-3 py-1.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 shadow-2xs transition-colors cursor-pointer"
                                        title="Auto-saves date to module schedule and logs attendance for resident"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Date</span>
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

      {/* ========================================================= */}
      {/* MODAL 1: NOTE EDITOR / VIEWER MODAL                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {activeNoteTarget && (
          <ModalShell
            isOpen={Boolean(activeNoteTarget)}
            onClose={() => setActiveNoteTarget(null)}
            title="Session & Facilitator Note"
          >
            <div className="space-y-3">
              <div className="bg-sage-50 dark:bg-sage-200/60 p-3 rounded-2xl space-y-1">
                <div className="text-xs font-semibold text-sage-900">
                  {activeNoteTarget.moduleName}
                </div>
                <div className="text-[11px] font-mono text-sage-500">
                  Session Date:{' '}
                  <strong className="text-rehab-700 dark:text-rehab-400">
                    {formatToUSDate(activeNoteTarget.date)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">
                  Facilitator remarks, discussion topics, or highlights for this date:
                </label>
                <textarea
                  rows={4}
                  value={activeNoteInput}
                  onChange={e => setActiveNoteInput(e.target.value)}
                  placeholder="e.g. Discussed emotional regulation and high-risk relapse scenarios. High engagement from residents..."
                  className="w-full text-xs p-3 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-sage-200/70 dark:border-sage-300/70">
                {activeNoteInput && (
                  <button
                    type="button"
                    onClick={() => setActiveNoteInput('')}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Clear Note
                  </button>
                )}
                <div className="flex space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveNoteTarget(null)}
                    className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={handleSaveNote}
                    className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Save Note
                  </motion.button>
                </div>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: ADD CATEGORY MODAL                               */}
      {/* ========================================================= */}
      <ModalShell
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Create New Category"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Cognitive Behavioral Therapy"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1.5">
              Theme Color
            </label>
            <div className="flex items-center gap-2 mb-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                    newCategoryColor === color ? 'scale-125 border-white shadow-md' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={newCategoryColor}
                onChange={e => setNewCategoryColor(e.target.value)}
                className="w-10 h-8 p-0.5 border border-sage-200 dark:border-sage-300 rounded-lg cursor-pointer bg-white dark:bg-sage-200"
              />
              <span className="text-xs font-mono uppercase text-sage-600 font-medium">
                {newCategoryColor}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newCategoryName.trim()}
              onClick={handleCreateCategory}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>

      {/* ========================================================= */}
      {/* MODAL 3: ADD MODULE MODAL                                 */}
      {/* ========================================================= */}
      <ModalShell
        isOpen={Boolean(targetCategoryForNewMod)}
        onClose={() => setTargetCategoryForNewMod(null)}
        title="Add Therapeutic Module"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Parent Category *
            </label>
            <select
              value={targetCategoryForNewMod || ''}
              onChange={e => setTargetCategoryForNewMod(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Module Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Relapse Prevention Strategies"
              value={newModuleName}
              onChange={e => setNewModuleName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setTargetCategoryForNewMod(null)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newModuleName.trim() || !targetCategoryForNewMod}
              onClick={handleCreateModule}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>
    </motion.div>
  );
};