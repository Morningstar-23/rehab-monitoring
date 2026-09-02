// src/components/BatchLoggingView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { useSessionStore } from '../utils/useSessionStore';
import { batchSetAttendance, updateModuleSessionNote, db } from '../db/db';
import { useConfirm, useToast } from '../context/NotificationProvider';
import { SearchBar } from './SearchBar';
import { Pagination } from './Pagination';
import { DatePicker } from './DatePicker';
import {
  Users,
  CheckSquare,
  Square,
  Save,
  ChevronDown,
  Check,
  Plus,
  UserPlus,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  FolderPlus,
  Pin,
  PinOff,
  StickyNote,
  Calendar,
  CalendarPlus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';

interface BatchLoggingProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
  onNavigateToConfig?: (subTab?: 'modules' | 'residents' | 'backup') => void;
}

interface DropdownOption {
  id: string;
  name: string;
  colorHex?: string;
  count?: number;
}

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#171A15' : '#FAF8F3';
}

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

// Reusable In-Place Modal Shell
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

// Animated Dropdown Component
const AnimatedDropdown: React.FC<{
  label: string;
  icon: React.ElementType;
  value: string;
  options: DropdownOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
}> = ({ label, icon: Icon, value, options, onChange, placeholder = 'Select...', onAddNew, addNewLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-sage-600 dark:text-sage-400 flex items-center space-x-1.5">
          <Icon className="w-3.5 h-3.5 text-brass-600" />
          <span>{label}</span>
        </label>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="text-[11px] font-semibold text-brass-700 dark:text-brass-400 hover:underline flex items-center space-x-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{addNewLabel || 'Add New'}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-3 bg-sage-50/70 dark:bg-sage-200/50 border border-sage-200 dark:border-sage-300 rounded-xl text-left text-xs font-medium text-sage-900 hover:border-brass-500/60 focus:outline-none focus:ring-2 focus:ring-brass-500/40 shadow-2xs transition-all cursor-pointer"
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {selectedOption?.colorHex && (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
              style={{ backgroundColor: selectedOption.colorHex }}
            />
          )}
          <span className="truncate font-semibold text-sage-900">{selectedOption?.name || placeholder}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="w-4 h-4 text-sage-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 mt-1 w-full bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 hairline-brass rounded-2xl shadow-xl overflow-hidden text-left text-xs"
          >
            {options.length > 6 && (
              <div className="p-2 border-b border-sage-200 dark:border-sage-300 bg-sage-50 dark:bg-sage-200/50">
                <input
                  type="text"
                  placeholder="Filter options..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-lg text-sage-900 focus:outline-none focus:ring-1 focus:ring-brass-500"
                  autoFocus
                />
              </div>
            )}

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-sage-400 italic">No matches found</div>
              ) : (
                filtered.map(opt => {
                  const isSelected = opt.id === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-rehab-700 dark:bg-rehab-600 text-white font-semibold'
                          : 'text-sage-800 hover:bg-sage-100 dark:hover:bg-sage-200/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {opt.colorHex && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: opt.colorHex }}
                          />
                        )}
                        <span className="truncate">{opt.name}</span>
                        {typeof opt.count === 'number' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-sage-200 dark:bg-sage-300 text-sage-600'
                            }`}
                          >
                            {opt.count}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>

            {onAddNew && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full flex items-center justify-center space-x-1 p-2 bg-sage-50 dark:bg-sage-200 border-t border-sage-200 dark:border-sage-300 text-brass-700 hover:bg-sage-100 dark:hover:bg-sage-300 font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addNewLabel || 'Quick Add'}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const BatchLoggingView: React.FC<BatchLoggingProps> = ({
  categories,
  modules,
  residents,
  attendance
}) => {
  const confirm = useConfirm();
  const toast = useToast();

  const {
    batchCategoryId,
    batchModuleId,
    batchDate,
    batchSearch,
    batchPage,
    batchPageSize,
    batchHeaderSticky,
    batchFooterSticky,
    batchHeaderMinimized,
    setBatchState
  } = useSessionStore();

  const selectedCategoryId = batchCategoryId || categories[0]?.id || '';
  const setSelectedCategoryId = (id: string) => setBatchState({ batchCategoryId: id });

  const currentCategoryModules = useMemo(
    () => modules.filter(m => m.categoryId === selectedCategoryId),
    [modules, selectedCategoryId]
  );

  const selectedModuleId = batchModuleId || currentCategoryModules[0]?.id || modules[0]?.id || '';
  const setSelectedModuleId = (id: string) => setBatchState({ batchModuleId: id });

  const selectedDate = batchDate;
  const setSelectedDate = (d: string) => setBatchState({ batchDate: d });

  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());

  // Filter Tabs
  const [residentFilterMode, setResidentFilterMode] = useState<
    'ALL' | 'PRESENT' | 'ABSENT' | 'Junior' | 'Senior' | 'Re Entry'
  >('ALL');

  // Date-Specific Session Note State
  const [sessionNote, setSessionNote] = useState('');

  // Search & Pagination
  const searchTerm = batchSearch;
  const setSearchTerm = (s: string) => setBatchState({ batchSearch: s, batchPage: 1 });

  const currentPage = batchPage;
  const setCurrentPage = (p: number) => setBatchState({ batchPage: p });

  const pageSize = batchPageSize;
  const setPageSize = (s: number) => setBatchState({ batchPageSize: s, batchPage: 1 });

  // Sticky Controls States
  const isHeaderSticky = batchHeaderSticky;
  const setIsHeaderSticky = (v: boolean | ((prev: boolean) => boolean)) => {
    setBatchState({ batchHeaderSticky: typeof v === 'function' ? v(isHeaderSticky) : v });
  };

  const isFooterSticky = batchFooterSticky;
  const setIsFooterSticky = (v: boolean | ((prev: boolean) => boolean)) => {
    setBatchState({ batchFooterSticky: typeof v === 'function' ? v(isFooterSticky) : v });
  };

  const isHeaderMinimized = batchHeaderMinimized;
  const setIsHeaderMinimized = (v: boolean | ((prev: boolean) => boolean)) => {
    setBatchState({ batchHeaderMinimized: typeof v === 'function' ? v(isHeaderMinimized) : v });
  };

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // In-Place Modals State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#2F7A54');

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [targetCatForNewModule, setTargetCatForNewModule] = useState(selectedCategoryId || '');

  const [showResidentModal, setShowResidentModal] = useState(false);
  const [newResidentName, setNewResidentName] = useState('');
  const [newResidentAdmission, setNewResidentAdmission] = useState('');
  const [newResidentElevation, setNewResidentElevation] = useState('');
  const [newResidentPhase, setNewResidentPhase] = useState<Resident['phaseStatus']>('Junior');

  const currentCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  const currentModule = useMemo(
    () => modules.find(m => m.id === selectedModuleId),
    [modules, selectedModuleId]
  );

  // Sync sessionNote whenever module or date changes
  useEffect(() => {
    if (currentModule && selectedDate) {
      setSessionNote(currentModule.sessionNotes?.[selectedDate] || '');
    } else {
      setSessionNote('');
    }
  }, [currentModule, selectedDate]);

  // Auto-reset window scroll when switching away
  useEffect(() => {
    return () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    };
  }, []);

  // Sync attendance checked state
  useEffect(() => {
    if (selectedModuleId && selectedDate) {
      const attendees = attendance
        .filter(a => a.moduleId === selectedModuleId && a.dateAttended === selectedDate)
        .map(a => a.residentId);
      setSelectedResidents(new Set(attendees));
    } else {
      setSelectedResidents(new Set());
    }
  }, [selectedModuleId, selectedDate, attendance]);

  useEffect(() => {
    if (selectedCategoryId) setTargetCatForNewModule(selectedCategoryId);
  }, [selectedCategoryId]);

  const toggleResident = (resId: string) => {
    if (!selectedDate) return;
    const next = new Set(selectedResidents);
    if (next.has(resId)) next.delete(resId);
    else next.add(resId);
    setSelectedResidents(next);
  };

  const isSessionAlreadySaved = useMemo(() => {
    if (!selectedModuleId || !selectedDate) return false;
    return attendance.some(a => a.moduleId === selectedModuleId && a.dateAttended === selectedDate);
  }, [selectedModuleId, selectedDate, attendance]);

  const filteredResidents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return residents.filter(r => {
      const matchesSearch = !q || r.fullName.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (residentFilterMode === 'PRESENT') return selectedResidents.has(r.id);
      if (residentFilterMode === 'ABSENT') return !selectedResidents.has(r.id);
      if (residentFilterMode === 'Junior' || residentFilterMode === 'Senior' || residentFilterMode === 'Re Entry') {
        return r.phaseStatus === residentFilterMode;
      }
      return true;
    });
  }, [residents, searchTerm, residentFilterMode, selectedResidents]);

  const totalPages = Math.ceil(filteredResidents.length / pageSize) || 1;

  const paginatedResidents = useMemo(() => {
    if (pageSize >= filteredResidents.length) return filteredResidents;
    const start = (currentPage - 1) * pageSize;
    return filteredResidents.slice(start, start + pageSize);
  }, [filteredResidents, currentPage, pageSize]);

  const handleSelectFiltered = () => {
    if (!selectedDate) {
      alert('Please select or add a session date first before selecting residents.');
      return;
    }
    const next = new Set(selectedResidents);
    const allFilteredSelected = filteredResidents.every(r => next.has(r.id));

    if (allFilteredSelected) {
      filteredResidents.forEach(r => next.delete(r.id));
    } else {
      filteredResidents.forEach(r => next.add(r.id));
    }
    setSelectedResidents(next);
  };

  const handleClearDate = () => {
    setSelectedDate('');
    setSessionNote('');
  };

  const handleAddDateToModuleSchedule = async (newDate: string) => {
    if (!newDate || !selectedModuleId) return;
    const mod = modules.find(m => m.id === selectedModuleId);
    if (!mod) return;

    const currentDates = mod.conductedDates || [];
    if (!currentDates.includes(newDate)) {
      await db.modules.update(selectedModuleId, {
        conductedDates: [...currentDates, newDate].sort()
      });
      toast.success(`Date ${formatToUSDate(newDate)} saved to ${mod.name}`);
    }
    setSelectedDate(newDate);
  };

  const handleDeleteScheduledDate = async (dateToDelete: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedModuleId || !currentModule) return;

    const ok = await confirm({
      title: 'Delete Scheduled Session Date?',
      message: `Removing ${formatToUSDate(dateToDelete)} from "${currentModule.name}" will delete this scheduled date, its facilitator note, and all resident attendance logs for this session. Proceed?`,
      variant: 'danger',
      confirmLabel: 'Delete Date & Records'
    });

    if (!ok) return;

    const nextDates = (currentModule.conductedDates || []).filter(d => d !== dateToDelete);
    const nextNotes = { ...(currentModule.sessionNotes || {}) };
    delete nextNotes[dateToDelete];

    await db.modules.update(selectedModuleId, {
      conductedDates: nextDates,
      sessionNotes: nextNotes
    });

    await db.attendance
      .where('moduleId')
      .equals(selectedModuleId)
      .and(a => a.dateAttended === dateToDelete)
      .delete();

    if (selectedDate === dateToDelete) {
      setSelectedDate('');
      setSessionNote('');
    }

    toast.success(`Removed session date ${formatToUSDate(dateToDelete)} and associated records.`);
  };

  const handleSave = async () => {
    if (!selectedModuleId || !selectedDate) {
      alert('Please select both a therapeutic module and session date before saving.');
      return;
    }

    if (currentModule) {
      const currentDates = currentModule.conductedDates || [];
      if (!currentDates.includes(selectedDate)) {
        await db.modules.update(selectedModuleId, {
          conductedDates: [...currentDates, selectedDate].sort()
        });
      }
    }

    const attendeeArray = Array.from(selectedResidents);
    const unattendedArray = residents.filter(r => !selectedResidents.has(r.id)).map(r => r.id);

    await batchSetAttendance(attendeeArray, selectedModuleId, selectedDate, true);
    await batchSetAttendance(unattendedArray, selectedModuleId, selectedDate, false);
    await updateModuleSessionNote(selectedModuleId, selectedDate, sessionNote);

    setIsSavedRecently(true);
    toast.success(`Saved attendance for ${attendeeArray.length} residents.`);
    setTimeout(() => setIsSavedRecently(false), 2500);
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

    setSelectedCategoryId(newId);
    setNewCategoryName('');
    setShowCategoryModal(false);
  };

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !targetCatForNewModule) return;
    const catMods = modules.filter(m => m.categoryId === targetCatForNewModule);
    const newId = `mod_${targetCatForNewModule}_${Date.now()}`;

    await db.modules.add({
      id: newId,
      categoryId: targetCatForNewModule,
      name: newModuleName.trim(),
      sortOrder: catMods.length + 1,
      conductedDates: selectedDate ? [selectedDate] : [],
      sessionNotes: {}
    });

    setSelectedCategoryId(targetCatForNewModule);
    setSelectedModuleId(newId);
    setNewModuleName('');
    setShowModuleModal(false);
  };

  const handleCreateResident = async () => {
    if (!newResidentName.trim()) return;
    const newId = `res_${Date.now()}`;

    await db.residents.add({
      id: newId,
      fullName: newResidentName.trim(),
      admissionDate: newResidentAdmission || undefined,
      elevationDate: newResidentElevation || undefined,
      phaseStatus: newResidentPhase
    });

    if (selectedDate) {
      setSelectedResidents(prev => new Set([...prev, newId]));
    }
    setNewResidentName('');
    setNewResidentAdmission('');
    setNewResidentElevation('');
    setShowResidentModal(false);
  };

  const attendancePercentage = residents.length > 0
    ? Math.round((selectedResidents.size / residents.length) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`max-w-7xl mx-auto p-4 md:p-6 space-y-5 ${isFooterSticky ? 'pb-28' : 'pb-8'}`}
    >
      {/* ============================================================= */}
      {/* 1. TOP SESSION CONTROLS & DATE CONFIG                         */}
      {/* ============================================================= */}
      <div
        className={`${
          isHeaderSticky
            ? 'sticky top-3 z-30 shadow-lg'
            : 'relative z-10 shadow-xs'
        } bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass transition-all duration-200 p-5 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brass-100/70 dark:bg-brass-500/20 flex items-center justify-center text-brass-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base md:text-lg font-medium text-sage-900 leading-tight">
                Batch Session Attendance Logging
              </h2>
              {isHeaderMinimized && currentModule && (
                <p className="text-xs text-sage-500 flex items-center space-x-1.5 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentCategory?.colorHex || '#2F7A54' }}
                  />
                  <strong className="text-sage-700">{currentCategory?.name}</strong>
                  <span>•</span>
                  <strong className="text-sage-800">{currentModule.name}</strong>
                  <span>•</span>
                  <span className="font-mono text-rehab-700 font-semibold">
                    {selectedDate ? formatToUSDate(selectedDate) : 'No Date Selected'}
                  </span>
                  {sessionNote && (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-brass-700 font-medium bg-brass-100/70 px-1.5 py-0.2 rounded-md">
                      <StickyNote className="w-2.5 h-2.5" />
                      <span>Note attached</span>
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsHeaderSticky(prev => !prev)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors border cursor-pointer ${
                isHeaderSticky
                  ? 'text-brass-700 bg-brass-100/70 dark:bg-brass-500/20 border-brass-300/60 dark:border-brass-400/30'
                  : 'text-sage-400 hover:text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 border-transparent'
              }`}
              title={isHeaderSticky ? 'Sticky Header: ON (Click to unpin)' : 'Sticky Header: OFF (Click to pin)'}
            >
              {isHeaderSticky ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsHeaderMinimized(prev => !prev)}
              className="p-2 rounded-xl text-sage-500 hover:text-sage-700 hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors cursor-pointer"
              title={isHeaderMinimized ? 'Expand settings' : 'Minimize settings'}
            >
              {isHeaderMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Session Controls */}
        <AnimatePresence initial={false}>
          {!isHeaderMinimized && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-1 border-t border-sage-200/70 dark:border-sage-300/70"
            >
              {/* Category & Module Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatedDropdown
                  label="Therapeutic Category"
                  icon={Layers}
                  value={selectedCategoryId}
                  options={categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    colorHex: c.colorHex,
                    count: modules.filter(m => m.categoryId === c.id).length
                  }))}
                  onChange={catId => {
                    setSelectedCategoryId(catId);
                    const firstMod = modules.find(m => m.categoryId === catId);
                    if (firstMod) {
                      setSelectedModuleId(firstMod.id);
                    }
                  }}
                  onAddNew={() => setShowCategoryModal(true)}
                  addNewLabel="Add Category"
                />

                <AnimatedDropdown
                  label="Therapeutic Module"
                  icon={Sparkles}
                  value={selectedModuleId}
                  options={currentCategoryModules.map(m => ({
                    id: m.id,
                    name: m.name,
                    count: m.conductedDates?.length || 0
                  }))}
                  onChange={modId => {
                    setSelectedModuleId(modId);
                  }}
                  onAddNew={() => setShowModuleModal(true)}
                  addNewLabel="Add Module"
                />
              </div>

              {/* Date Selector, Clear Button & Pre-scheduled Chips with Delete Button */}
              <div className="pt-2 space-y-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-sage-600 dark:text-sage-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-brass-600" />
                      <span>Session Date:</span>
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <DatePicker
                        value={selectedDate}
                        onChange={setSelectedDate}
                        conductedDates={currentModule?.conductedDates || []}
                      />

                      {/* Clear Date Button */}
                      {selectedDate && (
                        <button
                          type="button"
                          onClick={handleClearDate}
                          className="px-2.5 py-1.5 bg-sage-100 hover:bg-sage-200 dark:bg-sage-200 dark:hover:bg-sage-300 text-sage-600 dark:text-sage-300 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Clear selected date"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear Date</span>
                        </button>
                      )}
                    </div>

                    {/* Button to add custom date to module schedule */}
                    {selectedDate && !currentModule?.conductedDates?.includes(selectedDate) && (
                      <button
                        type="button"
                        onClick={() => handleAddDateToModuleSchedule(selectedDate)}
                        className="px-3 py-1.5 bg-rehab-100 dark:bg-rehab-500/20 hover:bg-rehab-200 text-rehab-800 dark:text-rehab-300 border border-rehab-400/40 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Add this date to the module's pre-scheduled dates"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>+ Save Date to Module</span>
                      </button>
                    )}
                  </div>

                  {/* Pre-Scheduled Date Capsules with Note Preview & Delete X */}
                  {currentModule?.conductedDates && currentModule.conductedDates.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-sage-400 uppercase tracking-wider mr-1">
                        Scheduled Dates ({currentModule.conductedDates.length}):
                      </span>
                      {currentModule.conductedDates.map(d => {
                        const isActive = selectedDate === d;
                        const dateNote = currentModule.sessionNotes?.[d];
                        const hasNoteForDate = Boolean(dateNote?.trim());

                        return (
                          <div
                            key={d}
                            className={`inline-flex items-center rounded-xl text-xs font-mono font-semibold border transition-all shadow-2xs ${
                              isActive
                                ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 dark:border-rehab-500'
                                : 'bg-white dark:bg-sage-200 text-sage-700 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedDate(isActive ? '' : d)}
                              className="px-2.5 py-1 flex items-center space-x-1.5 cursor-pointer"
                              title={isActive ? 'Click to deselect date' : `Select date ${formatToUSDate(d)}`}
                            >
                              <span>{formatToUSDate(d)}</span>
                              {hasNoteForDate && (
                                <StickyNote className={`w-3 h-3 ${isActive ? 'text-brass-300' : 'text-brass-600'}`} />
                              )}
                            </button>

                            {/* Delete Scheduled Date Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteScheduledDate(d, e)}
                              className={`p-1 mr-1 rounded hover:bg-black/20 transition-colors cursor-pointer ${
                                isActive ? 'text-white/80 hover:text-white' : 'text-sage-400 hover:text-red-500'
                              }`}
                              title={`Delete ${formatToUSDate(d)} from scheduled dates`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Date-Tied Session Note Editor */}
                {selectedDate ? (
                  <div className="p-3.5 bg-sage-50/80 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-sage-800 dark:text-sage-200 flex items-center space-x-1.5">
                        <StickyNote className="w-4 h-4 text-brass-600" />
                        <span>
                          Facilitator / Session Note for{' '}
                          <strong className="text-rehab-700 dark:text-rehab-400 font-mono text-xs">
                            {formatToUSDate(selectedDate)}
                          </strong>
                          :
                        </span>
                      </label>
                      <span className="text-[11px] text-sage-500">
                        Automatically saved when you click Save Attendance
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={sessionNote}
                      onChange={e => setSessionNote(e.target.value)}
                      placeholder={`e.g. Session highlights, discussion topics covered, or group dynamics on ${formatToUSDate(selectedDate)}...`}
                      className="w-full text-xs p-3 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 placeholder:text-sage-400 font-medium focus:ring-2 focus:ring-brass-500/40"
                    />

                    {sessionNote && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSessionNote('')}
                          className="text-[11px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Clear Note
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-brass-50/60 dark:bg-brass-500/10 border border-brass-200 dark:border-brass-400/20 rounded-2xl text-xs text-brass-800 dark:text-brass-300 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-brass-600 shrink-0" />
                    <span>
                      Select a scheduled date above or pick a custom date to mark attendance and write notes.
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================= */}
      {/* 2. INTERACTIVE KPI METRICS BAR                                */}
      {/* ============================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Present KPI */}
        <div className="p-3.5 bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500">
            <span className="font-semibold flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-rehab-600" />
              <span>Marked Present</span>
            </span>
            <span className="font-mono font-bold text-rehab-700">{attendancePercentage}%</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-bold font-display text-sage-900">
              {selectedDate ? selectedResidents.size : 0}
            </span>
            <span className="text-xs text-sage-500 font-mono">/ {residents.length}</span>
          </div>
          <div className="w-full bg-sage-100 dark:bg-sage-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rehab-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${selectedDate ? attendancePercentage : 0}%` }}
            />
          </div>
        </div>

        {/* Absent KPI */}
        <div className="p-3.5 bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500">
            <span className="font-semibold flex items-center space-x-1">
              <UserX className="w-3.5 h-3.5 text-amber-600" />
              <span>Unmarked / Absent</span>
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-bold font-display text-sage-900">
              {selectedDate ? residents.length - selectedResidents.size : 0}
            </span>
            <span className="text-xs text-sage-500 font-mono">residents</span>
          </div>
          <div className="text-[10px] text-sage-400">
            {selectedDate ? 'Will be marked as unattended' : 'Select a date'}
          </div>
        </div>

        {/* Database Sync Status */}
        <div className="p-3.5 bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500">
            <span className="font-semibold flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-brass-600" />
              <span>Session Status</span>
            </span>
          </div>
          <div className="pt-0.5">
            {selectedDate && isSessionAlreadySaved ? (
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved Record</span>
              </span>
            ) : selectedDate ? (
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unsaved Draft</span>
              </span>
            ) : (
              <span className="text-xs text-sage-400 italic">No date selected</span>
            )}
          </div>
        </div>

        {/* Total Sessions Conducted */}
        <div className="p-3.5 bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-sage-500">
            <span className="font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-rehab-600" />
              <span>Module History</span>
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-bold font-display text-sage-900">
              {currentModule?.conductedDates?.length || 0}
            </span>
            <span className="text-xs text-sage-500 font-mono">sessions scheduled</span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3. RESIDENT SELECTION WITH FULL-WIDTH SEARCH & ANIMATED TABS   */}
      {/* ============================================================= */}
      <div className="bg-white dark:bg-sage-100 p-5 md:p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-4">
        {/* ROW 1: Full-Width SearchBar & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search resident roster by full name..."
              count={filteredResidents.length}
              total={residents.length}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectFiltered}
              disabled={!selectedDate}
              className="text-xs font-semibold text-brass-700 dark:text-brass-400 hover:text-brass-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-xl bg-brass-100/70 dark:bg-brass-500/20 border border-brass-300/60 dark:border-brass-400/30 transition-colors cursor-pointer"
            >
              {filteredResidents.every(r => selectedResidents.has(r.id)) && filteredResidents.length > 0
                ? 'Deselect Filtered'
                : 'Select Filtered'}
            </button>

            <button
              type="button"
              onClick={() => setShowResidentModal(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-sage-700 hover:text-sage-900 dark:text-sage-200 px-3.5 py-2 rounded-xl bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-brass-600" />
              <span>+ Add Resident</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Animated Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-sage-400 uppercase tracking-wider mr-1 shrink-0 flex items-center space-x-1 select-none">
            <Filter className="w-3 h-3 text-brass-600" />
            <span>Filter:</span>
          </span>

          <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-2xl border border-sage-200/70 dark:border-sage-300/60 overflow-x-auto scrollbar-none gap-1">
            {([
              { id: 'ALL', label: 'All Residents', count: residents.length },
              { id: 'PRESENT', label: 'Marked Present', count: selectedResidents.size },
              { id: 'ABSENT', label: 'Unmarked / Absent', count: residents.length - selectedResidents.size },
              { id: 'Junior', label: 'Junior Phase', count: residents.filter(r => r.phaseStatus === 'Junior').length },
              { id: 'Senior', label: 'Senior Phase', count: residents.filter(r => r.phaseStatus === 'Senior').length },
              { id: 'Re Entry', label: 'Re Entry', count: residents.filter(r => r.phaseStatus === 'Re Entry').length }
            ] as const).map(tab => {
              const isActive = residentFilterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setResidentFilterMode(tab.id as any)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 select-none cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-sage-600 hover:text-sage-900 dark:text-sage-400 dark:hover:text-sage-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="batch-resident-filter-pill"
                      className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-xl shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
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

        {/* Residents Grid - Dynamic, compact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {paginatedResidents.length === 0 ? (
            <div className="col-span-full p-10 text-center text-sage-400 italic">
              {residents.length === 0
                ? 'No residents registered yet. Click "+ Add Resident" to get started.'
                : 'No residents match your search / filter criteria.'}
            </div>
          ) : (
            paginatedResidents.map(resident => {
              const isSelected = selectedResidents.has(resident.id);
              return (
                <motion.div
                  key={resident.id}
                  onClick={() => toggleResident(resident.id)}
                  whileHover={{ y: selectedDate ? -2 : 0 }}
                  whileTap={{ scale: selectedDate ? 0.98 : 1 }}
                  className={`p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2.5 h-fit ${
                    !selectedDate
                      ? 'opacity-60 cursor-not-allowed bg-sage-50/40 dark:bg-sage-200/20 border-sage-200 dark:border-sage-300'
                      : isSelected
                      ? 'cursor-pointer bg-rehab-100/90 dark:bg-rehab-500/25 border-rehab-500/70 dark:border-rehab-400/60 text-sage-900 shadow-xs'
                      : 'cursor-pointer bg-white dark:bg-sage-100 border-sage-200 dark:border-sage-300 hover:border-brass-400/70 text-sage-800 shadow-2xs'
                  }`}
                  title={!selectedDate ? 'Select a session date first' : undefined}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold font-display shrink-0 transition-colors ${
                        isSelected && selectedDate
                          ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-2xs'
                          : 'bg-sage-200 dark:bg-sage-300 text-sage-600'
                      }`}
                    >
                      {resident.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight text-sage-900">
                        {resident.fullName}
                      </div>
                      <div className="text-[10px] text-sage-400 dark:text-sage-400 font-medium">
                        {resident.phaseStatus}
                      </div>
                    </div>
                  </div>
                  {isSelected && selectedDate ? (
                    <CheckSquare className="w-4 h-4 text-rehab-700 shrink-0 ml-1" />
                  ) : (
                    <Square className="w-4 h-4 text-sage-300 dark:text-sage-500 shrink-0 ml-1" />
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Resident Pagination */}
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredResidents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* 4. ANIMATED SAVE ACTION BAR                                   */}
      {/* ============================================================= */}
      {(() => {
        const footerVariants = {
          hidden: { opacity: 0, y: 36, scale: 0.96 },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const, delay: 0.15 }
          },
          exit: {
            opacity: 0,
            y: 12,
            scale: 0.98,
            transition: { duration: 0.15, ease: 'easeIn' as const }
          }
        };

        const footerContent = (
          <div className="bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-rehab-100/80 dark:bg-rehab-500/20 text-rehab-900 font-semibold border border-rehab-400/40 dark:border-rehab-500/30">
                <span className="font-bold">{selectedDate ? selectedResidents.size : 0}</span> of {residents.length} marked present
              </div>
              {selectedDate ? (
                <span className="hidden sm:inline-block font-mono text-sage-500 text-[11px]">
                  Date: <strong className="text-sage-700">{formatToUSDate(selectedDate)}</strong>
                </span>
              ) : (
                <span className="hidden sm:inline-block text-sage-400 italic text-[11px]">
                  (No date selected)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => setIsFooterSticky(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                  isFooterSticky
                    ? 'bg-brass-100/70 dark:bg-brass-500/20 border-brass-300/60 dark:border-brass-400/30 text-brass-800'
                    : 'bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-300'
                }`}
                title={isFooterSticky ? 'Sticky Footer: ON (Click to unpin)' : 'Sticky Footer: OFF (Click to pin)'}
              >
                {isFooterSticky ? (
                  <Pin className="w-3.5 h-3.5 text-brass-600" />
                ) : (
                  <PinOff className="w-3.5 h-3.5 text-sage-400" />
                )}
                <span className="hidden sm:inline">
                  {isFooterSticky ? 'Sticky Bar: ON' : 'Sticky Bar: OFF'}
                </span>
              </button>

              <motion.button
                whileHover={{ scale: selectedDate ? 1.02 : 1 }}
                whileTap={{ scale: selectedDate ? 0.96 : 1 }}
                onClick={handleSave}
                disabled={!selectedDate}
                className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  !selectedDate
                    ? 'bg-sage-300 text-sage-500 opacity-50 cursor-not-allowed'
                    : isSavedRecently
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white'
                }`}
              >
                {isSavedRecently ? <Check className="w-4 h-4 stroke-3" /> : <Save className="w-4 h-4" />}
                <span>{isSavedRecently ? 'Attendance & Note Saved!' : 'Save Attendance & Note'}</span>
              </motion.button>
            </div>
          </div>
        );

        if (isFooterSticky) {
          return createPortal(
            <motion.div
              variants={footerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40"
            >
              {footerContent}
            </motion.div>,
            document.body
          );
        }

        return (
          <motion.div
            variants={footerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-4xl mx-auto mt-6 px-4 relative z-10"
          >
            {footerContent}
          </motion.div>
        );
      })()}

      {/* ============================================================= */}
      {/* 5. IN-PLACE CREATION MODALS                                    */}
      {/* ============================================================= */}
      {/* Modal: Add Category */}
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

      {/* Modal: Add Module */}
      <ModalShell
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        title="Add Therapeutic Module"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Parent Category *
            </label>
            <select
              value={targetCatForNewModule}
              onChange={e => setTargetCatForNewModule(e.target.value)}
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
              onClick={() => setShowModuleModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newModuleName.trim() || !targetCatForNewModule}
              onClick={handleCreateModule}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>

      {/* Modal: Add Resident */}
      <ModalShell
        isOpen={showResidentModal}
        onClose={() => setShowResidentModal(false)}
        title="Add New Resident"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={newResidentName}
              onChange={e => setNewResidentName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Admission Date
            </label>
            <DatePicker
              value={newResidentAdmission}
              onChange={setNewResidentAdmission}
              size="md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Elevation Date
            </label>
            <DatePicker
              value={newResidentElevation}
              onChange={setNewResidentElevation}
              size="md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 mb-1">
              Phase Status
            </label>
            <select
              value={newResidentPhase}
              onChange={e => setNewResidentPhase(e.target.value as any)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
            >
              <option value="Junior">Junior Phase</option>
              <option value="Senior">Senior Phase</option>
              <option value="Re Entry">Re Entry</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setShowResidentModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newResidentName.trim()}
              onClick={handleCreateResident}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add & Select</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>
    </motion.div>
  );
};