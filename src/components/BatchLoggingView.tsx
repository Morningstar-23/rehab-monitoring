// src/components/BatchLoggingView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { useSessionStore } from '../utils/useSessionStore';
import { batchSetAttendance, db } from '../db/db';
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
  PinOff
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
  '#2F7A54', // Forest Emerald
  '#B08D57', // Brass Gold
  '#2563EB', // Sapphire Blue
  '#7C3AED', // Royal Purple
  '#D97706', // Warm Amber
  '#DC2626', // Crimson
  '#0D9488', // Teal
  '#4B5563'  // Slate
];

// ----------------------------------------------------------------------
// Reusable In-Place Modal Shell
// ----------------------------------------------------------------------
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
            <h3 className="font-display font-semibold text-base text-sage-900 dark:text-sage-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 p-1 rounded-xl hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors"
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

// ----------------------------------------------------------------------
// Animated Dropdown Component
// ----------------------------------------------------------------------
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
          <Icon className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
          <span>{label}</span>
        </label>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="text-[11px] font-semibold text-brass-700 dark:text-brass-400 hover:underline flex items-center space-x-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>{addNewLabel || 'Add New'}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-2.5 bg-sage-50/70 dark:bg-sage-200/50 border border-sage-200 dark:border-sage-300 rounded-xl text-left text-xs font-medium text-sage-900 dark:text-sage-100 hover:border-brass-500/60 focus:outline-none focus:ring-2 focus:ring-brass-500/40 shadow-2xs transition-all"
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {selectedOption?.colorHex && (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
              style={{ backgroundColor: selectedOption.colorHex }}
            />
          )}
          <span className="truncate">{selectedOption?.name || placeholder}</span>
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
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-lg text-sage-900 dark:text-sage-100 focus:outline-none focus:ring-1 focus:ring-brass-500"
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
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-rehab-700 dark:bg-rehab-600 text-white font-semibold'
                          : 'text-sage-800 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-200/80'
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
                                : 'bg-sage-200 dark:bg-sage-300 text-sage-600 dark:text-sage-300'
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
                className="w-full flex items-center justify-center space-x-1 p-2 bg-sage-50 dark:bg-sage-200 border-t border-sage-200 dark:border-sage-300 text-brass-700 dark:text-brass-300 hover:bg-sage-100 dark:hover:bg-sage-300 font-semibold transition-colors"
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

// ----------------------------------------------------------------------
// Main BatchLoggingView Component
// ----------------------------------------------------------------------
export const BatchLoggingView: React.FC<BatchLoggingProps> = ({
  categories,
  modules,
  residents,
  attendance
}) => {
  // Session Store State (Persisted across tab switches)
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
  const [newResidentPhase, setNewResidentPhase] = useState<Resident['phaseStatus']>('Junior');

  const currentCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  const currentModule = useMemo(
    () => modules.find(m => m.id === selectedModuleId),
    [modules, selectedModuleId]
  );

  // Auto-reset window scroll when switching away from this tab
  useEffect(() => {
    return () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    };
  }, []);

  // Auto-select first date if module has conducted dates and no date is chosen yet
  useEffect(() => {
    if (!selectedDate && currentModule?.conductedDates && currentModule.conductedDates.length > 0) {
      setSelectedDate(currentModule.conductedDates[0]);
    }
  }, [selectedModuleId, currentModule, selectedDate]);

  // Sync attendance checked state
  useEffect(() => {
    if (selectedModuleId && selectedDate) {
      const attendees = attendance
        .filter(a => a.moduleId === selectedModuleId && a.dateAttended === selectedDate)
        .map(a => a.residentId);
      setSelectedResidents(new Set(attendees));
    }
  }, [selectedModuleId, selectedDate, attendance]);

  // Keep targetCatForNewModule synced when category changes
  useEffect(() => {
    if (selectedCategoryId) setTargetCatForNewModule(selectedCategoryId);
  }, [selectedCategoryId]);

  const toggleResident = (resId: string) => {
    const next = new Set(selectedResidents);
    if (next.has(resId)) next.delete(resId);
    else next.add(resId);
    setSelectedResidents(next);
  };

  const filteredResidents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return residents;
    return residents.filter(r => r.fullName.toLowerCase().includes(q));
  }, [residents, searchTerm]);

  const totalPages = Math.ceil(filteredResidents.length / pageSize) || 1;

  const paginatedResidents = useMemo(() => {
    if (pageSize >= filteredResidents.length) return filteredResidents;
    const start = (currentPage - 1) * pageSize;
    return filteredResidents.slice(start, start + pageSize);
  }, [filteredResidents, currentPage, pageSize]);

  const handleSelectFiltered = () => {
    const next = new Set(selectedResidents);
    const allFilteredSelected = filteredResidents.every(r => next.has(r.id));

    if (allFilteredSelected) {
      filteredResidents.forEach(r => next.delete(r.id));
    } else {
      filteredResidents.forEach(r => next.add(r.id));
    }
    setSelectedResidents(next);
  };

  const handleSave = async () => {
    if (!selectedModuleId || !selectedDate) {
      alert('Please select both a therapeutic module and session date before saving.');
      return;
    }
    const attendeeArray = Array.from(selectedResidents);
    const unattendedArray = residents.filter(r => !selectedResidents.has(r.id)).map(r => r.id);

    await batchSetAttendance(attendeeArray, selectedModuleId, selectedDate, true);
    await batchSetAttendance(unattendedArray, selectedModuleId, selectedDate, false);

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  // --------------------------------------------------------------------
  // Quick In-Place Creation Handlers
  // --------------------------------------------------------------------
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
      conductedDates: selectedDate ? [selectedDate] : []
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
      phaseStatus: newResidentPhase
    });

    setSelectedResidents(prev => new Set([...prev, newId]));
    setNewResidentName('');
    setNewResidentAdmission('');
    setShowResidentModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`max-w-6xl mx-auto p-4 md:p-6 space-y-6 ${isFooterSticky ? 'pb-28' : 'pb-8'}`}
    >
      {/* ------------------------------------------------------------- */}
      {/* Top Session Configuration Header with Pin / Minimize Controls */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`${
          isHeaderSticky
            ? 'sticky top-3 z-30 shadow-lg'
            : 'relative z-10 shadow-xs'
        } bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass transition-all duration-200 p-5 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brass-100/70 dark:bg-brass-500/20 flex items-center justify-center text-brass-700 dark:text-brass-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base md:text-lg font-medium text-sage-900 dark:text-sage-100 leading-tight">
                Batch Session Attendance Logging
              </h2>
              {isHeaderMinimized && currentModule && (
                <p className="text-xs text-sage-500 dark:text-sage-400 flex items-center space-x-1.5 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentCategory?.colorHex || '#2F7A54' }}
                  />
                  <strong className="text-sage-700 dark:text-sage-300">{currentCategory?.name}</strong>
                  <span>•</span>
                  <strong className="text-sage-800 dark:text-sage-100">{currentModule.name}</strong>
                  <span>•</span>
                  <span className="font-mono text-rehab-700 dark:text-rehab-400 font-semibold">
                    {selectedDate ? formatToUSDate(selectedDate) : 'No Date'}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Toggle Sticky Header Pin */}
            <button
              type="button"
              onClick={() => setIsHeaderSticky(prev => !prev)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors border ${
                isHeaderSticky
                  ? 'text-brass-700 dark:text-brass-300 bg-brass-100/70 dark:bg-brass-500/20 border-brass-300/60 dark:border-brass-400/30'
                  : 'text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-200 border-transparent'
              }`}
              title={isHeaderSticky ? 'Sticky Header: ON (Click to unpin)' : 'Sticky Header: OFF (Click to pin)'}
            >
              {isHeaderSticky ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>

            {/* Toggle Minimize/Maximize Header */}
            <button
              type="button"
              onClick={() => setIsHeaderMinimized(prev => !prev)}
              className="p-2 rounded-xl text-sage-500 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors"
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
              {/* Category & Module Custom Dropdowns with in-place Quick-Add */}
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
                      if (firstMod.conductedDates && firstMod.conductedDates.length > 0) {
                        setSelectedDate(firstMod.conductedDates[0]);
                      }
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
                    const mod = modules.find(m => m.id === modId);
                    if (mod?.conductedDates && mod.conductedDates.length > 0) {
                      setSelectedDate(mod.conductedDates[0]);
                    }
                  }}
                  onAddNew={() => setShowModuleModal(true)}
                  addNewLabel="Add Module"
                />
              </div>

              {/* Date Selector & Pre-scheduled Chips */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-sage-600 dark:text-sage-400">
                    Session Date:
                  </span>
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    conductedDates={currentModule?.conductedDates || []}
                  />
                </div>

                {currentModule?.conductedDates && currentModule.conductedDates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-sage-400 uppercase tracking-wider mr-1">
                      Pre-Scheduled:
                    </span>
                    {currentModule.conductedDates.map(d => {
                      const isActive = selectedDate === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                            isActive
                              ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 dark:border-rehab-500 shadow-2xs'
                              : 'bg-sage-50 dark:bg-sage-200 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                          }`}
                        >
                          {formatToUSDate(d)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Resident Selection Card Grid with Search & Pagination        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-sage-100 p-5 md:p-6 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sage-200/70 dark:border-sage-300/70">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search residents..."
            count={filteredResidents.length}
            total={residents.length}
            className="sm:w-80"
          />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSelectFiltered}
              className="text-xs font-semibold text-brass-700 dark:text-brass-300 hover:text-brass-800 dark:hover:text-brass-200 px-3 py-1.5 rounded-xl bg-brass-100/70 dark:bg-brass-500/20 border border-brass-300/60 dark:border-brass-400/30 transition-colors"
            >
              {filteredResidents.every(r => selectedResidents.has(r.id)) && filteredResidents.length > 0
                ? 'Deselect Filtered'
                : 'Select Filtered'}
            </button>

            <button
              type="button"
              onClick={() => setShowResidentModal(true)}
              className="flex items-center space-x-1 text-xs font-semibold text-sage-700 dark:text-sage-300 hover:text-sage-900 dark:hover:text-sage-100 px-3 py-1.5 rounded-xl bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
              <span>+ Add Resident</span>
            </button>
          </div>
        </div>

        {/* Residents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 min-h-[220px]">
          {paginatedResidents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-sage-400 italic">
              {residents.length === 0
                ? 'No residents registered yet. Click "+ Add Resident" to get started.'
                : 'No residents match your search query.'}
            </div>
          ) : (
            paginatedResidents.map(resident => {
              const isSelected = selectedResidents.has(resident.id);
              return (
                <motion.div
                  key={resident.id}
                  onClick={() => toggleResident(resident.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-2xl border cursor-pointer select-none flex items-center justify-between transition-colors duration-150 ${
                    isSelected
                      ? 'bg-rehab-100/80 dark:bg-rehab-500/20 border-rehab-500/60 dark:border-rehab-400/50 text-sage-900 dark:text-sage-100 shadow-xs'
                      : 'bg-sage-50/60 dark:bg-sage-200/40 border-sage-200 dark:border-sage-300 hover:border-brass-400/60 text-sage-700 dark:text-sage-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-semibold font-display shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-2xs'
                          : 'bg-sage-200 dark:bg-sage-300 text-sage-600 dark:text-sage-300'
                      }`}
                    >
                      {resident.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight text-sage-900 dark:text-sage-100">
                        {resident.fullName}
                      </div>
                      <div className="text-[10px] text-sage-400 dark:text-sage-400 font-medium">
                        {resident.phaseStatus}
                      </div>
                    </div>
                  </div>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-rehab-700 dark:text-rehab-400 shrink-0 ml-1" />
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

      {/* ------------------------------------------------------------- */}
      {/* Animated Save Action Bar with Smooth Entrance & Pin Control   */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.15
        }}
        className={
          isFooterSticky
            ? 'fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40'
            : 'w-full max-w-4xl mx-auto mt-6 px-4 relative z-10'
        }
      >
        <div className="bg-white dark:bg-sage-100 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-rehab-100/80 dark:bg-rehab-500/20 text-rehab-900 dark:text-rehab-300 font-semibold border border-rehab-400/40 dark:border-rehab-500/30">
              <span className="font-bold">{selectedResidents.size}</span> of {residents.length} marked present
            </div>
            {selectedDate && (
              <span className="hidden sm:inline-block font-mono text-sage-500 dark:text-sage-400 text-[11px]">
                Date: <strong className="text-sage-700 dark:text-sage-200">{formatToUSDate(selectedDate)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Sticky Footer Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsFooterSticky(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
                isFooterSticky
                  ? 'bg-brass-100/70 dark:bg-brass-500/20 border-brass-300/60 dark:border-brass-400/30 text-brass-800 dark:text-brass-300'
                  : 'bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-300'
              }`}
              title={isFooterSticky ? 'Sticky Footer: ON (Click to unpin)' : 'Sticky Footer: OFF (Click to pin)'}
            >
              {isFooterSticky ? (
                <Pin className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
              ) : (
                <PinOff className="w-3.5 h-3.5 text-sage-400" />
              )}
              <span className="hidden sm:inline">
                {isFooterSticky ? 'Sticky Bar: ON' : 'Sticky Bar: OFF'}
              </span>
            </button>

            {/* Save Attendance Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSave}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                isSavedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white'
              }`}
            >
              {isSavedRecently ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
              <span>{isSavedRecently ? 'Attendance Saved!' : 'Save Attendance'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* IN-PLACE MODAL: Add Category                                  */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Create New Category"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Cognitive Behavioral Therapy"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 dark:text-sage-100 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1.5">
              Theme Color
            </label>
            <div className="flex items-center gap-2 mb-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
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
              <span className="text-xs font-mono uppercase text-sage-600 dark:text-sage-400 font-medium">
                {newCategoryColor}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newCategoryName.trim()}
              onClick={handleCreateCategory}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>

      {/* ------------------------------------------------------------- */}
      {/* IN-PLACE MODAL: Add Module                                    */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        title="Add Therapeutic Module"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Parent Category *
            </label>
            <select
              value={targetCatForNewModule}
              onChange={e => setTargetCatForNewModule(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 dark:text-sage-100 font-medium focus:ring-2 focus:ring-brass-500/40"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Module Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Relapse Prevention Strategies"
              value={newModuleName}
              onChange={e => setNewModuleName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 dark:text-sage-100 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setShowModuleModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newModuleName.trim() || !targetCatForNewModule}
              onClick={handleCreateModule}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </motion.button>
          </div>
        </div>
      </ModalShell>

      {/* ------------------------------------------------------------- */}
      {/* IN-PLACE MODAL: Add Resident                                  */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={showResidentModal}
        onClose={() => setShowResidentModal(false)}
        title="Add New Resident"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={newResidentName}
              onChange={e => setNewResidentName(e.target.value)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 dark:text-sage-100 font-medium focus:ring-2 focus:ring-brass-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Admission Date
            </label>
            <DatePicker
              value={newResidentAdmission}
              onChange={setNewResidentAdmission}
              size="md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-600 dark:text-sage-400 mb-1">
              Phase Status
            </label>
            <select
              value={newResidentPhase}
              onChange={e => setNewResidentPhase(e.target.value as any)}
              className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-sage-50 dark:bg-sage-200 text-sage-900 dark:text-sage-100 font-medium focus:ring-2 focus:ring-brass-500/40"
            >
              <option value="Junior">Junior Phase</option>
              <option value="Senior">Senior Phase</option>
              <option value="Aftercare">Aftercare</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-sage-200/70 dark:border-sage-300/70">
            <button
              type="button"
              onClick={() => setShowResidentModal(false)}
              className="px-4 py-2 text-xs font-semibold text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              disabled={!newResidentName.trim()}
              onClick={handleCreateResident}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
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