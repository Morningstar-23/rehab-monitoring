// src/components/MatrixView.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module, Resident, AttendanceRecord, MatrixSettings } from '../types';
import { formatToUSDate } from '../utils/dateUtils';
import { useSessionStore } from '../utils/useSessionStore';
import {
  toggleAttendance,
  getMatrixSettings,
  setColumnWidth,
  resetColumnWidths,
  updateMatrixSettings,
  getDefaultModuleColWidth,
  DEFAULT_MATRIX_SETTINGS,
  db
} from '../db/db';
import { Pagination } from './Pagination';
import { DatePicker } from './DatePicker';
import {
  Search,
  Plus,
  X,
  Palette,
  RotateCcw,
  GripVertical,
  Check,
  Calendar,
  CalendarPlus,
  Pin,
  PinOff,
  Users,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  ChevronDown,
  Layers
} from 'lucide-react';

interface MatrixViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

type SortField = 'default' | 'name' | 'admission' | 'elevation' | 'sessionsTotal';
type SortDirection = 'asc' | 'desc';
type PhaseFilter = 'ALL' | 'Junior' | 'Senior' | 'Re Entry';
type AttendanceFilter = 'ALL' | 'HAS_ATTENDANCE' | 'NO_ATTENDANCE';

const MIN_COL_WIDTH = 70;
const MAX_COL_WIDTH = 400;
const NAME_COL_MIN = 140;

function getContrastTextColor(hexColor?: string, fallback = '#171A15'): string {
  if (!hexColor || hexColor.length < 6) return fallback;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#171A15' : '#FFFFFF';
}

// ----------------------------------------------------------------------
// Memoized Row Component (Renders once per resident)
// ----------------------------------------------------------------------
interface MatrixRowProps {
  resident: Resident;
  index: number;
  sortedCats: Category[];
  catModuleMap: Map<string, Module[]>;
  attMap: Map<string, string[]>;
  stickDates: boolean;
  offsets: { nameLeft: number; admissionLeft: number; elevationLeft: number };
  sessionsTotalBgHex: string;
  onCellClick: (residentId: string, moduleId: string) => void;
}

const ROW_STAGGER_STEP = 0.018;
const ROW_STAGGER_MAX_DELAY = 0.35;

const MatrixRowItem = memo<MatrixRowProps>(({
  resident,
  index,
  sortedCats,
  catModuleMap,
  attMap,
  stickDates,
  offsets,
  sessionsTotalBgHex,
  onCellClick
}) => {
  let attendedTotal = 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: Math.min(index * ROW_STAGGER_STEP, ROW_STAGGER_MAX_DELAY),
        ease: [0.22, 1, 0.36, 1]
      }}
      className="hover:bg-sage-100/70 dark:hover:bg-sage-200/50 transition-colors"
    >
      {/* Name */}
      <td
        className="sticky z-20 p-2.5 font-medium text-sage-900 border-r border-b border-sage-200 dark:border-sage-300 bg-white dark:bg-sage-100"
        style={{ left: offsets.nameLeft }}
      >
        <div className="truncate font-semibold text-xs flex items-center justify-between" title={resident.fullName}>
          <span className="truncate">{resident.fullName}</span>
          <span className="text-[10px] text-sage-400 font-mono ml-1 shrink-0 font-normal">
            {resident.phaseStatus}
          </span>
        </div>
      </td>

      {/* Admission */}
      <td
        className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100' : 'bg-white dark:bg-sage-100'} p-2 text-center text-sage-700 font-mono text-xs border-r border-b border-sage-200 dark:border-sage-300`}
        style={{ left: stickDates ? offsets.admissionLeft : undefined }}
      >
        <div className="truncate font-medium">
          {formatToUSDate(resident.admissionDate) || '—'}
        </div>
      </td>

      {/* Elevation */}
      <td
        className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100' : 'bg-white dark:bg-sage-100'} p-2 text-center text-sage-700 font-mono text-xs border-r border-b border-sage-300 dark:border-sage-400`}
        style={{ left: stickDates ? offsets.elevationLeft : undefined }}
      >
        <div className="truncate font-medium">
          {formatToUSDate(resident.elevationDate) || '—'}
        </div>
      </td>

      {/* Modules */}
      {sortedCats.map(cat => {
        const mods = catModuleMap.get(cat.id) || [];
        const catThemeColor = cat.colorHex || '#2F7A54';

        return mods.map(mod => {
          const dates = attMap.get(`${resident.id}_${mod.id}`) || [];
          if (dates.length > 0) attendedTotal++;

          return (
            <td
              key={mod.id}
              onClick={() => onCellClick(resident.id, mod.id)}
              className="p-1.5 text-center border-r border-b border-sage-200 dark:border-sage-300 cursor-pointer hover:bg-brass-100/30 dark:hover:bg-brass-500/15 relative bg-white dark:bg-sage-100 select-none"
            >
              {dates.length > 0 ? (
                <div className="space-y-0.5">
                  {dates.map((d, i) => (
                    <span
                      key={i}
                      className="inline-block px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border shadow-xs"
                      style={{
                        backgroundColor: `${catThemeColor}28`,
                        borderColor: `${catThemeColor}80`,
                        color: catThemeColor
                      }}
                    >
                      {formatToUSDate(d)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sage-400 dark:text-sage-600 select-none">—</span>
              )}
            </td>
          );
        });
      })}

      {/* Sessions Total */}
      <td
        className="sticky right-0 z-20 p-2 text-center font-bold font-mono border-l border-b border-sage-300 dark:border-sage-400 bg-white dark:bg-sage-100"
        style={{ color: sessionsTotalBgHex }}
      >
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs"
          style={{
            backgroundColor: `${sessionsTotalBgHex}25`,
            borderColor: `${sessionsTotalBgHex}60`,
            color: sessionsTotalBgHex
          }}
        >
          {attendedTotal}
        </span>
      </td>
    </motion.tr>
  );
});

// ----------------------------------------------------------------------
// Main MatrixView Component
// ----------------------------------------------------------------------
export const MatrixView: React.FC<MatrixViewProps> = ({ categories, modules, residents, attendance }) => {
  const { matrixSearch, matrixPage, matrixPageSize, matrixStickDates, setMatrixState } = useSessionStore();

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const searchTerm = matrixSearch;
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const setSearchTerm = (term: string) => setMatrixState({ matrixSearch: term, matrixPage: 1 });

  const currentPage = matrixPage;
  const setCurrentPage = (page: number) => setMatrixState({ matrixPage: page });

  const pageSize = matrixPageSize;
  const setPageSize = (size: number) => setMatrixState({ matrixPageSize: size, matrixPage: 1 });

  const stickDates = matrixStickDates;
  const setStickDates = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof valOrFn === 'function' ? valOrFn(stickDates) : valOrFn;
    setMatrixState({ matrixStickDates: next });
  };

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('ALL');

  const [popoverCell, setPopoverCell] = useState<{ residentId: string; moduleId: string } | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [settings, setSettings] = useState<MatrixSettings>(DEFAULT_MATRIX_SETTINGS);
  const [showColorPanel, setShowColorPanel] = useState(false);

  const defaultModWidth = getDefaultModuleColWidth();
  const [widths, setWidths] = useState<Record<string, number>>(DEFAULT_MATRIX_SETTINGS.columnWidths);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    getMatrixSettings().then(s => {
      setSettings(s);
      setWidths(s.columnWidths);
    });
  }, []);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const { sortedCats, sortedMods, catModuleMap } = useMemo(() => {
    const cats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const mods = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
    const map = new Map<string, Module[]>();
    for (const c of cats) map.set(c.id, []);
    for (const m of mods) {
      const list = map.get(m.categoryId);
      if (list) list.push(m);
    }
    return { sortedCats: cats, sortedMods: mods, catModuleMap: map };
  }, [categories, modules]);

  const attMap = useMemo(() => {
    if (!isHydrated) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const a of attendance) {
      const key = `${a.residentId}_${a.moduleId}`;
      const list = map.get(key);
      if (list) list.push(a.dateAttended);
      else map.set(key, [a.dateAttended]);
    }
    return map;
  }, [attendance, isHydrated]);

  // Map resident total sessions attended
  const residentTotalSessionsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attendance) {
      map.set(a.residentId, (map.get(a.residentId) || 0) + 1);
    }
    return map;
  }, [attendance]);

  // Processed, Filtered & Sorted Residents
  const processedResidents = useMemo(() => {
    let list = [...residents];

    // 1. Search Query Filter
    const query = deferredSearchTerm.toLowerCase().trim();
    if (query) {
      list = list.filter(r => r.fullName.toLowerCase().includes(query));
    }

    // 2. Phase Status Filter
    if (phaseFilter !== 'ALL') {
      list = list.filter(r => r.phaseStatus === phaseFilter);
    }

    // 3. Attendance Status Filter
    if (attendanceFilter === 'HAS_ATTENDANCE') {
      list = list.filter(r => (residentTotalSessionsMap.get(r.id) || 0) > 0);
    } else if (attendanceFilter === 'NO_ATTENDANCE') {
      list = list.filter(r => (residentTotalSessionsMap.get(r.id) || 0) === 0);
    }

    // 4. Sorting Logic
    if (sortField !== 'default') {
      list.sort((a, b) => {
        if (sortField === 'name') {
          const comp = a.fullName.localeCompare(b.fullName);
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (sortField === 'admission') {
          const dateA = a.admissionDate || '';
          const dateB = b.admissionDate || '';
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          const comp = dateA.localeCompare(dateB);
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (sortField === 'elevation') {
          const dateA = a.elevationDate || '';
          const dateB = b.elevationDate || '';
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          const comp = dateA.localeCompare(dateB);
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (sortField === 'sessionsTotal') {
          const countA = residentTotalSessionsMap.get(a.id) || 0;
          const countB = residentTotalSessionsMap.get(b.id) || 0;
          const comp = countA - countB;
          return sortDirection === 'asc' ? comp : -comp;
        }
        return 0;
      });
    }

    return list;
  }, [
    residents,
    deferredSearchTerm,
    phaseFilter,
    attendanceFilter,
    sortField,
    sortDirection,
    residentTotalSessionsMap
  ]);

  const totalPages = Math.ceil(processedResidents.length / pageSize) || 1;

  const paginatedResidents = useMemo(() => {
    if (!isHydrated) return [];
    if (pageSize >= processedResidents.length) return processedResidents;
    const start = (currentPage - 1) * pageSize;
    return processedResidents.slice(start, start + pageSize);
  }, [processedResidents, currentPage, pageSize, isHydrated]);

  const getWidth = useCallback(
    (key: string) => widths[key] ?? defaultModWidth,
    [widths, defaultModWidth]
  );

  const offsets = useMemo(() => ({
    nameLeft: 0,
    admissionLeft: getWidth('name'),
    elevationLeft: getWidth('name') + getWidth('admission')
  }), [getWidth]);

  const handleHeaderSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResizeStart = (key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: getWidth(key) };

    let animationFrameId: number | null = null;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!resizingRef.current) return;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!resizingRef.current) return;
        const { key: k, startX, startWidth } = resizingRef.current;
        const delta = moveEvent.clientX - startX;
        const min = k === 'name' ? NAME_COL_MIN : MIN_COL_WIDTH;
        const next = Math.min(MAX_COL_WIDTH, Math.max(min, startWidth + delta));
        setWidths(prev => ({ ...prev, [k]: next }));
      });
    };

    const handlePointerUp = () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (resizingRef.current) {
        const { key: k } = resizingRef.current;
        setWidths(prev => {
          setColumnWidth(k, prev[k] ?? defaultModWidth);
          return prev;
        });
      }
      resizingRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleResetWidths = async () => {
    await resetColumnWidths();
    const fresh = await getMatrixSettings();
    setWidths(fresh.columnWidths);
  };

  const handleSettingsChange = async (patch: Partial<MatrixSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await updateMatrixSettings(patch);
  };

  const handleResetColors = async () => {
    const defaults = {
      residentDetailsBgHex: DEFAULT_MATRIX_SETTINGS.residentDetailsBgHex,
      residentDetailsTextHex: DEFAULT_MATRIX_SETTINGS.residentDetailsTextHex,
      sessionsTotalBgHex: DEFAULT_MATRIX_SETTINGS.sessionsTotalBgHex,
      sessionsTotalTextHex: DEFAULT_MATRIX_SETTINGS.sessionsTotalTextHex
    };
    setSettings(prev => ({ ...prev, ...defaults }));
    await updateMatrixSettings(defaults);
  };

  const handleAddDateToModuleSchedule = async (moduleId: string, dateStr: string) => {
    if (!dateStr) return;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const currentDates = mod.conductedDates || [];
    if (!currentDates.includes(dateStr)) {
      await db.modules.update(moduleId, {
        conductedDates: [...currentDates, dateStr].sort()
      });
      setNewScheduleDate('');
    }
  };

  const handleCellClick = useCallback((residentId: string, moduleId: string) => {
    setPopoverCell({ residentId, moduleId });
  }, []);

  const totalTableWidth = useMemo(() => {
    const modWidthSum = sortedMods.reduce((sum, m) => sum + getWidth(m.id), 0);
    return getWidth('name') + getWidth('admission') + getWidth('elevation') + modWidthSum + getWidth('sessionsTotal');
  }, [sortedMods, getWidth]);

  const activeResident = useMemo(() => residents.find(r => r.id === popoverCell?.residentId), [residents, popoverCell]);
  const activeModule = useMemo(() => modules.find(m => m.id === popoverCell?.moduleId), [modules, popoverCell]);
  const activeCategory = useMemo(() => categories.find(c => c.id === activeModule?.categoryId), [categories, activeModule]);
  const activeDates = useMemo(() => (popoverCell ? attMap.get(`${popoverCell.residentId}_${popoverCell.moduleId}`) || [] : []), [popoverCell, attMap]);

  const SORT_PRESETS: { field: SortField; dir: SortDirection; label: string; icon: React.ElementType }[] = [
    { field: 'default', dir: 'asc', label: 'Default Order', icon: Layers },
    { field: 'name', dir: 'asc', label: 'Name: A → Z', icon: ArrowDownAZ },
    { field: 'name', dir: 'desc', label: 'Name: Z → A', icon: ArrowUpAZ },
    { field: 'admission', dir: 'asc', label: 'Admission: Earliest First', icon: Calendar },
    { field: 'admission', dir: 'desc', label: 'Admission: Latest First', icon: Calendar },
    { field: 'elevation', dir: 'asc', label: 'Evaluation: Earliest First', icon: Clock },
    { field: 'elevation', dir: 'desc', label: 'Evaluation: Latest First', icon: Clock },
    { field: 'sessionsTotal', dir: 'asc', label: 'Sessions: Least to Greatest', icon: TrendingUp },
    { field: 'sessionsTotal', dir: 'desc', label: 'Sessions: Greatest to Least', icon: TrendingDown }
  ];

  const currentSortPreset = SORT_PRESETS.find(
    p => p.field === sortField && (sortField === 'default' || p.dir === sortDirection)
  ) || SORT_PRESETS[0];

  const SortPresetIcon = currentSortPreset.icon;

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-84px)] space-y-3 transform-gpu">
      {/* ============================================================= */}
      {/* 1. TOP CONTROLS & FILTER TOOLBAR                               */}
      {/* ============================================================= */}
      <div className="shrink-0 bg-white dark:bg-sage-100 p-3.5 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs space-y-3">
        {/* ROW 1: Full-Width Search Bar + Sort + Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search matrix by resident full name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-xs bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 font-medium focus:outline-none focus:ring-2 focus:ring-brass-500/40 focus:border-brass-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Custom Animated Sort Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(prev => !prev)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-200 rounded-xl text-xs font-semibold hover:border-brass-500/60 transition-all cursor-pointer shadow-2xs"
              >
                <SortPresetIcon className="w-3.5 h-3.5 text-brass-600" />
                <span>{currentSortPreset.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-sage-400 ml-0.5" />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 hairline-brass rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5"
                  >
                    {SORT_PRESETS.map((preset, idx) => {
                      const isSelected =
                        sortField === preset.field && (preset.field === 'default' || sortDirection === preset.dir);
                      const Icon = preset.icon;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSortField(preset.field);
                            setSortDirection(preset.dir);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-rehab-700 dark:bg-rehab-600 text-white font-semibold'
                              : 'text-sage-800 hover:bg-sage-100 dark:hover:bg-sage-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{preset.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Columns Toggle */}
            <button
              onClick={() => setStickDates(v => !v)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-200 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors cursor-pointer"
            >
              {stickDates ? <Pin className="w-3.5 h-3.5 text-brass-600" /> : <PinOff className="w-3.5 h-3.5 text-sage-400" />}
              <span>{stickDates ? 'Sticky: Full' : 'Sticky: Name'}</span>
            </button>

            {/* Cell Colors Modal Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowColorPanel(v => !v)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-200 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-brass-600" />
                <span>Colors</span>
              </button>

              <AnimatePresence>
                {showColorPanel && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full right-0 mt-2 w-80 bg-white dark:bg-sage-100 shadow-2xl rounded-3xl p-4 text-left border border-sage-200 dark:border-sage-300 hairline-brass space-y-3.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-sage-200 dark:border-sage-300">
                      <span className="font-display font-medium text-sage-900 text-sm">Matrix Header Colors</span>
                      <button onClick={() => setShowColorPanel(false)} className="text-sage-400 hover:text-sage-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-sage-500 mb-1.5">Resident Details Headers</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={settings.residentDetailsBgHex}
                            onChange={e => handleSettingsChange({ residentDetailsBgHex: e.target.value })}
                            className="w-9 h-8 p-0.5 border border-sage-200 dark:border-sage-300 rounded-lg cursor-pointer bg-white dark:bg-sage-100"
                            title="Background"
                          />
                          <input
                            type="color"
                            value={settings.residentDetailsTextHex}
                            onChange={e => handleSettingsChange({ residentDetailsTextHex: e.target.value })}
                            className="w-9 h-8 p-0.5 border border-sage-200 dark:border-sage-300 rounded-lg cursor-pointer bg-white dark:bg-sage-100"
                            title="Text color"
                          />
                        </div>
                        <div
                          className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg border border-black/10"
                          style={{ backgroundColor: settings.residentDetailsBgHex, color: settings.residentDetailsTextHex }}
                        >
                          Preview Header
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-sage-500 mb-1.5">Sessions Total Header</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={settings.sessionsTotalBgHex}
                            onChange={e => handleSettingsChange({ sessionsTotalBgHex: e.target.value })}
                            className="w-9 h-8 p-0.5 border border-sage-200 dark:border-sage-300 rounded-lg cursor-pointer bg-white dark:bg-sage-100"
                            title="Background"
                          />
                          <input
                            type="color"
                            value={settings.sessionsTotalTextHex}
                            onChange={e => handleSettingsChange({ sessionsTotalTextHex: e.target.value })}
                            className="w-9 h-8 p-0.5 border border-sage-200 dark:border-sage-300 rounded-lg cursor-pointer bg-white dark:bg-sage-100"
                            title="Text color"
                          />
                        </div>
                        <div
                          className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg border border-black/10"
                          style={{ backgroundColor: settings.sessionsTotalBgHex, color: settings.sessionsTotalTextHex }}
                        >
                          Preview Total
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sage-200/70 dark:border-sage-300/70 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleResetColors}
                        className="text-xs text-brass-700 dark:text-brass-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Default Colors</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reset Widths */}
            <button
              onClick={handleResetWidths}
              className="flex items-center space-x-1.5 px-3 py-2 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-200 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors cursor-pointer"
              title="Reset column widths"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sage-500" />
              <span>Widths</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Animated Filter Segmented Controls (Phase & Attendance) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-sage-200/70 dark:border-sage-300/70">
          <div className="flex flex-wrap items-center gap-2">
            {/* Phase Status Filters */}
            <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-2xl border border-sage-200/70 dark:border-sage-300/60 gap-1">
              {([
                { id: 'ALL', label: 'All Residents', count: residents.length },
                { id: 'Junior', label: 'Junior', count: residents.filter(r => r.phaseStatus === 'Junior').length },
                { id: 'Senior', label: 'Senior', count: residents.filter(r => r.phaseStatus === 'Senior').length },
                { id: 'Re Entry', label: 'Re Entry', count: residents.filter(r => r.phaseStatus === 'Re Entry').length }
              ] as const).map(tab => {
                const isActive = phaseFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPhaseFilter(tab.id as PhaseFilter)}
                    className={`relative px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-150 select-none cursor-pointer flex items-center space-x-1.5 ${
                      isActive ? 'text-white' : 'text-sage-600 hover:text-sage-900 dark:text-sage-300 dark:hover:text-sage-100'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="matrix-phase-filter-pill"
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

            {/* Attendance Status Filter */}
            <div className="relative flex items-center p-1 bg-sage-100/70 dark:bg-sage-200/50 rounded-2xl border border-sage-200/70 dark:border-sage-300/60 gap-1">
              {([
                { id: 'ALL', label: 'All Status', icon: Layers },
                { id: 'HAS_ATTENDANCE', label: 'Has Sessions', icon: CheckCircle2 },
                { id: 'NO_ATTENDANCE', label: 'Zero Attendance', icon: Clock }
              ] as const).map(tab => {
                const isActive = attendanceFilter === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAttendanceFilter(tab.id as AttendanceFilter)}
                    className={`relative px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors duration-150 select-none cursor-pointer flex items-center space-x-1.5 ${
                      isActive ? 'text-white' : 'text-sage-600 hover:text-sage-900 dark:text-sage-300 dark:hover:text-sage-100'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="matrix-att-filter-pill"
                        className="absolute inset-0 bg-brass-600 rounded-xl shadow-xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-3 h-3 ${isActive ? 'text-white' : 'text-sage-500'}`} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-sage-500 font-medium">
            Showing <span className="font-bold text-rehab-800 dark:text-rehab-300">{processedResidents.length}</span> of {residents.length} residents
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. SPREADSHEET MATRIX GRID                                     */}
      {/* ============================================================= */}
      <div className="flex-1 min-h-0 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 hairline-brass rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <table
            className="text-xs text-left"
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              width: totalTableWidth
            }}
          >
            <colgroup>
              <col style={{ width: getWidth('name') }} />
              <col style={{ width: getWidth('admission') }} />
              <col style={{ width: getWidth('elevation') }} />
              {sortedCats.map(cat =>
                (catModuleMap.get(cat.id) || []).map(mod => (
                  <col key={mod.id} style={{ width: getWidth(mod.id) }} />
                ))
              )}
              <col style={{ width: getWidth('sessionsTotal') }} />
            </colgroup>

            <thead className="sticky top-0 z-30">
              {/* Top Category Grouping Header */}
              <tr className="h-9.5">
                {stickDates ? (
                  <th
                    colSpan={3}
                    className="sticky left-0 z-40 px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 whitespace-nowrap"
                    style={{
                      backgroundColor: settings.residentDetailsBgHex,
                      color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                    }}
                  >
                    Resident Details
                  </th>
                ) : (
                  <>
                    <th
                      colSpan={1}
                      className="sticky left-0 z-40 px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 whitespace-nowrap"
                      style={{
                        backgroundColor: settings.residentDetailsBgHex,
                        color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                      }}
                    >
                      Resident Details
                    </th>
                    <th
                      colSpan={2}
                      className="px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 whitespace-nowrap"
                      style={{
                        backgroundColor: settings.residentDetailsBgHex,
                        color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                      }}
                    >
                      Dates
                    </th>
                  </>
                )}

                {sortedCats.map(cat => {
                  const mods = catModuleMap.get(cat.id) || [];
                  if (mods.length === 0) return null;
                  const bg = cat.headerBgHex || cat.colorHex;
                  const text = cat.headerTextHex || getContrastTextColor(bg);
                  return (
                    <th
                      key={cat.id}
                      colSpan={mods.length}
                      style={{
                        backgroundColor: bg,
                        color: text,
                        borderTop: `3px solid ${cat.colorHex}`
                      }}
                      className="px-2.5 text-center font-display font-semibold text-sm border-r border-b border-sage-300 dark:border-sage-400 tracking-tight whitespace-nowrap"
                    >
                      {cat.name}
                    </th>
                  );
                })}

                <th
                  className="sticky right-0 z-40 px-2.5 text-center font-display font-semibold text-sm border-l border-b border-sage-300 dark:border-sage-400"
                  style={{
                    backgroundColor: settings.sessionsTotalBgHex,
                    color: settings.sessionsTotalTextHex || getContrastTextColor(settings.sessionsTotalBgHex)
                  }}
                >
                  Social Support
                </th>
              </tr>

              {/* Column Level Interactive Sort Headers */}
              <tr className="h-10.5">
                {/* 1. Name of Resident (Sortable) */}
                <th
                  onClick={() => handleHeaderSortToggle('name')}
                  className="sticky z-40 px-2.5 font-semibold text-left border-r border-b border-sage-300 dark:border-sage-400 select-none cursor-pointer group hover:brightness-95 transition-all"
                  style={{
                    left: offsets.nameLeft,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                  title="Click to sort by Resident Name"
                >
                  <div className="flex items-center justify-between space-x-1.5 truncate pr-2">
                    <div className="flex items-center space-x-1 truncate">
                      <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
                      <span className="truncate">Name of Resident</span>
                    </div>

                    <span className="shrink-0 opacity-70 group-hover:opacity-100">
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5 text-rehab-800" /> : <ArrowUpAZ className="w-3.5 h-3.5 text-rehab-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </span>
                  </div>
                  <div
                    onPointerDown={e => handleResizeStart('name', e)}
                    className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize z-30"
                  />
                </th>

                {/* 2. Admission Date (Sortable) */}
                <th
                  onClick={() => handleHeaderSortToggle('admission')}
                  className={`${stickDates ? 'sticky z-40' : 'relative z-10'} px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 select-none cursor-pointer group hover:brightness-95 transition-all`}
                  style={{
                    left: stickDates ? offsets.admissionLeft : undefined,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                  title="Click to sort by Admission Date"
                >
                  <div className="flex items-center justify-center space-x-1 truncate">
                    <span className="truncate">Admission</span>
                    <span className="shrink-0 opacity-70 group-hover:opacity-100">
                      {sortField === 'admission' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rehab-800" /> : <ArrowDown className="w-3 h-3 text-rehab-800" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                      )}
                    </span>
                  </div>
                  <div
                    onPointerDown={e => handleResizeStart('admission', e)}
                    className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize z-30"
                  />
                </th>

                {/* 3. Elevation Date (Sortable) */}
                <th
                  onClick={() => handleHeaderSortToggle('elevation')}
                  className={`${stickDates ? 'sticky z-40' : 'relative z-10'} px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 select-none cursor-pointer group hover:brightness-95 transition-all`}
                  style={{
                    left: stickDates ? offsets.elevationLeft : undefined,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                  title="Click to sort by Elevation Date"
                >
                  <div className="flex items-center justify-center space-x-1 truncate">
                    <span className="truncate">Elevation</span>
                    <span className="shrink-0 opacity-70 group-hover:opacity-100">
                      {sortField === 'elevation' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rehab-800" /> : <ArrowDown className="w-3 h-3 text-rehab-800" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                      )}
                    </span>
                  </div>
                  <div
                    onPointerDown={e => handleResizeStart('elevation', e)}
                    className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize z-30"
                  />
                </th>

                {/* Modules Columns */}
                {sortedCats.map(cat => {
                  const mods = catModuleMap.get(cat.id) || [];
                  const bg = cat.headerBgHex || cat.colorHex;
                  const text = cat.headerTextHex || getContrastTextColor(bg);

                  return mods.map(mod => (
                    <th
                      key={mod.id}
                      className="px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 relative select-none"
                      style={{ backgroundColor: bg, color: text }}
                    >
                      <span className="block leading-snug wrap-break-word text-[11px] line-clamp-2" title={mod.name}>
                        {mod.name}
                      </span>
                      <div
                        onPointerDown={e => handleResizeStart(mod.id, e)}
                        className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize z-30"
                      />
                    </th>
                  ));
                })}

                {/* 4. Sessions Total (Sortable) */}
                <th
                  onClick={() => handleHeaderSortToggle('sessionsTotal')}
                  className="sticky right-0 z-40 px-2 font-semibold text-center border-l border-b border-sage-300 dark:border-sage-400 select-none cursor-pointer group hover:brightness-95 transition-all"
                  style={{
                    backgroundColor: settings.sessionsTotalBgHex,
                    color: settings.sessionsTotalTextHex || getContrastTextColor(settings.sessionsTotalBgHex)
                  }}
                  title="Click to sort by Sessions Attended"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Sessions Total</span>
                    <span className="shrink-0 opacity-70 group-hover:opacity-100">
                      {sortField === 'sessionsTotal' ? (
                        sortDirection === 'asc' ? <TrendingUp className="w-3.5 h-3.5 text-rehab-800" /> : <TrendingDown className="w-3.5 h-3.5 text-rehab-800" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {processedResidents.length === 0 ? (
                <tr>
                  <td colSpan={3 + sortedMods.length + 1} className="p-0 border-b border-sage-200 dark:border-sage-300 h-55" />
                </tr>
              ) : !isHydrated ? (
                Array.from({ length: 12 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td
                      className="sticky z-20 p-2.5 border-r border-b border-sage-200 dark:border-sage-300 bg-white dark:bg-sage-100"
                      style={{ left: offsets.nameLeft }}
                    >
                      <div className="h-3.5 bg-sage-200 dark:bg-sage-300 rounded w-28" />
                    </td>

                    <td
                      className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100' : 'bg-white dark:bg-sage-100'} p-2 border-r border-b border-sage-200 dark:border-sage-300`}
                      style={{ left: stickDates ? offsets.admissionLeft : undefined }}
                    >
                      <div className="h-3.5 bg-sage-200 dark:bg-sage-300 rounded w-14 mx-auto" />
                    </td>

                    <td
                      className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100' : 'bg-white dark:bg-sage-100'} p-2 border-r border-b border-sage-300 dark:border-sage-400`}
                      style={{ left: stickDates ? offsets.elevationLeft : undefined }}
                    >
                      <div className="h-3.5 bg-sage-200 dark:bg-sage-300 rounded w-14 mx-auto" />
                    </td>

                    {sortedMods.map(m => (
                      <td key={m.id} className="p-1.5 border-r border-b border-sage-200 dark:border-sage-300 bg-white dark:bg-sage-100">
                        <div className="h-3.75 bg-sage-200/50 dark:bg-sage-300/40 rounded w-7 mx-auto" />
                      </td>
                    ))}

                    <td className="sticky right-0 z-20 p-2 border-l border-b border-sage-300 dark:border-sage-400 bg-white dark:bg-sage-100">
                      <div className="h-4 bg-sage-200 dark:bg-sage-300 rounded-full w-8 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : (
                paginatedResidents.map((resident, index) => (
                  <MatrixRowItem
                    key={resident.id}
                    resident={resident}
                    index={index}
                    sortedCats={sortedCats}
                    catModuleMap={catModuleMap}
                    attMap={attMap}
                    stickDates={stickDates}
                    offsets={offsets}
                    sessionsTotalBgHex={settings.sessionsTotalBgHex}
                    onCellClick={handleCellClick}
                  />
                ))
              )}
            </tbody>
          </table>

          {processedResidents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="sticky top-9.5 left-0 w-full flex justify-center pointer-events-none"
              style={{ marginBottom: -220 }}
            >
              <div className="flex flex-col items-center justify-center gap-2 pt-16 text-center pointer-events-none">
                {searchTerm.trim() ? (
                  <>
                    <Search className="w-8 h-8 text-sage-300 dark:text-sage-500" />
                    <p className="text-sm font-semibold text-sage-600 dark:text-sage-400">
                      No residents match "{searchTerm}"
                    </p>
                    <p className="text-xs text-sage-400 dark:text-sage-500">
                      Try a different name, or clear the search and filter criteria.
                    </p>
                  </>
                ) : (
                  <>
                    <Users className="w-8 h-8 text-sage-300 dark:text-sage-500" />
                    <p className="text-sm font-semibold text-sage-600 dark:text-sage-400">
                      No residents match your filter
                    </p>
                    <p className="text-xs text-sage-400 dark:text-sage-500">
                      Reset your phase or attendance filters to display resident rows.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="px-4 py-2.5 border-t border-sage-200 dark:border-sage-300 bg-sage-50/50 dark:bg-sage-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedResidents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3. CELL ATTENDANCE & SCHEDULE POPOVER MODAL                    */}
      {/* ============================================================= */}
      <AnimatePresence>
        {popoverCell && activeResident && activeModule && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPopoverCell(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-sm w-full p-5 space-y-4 text-left cursor-default"
            >
              <div className="flex items-start justify-between pb-3 border-b border-sage-200 dark:border-sage-300">
                <div className="pr-2">
                  <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 border"
                    style={{
                      backgroundColor: activeCategory?.colorHex ? `${activeCategory.colorHex}25` : '#E3EFE8',
                      borderColor: activeCategory?.colorHex ? `${activeCategory.colorHex}60` : '#2F7A54',
                      color: activeCategory?.colorHex || '#2F7A54'
                    }}
                  >
                    {activeCategory?.name}
                  </span>
                  <h3 className="font-display font-semibold text-sage-900 text-base leading-snug">{activeModule.name}</h3>
                  <p className="text-xs text-sage-500 mt-0.5 font-medium">
                    Resident: <strong className="text-sage-800 dark:text-sage-200">{activeResident.fullName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setPopoverCell(null)}
                  className="text-sage-400 hover:text-sage-600 p-1 rounded-xl hover:bg-sage-200/50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider flex items-center space-x-1 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-brass-600" />
                  <span>Pre-Scheduled Dates ({activeModule.conductedDates?.length || 0}):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 min-h-7">
                  {activeModule.conductedDates && activeModule.conductedDates.length > 0 ? (
                    activeModule.conductedDates.map(cd => {
                      const isAttended = activeDates.includes(cd);
                      return (
                        <button
                          key={cd}
                          type="button"
                          onClick={() => toggleAttendance(activeResident.id, activeModule.id, cd)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isAttended
                              ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 shadow-sm'
                              : 'bg-sage-50 dark:bg-sage-200 text-sage-700 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                          }`}
                        >
                          {isAttended && <Check className="w-3 h-3 stroke-3" />}
                          <span>{formatToUSDate(cd)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-sage-400 italic">No scheduled dates set for this module</span>
                  )}
                </div>
              </div>

              {activeDates.length > 0 && (
                <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                  <span className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider block mb-1.5">
                    Attended Dates ({activeDates.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDates.map((d, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-rehab-100 dark:bg-rehab-100/70 text-rehab-800 rounded-lg text-xs font-mono font-semibold border border-rehab-500/25"
                      >
                        <span>{formatToUSDate(d)}</span>
                        <button
                          type="button"
                          onClick={() => toggleAttendance(activeResident.id, activeModule.id, d)}
                          className="text-rehab-600 hover:text-red-500 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <label className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider block mb-1.5">
                  Manual Date Attendance:
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 min-w-0">
                    <DatePicker
                      value={manualDate}
                      onChange={setManualDate}
                      conductedDates={activeModule.conductedDates || []}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (manualDate) {
                        toggleAttendance(activeResident.id, activeModule.id, manualDate);
                        setManualDate('');
                      }
                    }}
                    className="px-3 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shrink-0 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <label className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider block mb-1.5 items-center space-x-1">
                  <CalendarPlus className="w-3.5 h-3.5 text-brass-600" />
                  <span>Add Date to Module Schedule:</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 min-w-0">
                    <DatePicker
                      value={newScheduleDate}
                      onChange={setNewScheduleDate}
                      conductedDates={activeModule.conductedDates || []}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddDateToModuleSchedule(activeModule.id, newScheduleDate)}
                    className="px-3 py-2 bg-brass-600 dark:bg-brass-500 hover:bg-brass-700 text-white text-xs font-semibold rounded-xl shrink-0 shadow-sm cursor-pointer"
                  >
                    + Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};