// src/components/MatrixView.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Search, Plus, X, Palette, RotateCcw, GripVertical, Check, Calendar, CalendarPlus, Pin, PinOff } from 'lucide-react';

interface MatrixViewProps {
  categories: Category[];
  modules: Module[];
  residents: Resident[];
  attendance: AttendanceRecord[];
}

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

function useStickyOffsets(widths: { name: number; admission: number; elevation: number }) {
  return useMemo(() => {
    const nameLeft = 0;
    const admissionLeft = widths.name;
    const elevationLeft = widths.name + widths.admission;
    return { nameLeft, admissionLeft, elevationLeft };
  }, [widths.name, widths.admission, widths.elevation]);
}

export const MatrixView: React.FC<MatrixViewProps> = ({ categories, modules, residents, attendance }) => {
  // Session Store State (Persists across page navigation)
  const { matrixSearch, matrixPage, matrixPageSize, matrixStickDates, setMatrixState } = useSessionStore();

  const searchTerm = matrixSearch;
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

  // Local popovers and modal states
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
    const map = new Map<string, string[]>();
    for (const a of attendance) {
      const key = `${a.residentId}_${a.moduleId}`;
      const list = map.get(key);
      if (list) {
        list.push(a.dateAttended);
      } else {
        map.set(key, [a.dateAttended]);
      }
    }
    return map;
  }, [attendance]);

  const filteredResidents = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return residents;
    return residents.filter(r => r.fullName.toLowerCase().includes(query));
  }, [residents, searchTerm]);

  const totalPages = Math.ceil(filteredResidents.length / pageSize) || 1;

  const paginatedResidents = useMemo(() => {
    if (pageSize >= filteredResidents.length) return filteredResidents;
    const start = (currentPage - 1) * pageSize;
    return filteredResidents.slice(start, start + pageSize);
  }, [filteredResidents, currentPage, pageSize]);

  const getWidth = useCallback(
    (key: string) => widths[key] ?? defaultModWidth,
    [widths, defaultModWidth]
  );

  const offsets = useStickyOffsets({
    name: getWidth('name'),
    admission: getWidth('admission'),
    elevation: getWidth('elevation')
  });

  const handleResizeStart = (key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: getWidth(key) };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!resizingRef.current) return;
      const { key: k, startX, startWidth } = resizingRef.current;
      const delta = moveEvent.clientX - startX;
      const min = k === 'name' ? NAME_COL_MIN : MIN_COL_WIDTH;
      const next = Math.min(MAX_COL_WIDTH, Math.max(min, startWidth + delta));
      setWidths(prev => ({ ...prev, [k]: next }));
    };

    const handlePointerUp = () => {
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

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
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

  const ResizeHandle: React.FC<{ colKey: string }> = ({ colKey }) => (
    <div
      onPointerDown={e => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        handleResizeStart(colKey, e);
      }}
      className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize group/handle flex items-center justify-center z-30 touch-none select-none"
    >
      <div className="w-[3px] h-[60%] rounded-full bg-black/0 dark:bg-white/0 group-hover/handle:bg-brass-600 dark:group-hover/handle:bg-brass-400 transition-colors" />
    </div>
  );

  const totalTableWidth = useMemo(() => {
    const modWidthSum = sortedMods.reduce((sum, m) => sum + getWidth(m.id), 0);
    return getWidth('name') + getWidth('admission') + getWidth('elevation') + modWidthSum + getWidth('sessionsTotal');
  }, [sortedMods, getWidth]);

  const activeResident = useMemo(() => residents.find(r => r.id === popoverCell?.residentId), [residents, popoverCell]);
  const activeModule = useMemo(() => modules.find(m => m.id === popoverCell?.moduleId), [modules, popoverCell]);
  const activeCategory = useMemo(() => categories.find(c => c.id === activeModule?.categoryId), [categories, activeModule]);
  const activeDates = useMemo(() => (popoverCell ? attMap.get(`${popoverCell.residentId}_${popoverCell.moduleId}`) || [] : []), [popoverCell, attMap]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="p-4 flex flex-col h-[calc(100vh-84px)] space-y-3 transform-gpu"
    >
      {/* Controls Bar */}
      <div className="shrink-0 flex items-center justify-between bg-white dark:bg-sage-100 p-3 rounded-2xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-xs">
        <div className="flex items-center space-x-2 w-72 relative">
          <Search className="w-4 h-4 text-sage-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search resident name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-lg text-sage-900 dark:text-sage-100 focus:outline-none focus:ring-2 focus:ring-brass-500/40 focus:border-brass-500 font-medium placeholder:text-sage-400"
          />
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="text-xs text-sage-500 dark:text-sage-400 font-medium">
            Showing <span className="font-semibold text-rehab-800 dark:text-rehab-400">{filteredResidents.length}</span> of {residents.length} residents
          </div>

          <div className="w-px h-4 bg-sage-200 dark:bg-sage-300" />

          {/* Sticky Columns Toggle */}
          <button
            onClick={() => setStickDates(v => !v)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-100 rounded-lg text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors"
            title={stickDates ? 'Admission & Elevation are sticky. Click to make only Name sticky.' : 'Only Name is sticky. Click to pin Admission & Elevation as well.'}
          >
            {stickDates ? <Pin className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" /> : <PinOff className="w-3.5 h-3.5 text-sage-400" />}
            <span>{stickDates ? 'Sticky: Full Details' : 'Sticky: Name Only'}</span>
          </button>

          {/* Cell Colors Customizer */}
          <div className="relative">
            <button
              onClick={() => setShowColorPanel(v => !v)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-100 rounded-lg text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
              <span>Cell Colors</span>
            </button>

            <AnimatePresence>
              {showColorPanel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 top-full right-0 mt-2 w-80 glass-panel shadow-2xl rounded-2xl p-4 text-left border border-sage-200 dark:border-sage-300 space-y-3.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-sage-200 dark:border-sage-300">
                    <span className="font-display font-medium text-sage-900 dark:text-sage-100 text-sm">Matrix Header Colors</span>
                    <button onClick={() => setShowColorPanel(false)} className="text-sage-400 hover:text-sage-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-sage-500 dark:text-sage-400 mb-1.5">Resident Details Headers</span>
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
                    <span className="block text-[11px] font-semibold text-sage-500 dark:text-sage-400 mb-1.5">Sessions Total Header</span>
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
                      className="text-xs text-brass-700 dark:text-brass-300 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Default Colors</span>
                    </button>
                    <span className="text-[10px] text-sage-400 italic">Categories in Config</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleResetWidths}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 text-sage-800 dark:text-sage-100 rounded-lg text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-300 shadow-2xs transition-colors"
            title="Reset all column widths to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sage-500 dark:text-sage-300" />
            <span>Reset Widths</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Matrix Grid */}
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

            {/* UNIFIED STICKY THEAD */}
            <thead className="sticky top-0 z-30">
              {/* Tier 1 Header */}
              <tr className="h-[38px]">
                {stickDates ? (
                  <th
                    colSpan={3}
                    className="sticky left-0 z-40 px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 overflow-hidden whitespace-nowrap text-ellipsis"
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
                      className="sticky left-0 z-40 px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 overflow-hidden whitespace-nowrap text-ellipsis"
                      style={{
                        backgroundColor: settings.residentDetailsBgHex,
                        color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                      }}
                    >
                      Resident Details
                    </th>
                    <th
                      colSpan={2}
                      className="px-2.5 font-display font-semibold text-sm text-center border-r border-b border-sage-300 dark:border-sage-400 overflow-hidden whitespace-nowrap text-ellipsis"
                      style={{
                        backgroundColor: settings.residentDetailsBgHex,
                        color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                      }}
                    >
                      Dates
                    </th>
                  </>
                )}

                {/* Categories */}
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
                      className="px-2.5 text-center font-display font-semibold text-sm border-r border-b border-sage-300 dark:border-sage-400 tracking-tight overflow-hidden whitespace-nowrap text-ellipsis"
                    >
                      {cat.name}
                    </th>
                  );
                })}

                {/* Social Support Header */}
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

              {/* Tier 2 Header */}
              <tr className="h-[42px]">
                {/* Name of Resident */}
                <th
                  className="sticky z-40 px-2.5 font-semibold text-left border-r border-b border-sage-300 dark:border-sage-400 relative group/col select-none"
                  style={{
                    left: offsets.nameLeft,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <GripVertical className="w-3 h-3 opacity-60 shrink-0" />
                    <span className="truncate">Name of Resident</span>
                  </div>
                  <ResizeHandle colKey="name" />
                </th>

                {/* Admission */}
                <th
                  className={`${stickDates ? 'sticky z-40' : 'relative z-10'} px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 group/col select-none`}
                  style={{
                    left: stickDates ? offsets.admissionLeft : undefined,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                >
                  <span className="truncate block">Admission</span>
                  <ResizeHandle colKey="admission" />
                </th>

                {/* Elevation */}
                <th
                  className={`${stickDates ? 'sticky z-40' : 'relative z-10'} px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 group/col select-none`}
                  style={{
                    left: stickDates ? offsets.elevationLeft : undefined,
                    backgroundColor: settings.residentDetailsBgHex,
                    color: settings.residentDetailsTextHex || getContrastTextColor(settings.residentDetailsBgHex)
                  }}
                >
                  <span className="truncate block">Elevation</span>
                  <ResizeHandle colKey="elevation" />
                </th>

                {/* Modules */}
                {sortedCats.map(cat => {
                  const mods = catModuleMap.get(cat.id) || [];
                  const bg = cat.headerBgHex || cat.colorHex;
                  const text = cat.headerTextHex || getContrastTextColor(bg);

                  return mods.map(mod => (
                    <th
                      key={mod.id}
                      className="px-2 font-semibold text-center border-r border-b border-sage-300 dark:border-sage-400 relative group/col select-none"
                      style={{
                        backgroundColor: bg,
                        color: text
                      }}
                    >
                      <span
                        className="block leading-snug break-words text-[11px]"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        title={mod.name}
                      >
                        {mod.name}
                      </span>
                      <ResizeHandle colKey={mod.id} />
                    </th>
                  ));
                })}

                {/* Sessions Total */}
                <th
                  className="sticky right-0 z-40 px-2 font-semibold text-center border-l border-b border-sage-300 dark:border-sage-400 select-none"
                  style={{
                    backgroundColor: settings.sessionsTotalBgHex,
                    color: settings.sessionsTotalTextHex || getContrastTextColor(settings.sessionsTotalBgHex)
                  }}
                >
                  Sessions Total
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedResidents.map(resident => {
                let attendedTotal = 0;

                return (
                  <tr key={resident.id} className="group hover:bg-sage-100/70 dark:hover:bg-sage-200/50">
                    {/* Name */}
                    <td
                      className="sticky z-20 p-2.5 font-medium text-sage-900 dark:text-sage-100 border-r border-b border-sage-200 dark:border-sage-300 bg-white dark:bg-sage-100 group-hover:bg-sage-100 dark:group-hover:bg-sage-200"
                      style={{ left: offsets.nameLeft }}
                    >
                      <div className="truncate font-semibold" title={resident.fullName}>
                        {resident.fullName}
                      </div>
                    </td>

                    {/* Admission */}
                    <td
                      className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100 group-hover:bg-sage-100 dark:group-hover:bg-sage-200' : 'bg-white dark:bg-sage-100'} p-2 text-center text-sage-700 dark:text-sage-200 font-mono text-xs border-r border-b border-sage-200 dark:border-sage-300`}
                      style={{ left: stickDates ? offsets.admissionLeft : undefined }}
                    >
                      <div className="truncate font-medium">
                        {formatToUSDate(resident.admissionDate) || '—'}
                      </div>
                    </td>

                    {/* Elevation */}
                    <td
                      className={`${stickDates ? 'sticky z-20 bg-white dark:bg-sage-100 group-hover:bg-sage-100 dark:group-hover:bg-sage-200' : 'bg-white dark:bg-sage-100'} p-2 text-center text-sage-700 dark:text-sage-200 font-mono text-xs border-r border-b border-sage-300 dark:border-sage-400`}
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
                            onClick={() => setPopoverCell({ residentId: resident.id, moduleId: mod.id })}
                            className="p-1.5 text-center border-r border-b border-sage-200 dark:border-sage-300 cursor-pointer hover:bg-brass-100/30 dark:hover:bg-brass-500/15 relative bg-white dark:bg-sage-100 group-hover:bg-sage-50 dark:group-hover:bg-sage-200/50"
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
                              <span className="text-sage-400 dark:text-sage-600 group-hover:text-sage-500 select-none">—</span>
                            )}
                          </td>
                        );
                      });
                    })}

                    {/* Sessions Total */}
                    <td
                      className="sticky right-0 z-20 p-2 text-center font-bold font-mono border-l border-b border-sage-300 dark:border-sage-400 bg-white dark:bg-sage-100 group-hover:bg-sage-100 dark:group-hover:bg-sage-200"
                      style={{ color: settings.sessionsTotalBgHex }}
                    >
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                        style={{
                          backgroundColor: `${settings.sessionsTotalBgHex}25`,
                          borderColor: `${settings.sessionsTotalBgHex}60`,
                          color: settings.sessionsTotalBgHex
                        }}
                      >
                        {attendedTotal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Control */}
        <div className="px-4 py-2.5 border-t border-sage-200 dark:border-sage-300 bg-sage-50/50 dark:bg-sage-100">
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

      {/* Popover Modal */}
      <AnimatePresence>
        {popoverCell && activeResident && activeModule && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPopoverCell(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
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
                  <h3 className="font-display font-semibold text-sage-900 dark:text-sage-100 text-base leading-snug">{activeModule.name}</h3>
                  <p className="text-xs text-sage-500 dark:text-sage-400 mt-0.5 font-medium">Resident: <strong className="text-sage-800 dark:text-sage-200">{activeResident.fullName}</strong></p>
                </div>
                <button
                  onClick={() => setPopoverCell(null)}
                  className="text-sage-400 hover:text-sage-600 p-1 rounded-xl hover:bg-sage-200/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-sage-500 dark:text-sage-400 uppercase tracking-wider flex items-center space-x-1 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
                  <span>Pre-Scheduled Dates ({activeModule.conductedDates?.length || 0}):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {activeModule.conductedDates && activeModule.conductedDates.length > 0 ? (
                    activeModule.conductedDates.map(cd => {
                      const isAttended = activeDates.includes(cd);
                      return (
                        <button
                          key={cd}
                          type="button"
                          onClick={() => toggleAttendance(activeResident.id, activeModule.id, cd)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center space-x-1.5 transition-all ${
                            isAttended
                              ? 'bg-rehab-700 dark:bg-rehab-600 text-white border-rehab-800 shadow-sm'
                              : 'bg-sage-50 dark:bg-sage-200 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-300 hover:border-brass-400'
                          }`}
                        >
                          {isAttended && <Check className="w-3 h-3 stroke-[3]" />}
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
                  <span className="text-[11px] font-semibold text-sage-500 dark:text-sage-400 uppercase tracking-wider block mb-1.5">
                    Attended Dates ({activeDates.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDates.map((d, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-rehab-100 dark:bg-rehab-100/70 text-rehab-800 dark:text-rehab-300 rounded-lg text-xs font-mono font-semibold border border-rehab-500/25"
                      >
                        <span>{formatToUSDate(d)}</span>
                        <button
                          type="button"
                          onClick={() => toggleAttendance(activeResident.id, activeModule.id, d)}
                          className="text-rehab-600 dark:text-rehab-400 hover:text-red-500 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <label className="text-[11px] font-semibold text-sage-500 dark:text-sage-400 uppercase tracking-wider block mb-1.5">
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
                    className="px-3 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <label className="text-[11px] font-semibold text-sage-500 dark:text-sage-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                  <CalendarPlus className="w-3.5 h-3.5 text-brass-600 dark:text-brass-400" />
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
                    className="px-3 py-2 bg-brass-600 dark:bg-brass-500 hover:bg-brass-700 text-white text-xs font-semibold rounded-xl shrink-0 shadow-sm"
                  >
                    + Schedule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};