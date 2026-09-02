// src/components/config/CategoriesModulesTab.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Category, Module } from '../../types';
import { formatToUSDate } from '../../utils/dateUtils';
import { useSessionStore } from '../../utils/useSessionStore';
import { db, updateModuleSessionNote } from '../../db/db';
import { SearchBar } from '../SearchBar';
import { DatePicker } from '../DatePicker';
import { useConfirm } from '../../context/NotificationProvider';
import {
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  ChevronDown,
  X,
  ChevronsUpDown,
  StickyNote,
  Calendar
} from 'lucide-react';

interface CategoriesModulesTabProps {
  categories: Category[];
  modules: Module[];
}

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#171A15' : '#FAF8F3';
}

const ModalShell: React.FC<{ onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({
  onClose,
  children,
  maxWidth = 'max-w-sm'
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={e => e.stopPropagation()}
      className={`bg-sage-50 dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl ${maxWidth} w-full p-6 space-y-4`}
    >
      {children}
    </motion.div>
  </motion.div>
);

export const CategoriesModulesTab: React.FC<CategoriesModulesTabProps> = ({ categories, modules }) => {
  const confirm = useConfirm();
  const {
    configCatSearch,
    configCatFilter,
    configCollapsedCats,
    configModDateInputs,
    setConfigState
  } = useSessionStore();

  const searchTerm = configCatSearch;
  const setSearchTerm = (s: string) => setConfigState({ configCatSearch: s });

  const selectedCategoryFilter = configCatFilter;
  const setSelectedCategoryFilter = (f: string) => setConfigState({ configCatFilter: f });

  const collapsedCategories = useMemo(() => new Set(configCollapsedCats), [configCollapsedCats]);

  const moduleDateInputs = configModDateInputs;
  const setModuleDateInputs = (inputs: Record<string, string>) => setConfigState({ configModDateInputs: inputs });

  // Local Modal States
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2F7A54');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  const [targetCategoryForNewMod, setTargetCategoryForNewMod] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Date Note Modal State
  const [noteModalTarget, setNoteModalTarget] = useState<{
    moduleId: string;
    moduleName: string;
    date: string;
  } | null>(null);
  const [noteInputText, setNoteInputText] = useState('');

  const sortedCats = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const sortedMods = useMemo(() => [...modules].sort((a, b) => a.sortOrder - b.sortOrder), [modules]);

  const toggleCategoryCollapse = (catId: string) => {
    const next = new Set(configCollapsedCats);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setConfigState({ configCollapsedCats: Array.from(next) });
  };

  const toggleExpandCollapseAll = () => {
    if (configCollapsedCats.length === categories.length) {
      setConfigState({ configCollapsedCats: [] });
    } else {
      setConfigState({ configCollapsedCats: categories.map(c => c.id) });
    }
  };

  const filteredCategories = sortedCats.filter(cat => {
    if (selectedCategoryFilter !== 'ALL' && cat.id !== selectedCategoryFilter) return false;
    return true;
  });

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await db.categories.add({
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      colorHex: newCatColor,
      headerBgHex: newCatColor,
      headerTextHex: getContrastTextColor(newCatColor),
      sortOrder: categories.length + 1
    });
    setNewCatName('');
    setShowAddCatModal(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    await db.categories.update(editingCategory.id, {
      name: editingCategory.name.trim(),
      colorHex: editingCategory.colorHex,
      headerBgHex: editingCategory.headerBgHex,
      headerTextHex: editingCategory.headerTextHex
    });
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = await confirm({
      title: 'Delete category?',
      message: 'This removes the entire category and all of its modules, including their attendance logs. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Category'
    });
    if (ok) {
      await db.categories.delete(id);
      const catMods = modules.filter(m => m.categoryId === id);
      for (const m of catMods) {
        await db.modules.delete(m.id);
        await db.attendance.where('moduleId').equals(m.id).delete();
      }
    }
  };

  const handleAddModule = async () => {
    if (!newModName.trim() || !targetCategoryForNewMod) return;
    const catMods = modules.filter(m => m.categoryId === targetCategoryForNewMod);
    await db.modules.add({
      id: `mod_${targetCategoryForNewMod}_${Date.now()}`,
      categoryId: targetCategoryForNewMod,
      name: newModName.trim(),
      sortOrder: catMods.length + 1,
      conductedDates: [],
      sessionNotes: {}
    });
    setNewModName('');
    setTargetCategoryForNewMod(null);
  };

  const handleUpdateModule = async () => {
    if (!editingModule || !editingModule.name.trim()) return;
    await db.modules.update(editingModule.id, {
      name: editingModule.name.trim(),
      categoryId: editingModule.categoryId
    });
    setEditingModule(null);
  };

  const handleDeleteModule = async (id: string) => {
    const ok = await confirm({
      title: 'Delete module?',
      message: 'This removes the module and its attendance logs. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Module'
    });
    if (ok) {
      await db.modules.delete(id);
      await db.attendance.where('moduleId').equals(id).delete();
    }
  };

  const handleAddDateToModule = async (moduleId: string) => {
    const dateValue = moduleDateInputs[moduleId];
    if (!dateValue) return;

    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    const currentDates = mod.conductedDates || [];
    if (!currentDates.includes(dateValue)) {
      await db.modules.update(moduleId, {
        conductedDates: [...currentDates, dateValue].sort()
      });
      setModuleDateInputs({ ...moduleDateInputs, [moduleId]: '' });
    }
  };

  const handleRemoveDateFromModule = async (moduleId: string, dateStr: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    const nextDates = mod.conductedDates.filter(d => d !== dateStr);
    const nextNotes = { ...(mod.sessionNotes || {}) };
    delete nextNotes[dateStr];

    await db.modules.update(moduleId, {
      conductedDates: nextDates,
      sessionNotes: nextNotes
    });
  };

  const handleSaveDateNote = async () => {
    if (!noteModalTarget) return;
    await updateModuleSessionNote(noteModalTarget.moduleId, noteModalTarget.date, noteInputText);
    setNoteModalTarget(null);
    setNoteInputText('');
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="bg-sage-50 p-4 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search modules or categories..."
            className="sm:w-80"
          />

          <div className="flex items-center space-x-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={toggleExpandCollapseAll}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 text-sage-700 rounded-xl text-xs font-semibold hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>
                {collapsedCategories.size === categories.length ? 'Expand All' : 'Collapse All'}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowAddCatModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rehab-700 dark:bg-rehab-600 text-white rounded-xl text-xs font-semibold hover:bg-rehab-800 transition-colors shadow-[0_4px_14px_-4px_rgba(28,82,56,0.5)] cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Add Category</span>
            </motion.button>
          </div>
        </div>

        {/* Quick Category Legend Filter Pills */}
        <div className="relative flex flex-wrap items-center gap-1.5 pt-2 border-t border-sage-200/70 dark:border-sage-300/70">
          <span className="text-[11px] font-semibold text-sage-500 uppercase tracking-wider mr-1">
            Quick Filter:
          </span>
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
              selectedCategoryFilter === 'ALL'
                ? 'text-white'
                : 'bg-white dark:bg-sage-100 text-sage-600 border border-sage-200 dark:border-sage-300 hover:bg-sage-100 dark:hover:bg-sage-200'
            }`}
          >
            {selectedCategoryFilter === 'ALL' && (
              <motion.div
                layoutId="cat-filter-pill"
                className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">All Categories ({modules.length})</span>
          </button>

          {sortedCats.map(cat => {
            const count = modules.filter(m => m.categoryId === cat.id).length;
            const isSelected = selectedCategoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat.id)}
                className={`relative flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-200 border cursor-pointer ${
                  isSelected
                    ? 'border-transparent text-white'
                    : 'border-sage-200 dark:border-sage-300 bg-white dark:bg-sage-100 text-sage-700 hover:bg-sage-100 dark:hover:bg-sage-200'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="cat-filter-pill"
                    className="absolute inset-0 bg-rehab-700 dark:bg-rehab-600 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className="relative z-10 w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                  style={{ backgroundColor: cat.colorHex }}
                />
                <span className="relative z-10">{cat.name}</span>
                <span
                  className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-sage-100 dark:bg-sage-200 text-sage-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories & Nested Modules Accordions */}
      <div className="space-y-4">
        {filteredCategories.map(cat => {
          const catMods = sortedMods
            .filter(m => m.categoryId === cat.id)
            .filter(
              m =>
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cat.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

          const isCollapsed = collapsedCategories.has(cat.id) && !searchTerm;

          if (searchTerm && catMods.length === 0) return null;

          return (
            <div
              key={cat.id}
              className="bg-sage-50 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-[0_1px_2px_rgba(11,42,31,0.04),0_12px_28px_-16px_rgba(11,42,31,0.18)] overflow-hidden"
            >
              {/* Category Accordion Header */}
              <div
                onClick={() => toggleCategoryCollapse(cat.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/40 dark:hover:bg-sage-100/40 transition-colors border-b border-sage-200/60 dark:border-sage-300/60"
                style={{ borderLeft: `6px solid ${cat.colorHex}` }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full border border-white shadow-xs shrink-0"
                    style={{ backgroundColor: cat.colorHex }}
                  />
                  <div>
                    <h3 className="font-display text-[15px] font-medium text-sage-900 leading-snug">{cat.name}</h3>
                    <p className="text-[11px] text-sage-500 font-medium">
                      {catMods.length} Modules {searchTerm ? 'matched' : 'available'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setTargetCategoryForNewMod(cat.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-sage-100 dark:bg-sage-200 hover:bg-sage-200 dark:hover:bg-sage-300 text-sage-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Module</span>
                  </button>
                  <button
                    onClick={() => setEditingCategory(cat)}
                    className="p-1.5 text-sage-500 hover:text-rehab-700 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-lg transition-colors cursor-pointer"
                    title="Edit Category Title & Color"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-sage-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleCategoryCollapse(cat.id)}
                    className="p-1.5 text-sage-400 hover:text-sage-700 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-lg ml-1 cursor-pointer"
                  >
                    <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>

              {/* Modules Grid */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-sage-100/20 dark:bg-sage-100/30">
                      {catMods.length === 0 ? (
                        <div className="p-6 text-center text-xs text-sage-400 italic">
                          {searchTerm ? 'No modules match your search.' : 'No modules in this category yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {catMods.map(mod => (
                            <div
                              key={mod.id}
                              className="bg-sage-50 dark:bg-sage-100 p-4 rounded-2xl border border-sage-200 dark:border-sage-300 shadow-xs space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-xs text-sage-900 leading-snug">
                                    {mod.name}
                                  </span>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      onClick={() => setEditingModule(mod)}
                                      className="p-1 text-sage-400 hover:text-rehab-700 rounded cursor-pointer"
                                      title="Edit Module"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteModule(mod.id)}
                                      className="p-1 text-sage-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer"
                                      title="Delete Module"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Conducted Dates with Large Note Buttons & Direct Previews */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-sage-500 dark:text-sage-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                                      <Calendar className="w-3 h-3 text-brass-600" />
                                      <span>Conducted Dates ({mod.conductedDates?.length || 0}):</span>
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {mod.conductedDates?.length ? (
                                      mod.conductedDates.map(d => {
                                        const noteText = mod.sessionNotes?.[d];
                                        const hasNote = Boolean(noteText?.trim());

                                        return (
                                          <div
                                            key={d}
                                            className="p-2.5 bg-white dark:bg-sage-200/80 rounded-xl border border-sage-200 dark:border-sage-300 space-y-1.5 shadow-2xs"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-mono text-xs font-semibold text-sage-800 dark:text-sage-200">
                                                {formatToUSDate(d)}
                                              </span>

                                              <div className="flex items-center space-x-1.5">
                                                {/* Prominent Note Button */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setNoteModalTarget({
                                                      moduleId: mod.id,
                                                      moduleName: mod.name,
                                                      date: d
                                                    });
                                                    setNoteInputText(mod.sessionNotes?.[d] || '');
                                                  }}
                                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                                                    hasNote
                                                      ? 'bg-brass-100 dark:bg-brass-500/25 text-brass-800 dark:text-brass-300 border border-brass-300/70 hover:bg-brass-200'
                                                      : 'bg-sage-100 dark:bg-sage-300/60 text-sage-600 dark:text-sage-300 hover:bg-sage-200 border border-sage-200 dark:border-sage-400/40'
                                                  }`}
                                                  title="Edit or view note for this session date"
                                                >
                                                  <StickyNote className="w-3.5 h-3.5 text-brass-600" />
                                                  <span>{hasNote ? 'Edit Note' : '+ Add Note'}</span>
                                                </button>

                                                {/* Remove Date Button */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveDateFromModule(mod.id, d)}
                                                  className="p-1 text-sage-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                                  title="Remove date"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Note Preview Box */}
                                            {hasNote && (
                                              <div
                                                onClick={() => {
                                                  setNoteModalTarget({
                                                    moduleId: mod.id,
                                                    moduleName: mod.name,
                                                    date: d
                                                  });
                                                  setNoteInputText(mod.sessionNotes?.[d] || '');
                                                }}
                                                className="p-2 bg-sage-50 dark:bg-sage-100/70 border border-sage-200/80 dark:border-sage-300/70 rounded-lg text-[11px] text-sage-700 dark:text-sage-300 italic cursor-pointer hover:border-brass-400 transition-colors"
                                                title="Click to edit full note"
                                              >
                                                <p className="line-clamp-2">"{noteText}"</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[11px] text-sage-400 italic block py-1">
                                        No dates added yet
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Add Date Box */}
                              <div className="pt-2.5 border-t border-sage-100 dark:border-sage-200 flex items-center space-x-1.5">
                                <div className="flex-1 min-w-0">
                                  <DatePicker
                                    value={moduleDateInputs[mod.id] || ''}
                                    onChange={val => setModuleDateInputs({ ...moduleDateInputs, [mod.id]: val })}
                                    conductedDates={mod.conductedDates || []}
                                    size="xs"
                                    className="w-full"
                                  />
                                </div>
                                <button
                                  onClick={() => handleAddDateToModule(mod.id)}
                                  className="px-3 py-1.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                                >
                                  + Add Date
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Modal: Edit Session Note for a Specific Date */}
      <AnimatePresence>
        {noteModalTarget && (
          <ModalShell onClose={() => setNoteModalTarget(null)} maxWidth="max-w-md">
            <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-brass-600" />
                <h3 className="font-display text-base font-semibold text-sage-900">
                  Session Note
                </h3>
              </div>
              <button
                onClick={() => setNoteModalTarget(null)}
                className="text-sage-400 hover:text-sage-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-sage-100/70 dark:bg-sage-200/50 p-3 rounded-xl space-y-1">
                <div className="text-xs font-semibold text-sage-900">
                  {noteModalTarget.moduleName}
                </div>
                <div className="text-[11px] font-mono text-sage-500">
                  Date: <span className="font-semibold text-rehab-700">{formatToUSDate(noteModalTarget.date)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">
                  Facilitator Remarks / Topics Covered for this Session:
                </label>
                <textarea
                  rows={4}
                  value={noteInputText}
                  onChange={e => setNoteInputText(e.target.value)}
                  placeholder="e.g. Covered coping mechanisms for relapse triggers. High participation..."
                  className="w-full text-xs p-3 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-200 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-sage-200/70 dark:border-sage-300/70">
              {noteInputText && (
                <button
                  type="button"
                  onClick={() => setNoteInputText('')}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Clear Note
                </button>
              )}
              <div className="flex space-x-2 ml-auto">
                <button
                  onClick={() => setNoteModalTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSaveDateNote}
                  className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Save Note
                </motion.button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modal: Add Module to Category */}
      <AnimatePresence>
        {targetCategoryForNewMod && (
          <ModalShell onClose={() => setTargetCategoryForNewMod(null)}>
            <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
              <h3 className="font-display text-base font-medium text-sage-900">Add Module to Category</h3>
              <button onClick={() => setTargetCategoryForNewMod(null)} className="text-sage-400 hover:text-sage-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-sage-500 mb-1">Module Title *</label>
              <input
                type="text"
                placeholder="e.g. Relapse Prevention Plan"
                value={newModName}
                onChange={e => setNewModName(e.target.value)}
                className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setTargetCategoryForNewMod(null)}
                className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: newModName.trim() ? 1.02 : 1 }}
                whileTap={{ scale: newModName.trim() ? 0.96 : 1 }}
                onClick={handleAddModule}
                disabled={!newModName.trim()}
                className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Add Module
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modal: Add Category */}
      <AnimatePresence>
        {showAddCatModal && (
          <ModalShell onClose={() => setShowAddCatModal(false)}>
            <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
              <h3 className="font-display text-base font-medium text-sage-900">Create New Category</h3>
              <button onClick={() => setShowAddCatModal(false)} className="text-sage-400 hover:text-sage-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Relapse Prevention Workshop"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Category Theme Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    className="w-12 h-9 p-0.5 border border-sage-200 dark:border-sage-300 rounded-xl cursor-pointer bg-white dark:bg-sage-100"
                  />
                  <span className="text-xs font-mono uppercase text-sage-600">{newCatColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setShowAddCatModal(false)}
                className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: newCatName.trim() ? 1.02 : 1 }}
                whileTap={{ scale: newCatName.trim() ? 0.96 : 1 }}
                onClick={handleAddCategory}
                disabled={!newCatName.trim()}
                className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Create Category
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modal: Edit Category */}
      <AnimatePresence>
        {editingCategory && (
          <ModalShell onClose={() => setEditingCategory(null)} maxWidth="max-w-md">
            <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
              <h3 className="font-display text-base font-medium text-sage-900">Edit Category Theme</h3>
              <button onClick={() => setEditingCategory(null)} className="text-sage-400 hover:text-sage-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Category Title</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Accent Color (dot, filter pills, sidebar)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={editingCategory.colorHex}
                    onChange={e => setEditingCategory({ ...editingCategory, colorHex: e.target.value })}
                    className="w-12 h-9 p-0.5 border border-sage-200 dark:border-sage-300 rounded-xl cursor-pointer bg-white dark:bg-sage-100"
                  />
                  <span className="text-xs font-mono uppercase text-sage-600">{editingCategory.colorHex}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-sage-200/70 dark:border-sage-300/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-sage-500">Matrix Header Background</label>
                  <button
                    type="button"
                    onClick={() => setEditingCategory({
                      ...editingCategory,
                      headerBgHex: editingCategory.colorHex,
                      headerTextHex: getContrastTextColor(editingCategory.colorHex)
                    })}
                    className="text-[10px] font-semibold text-brass-700 hover:underline cursor-pointer"
                  >
                    Match accent color
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={editingCategory.headerBgHex || editingCategory.colorHex}
                    onChange={e => setEditingCategory({ ...editingCategory, headerBgHex: e.target.value })}
                    className="w-12 h-9 p-0.5 border border-sage-200 dark:border-sage-300 rounded-xl cursor-pointer bg-white dark:bg-sage-100"
                  />
                  <span className="text-xs font-mono uppercase text-sage-600">
                    {editingCategory.headerBgHex || editingCategory.colorHex}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Matrix Header Text Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={editingCategory.headerTextHex || '#171A15'}
                    onChange={e => setEditingCategory({ ...editingCategory, headerTextHex: e.target.value })}
                    className="w-12 h-9 p-0.5 border border-sage-200 dark:border-sage-300 rounded-xl cursor-pointer bg-white dark:bg-sage-100"
                  />
                  <span className="text-xs font-mono uppercase text-sage-600">
                    {editingCategory.headerTextHex || '#171A15'}
                  </span>
                </div>
              </div>

              {/* Live preview matching the Matrix header look */}
              <div className="pt-1">
                <span className="block text-[10px] font-semibold text-sage-400 uppercase tracking-wider mb-1.5">
                  Matrix Preview
                </span>
                <div
                  className="rounded-lg px-3 py-2.5 text-center font-semibold text-sm border-t-[3px]"
                  style={{
                    backgroundColor: editingCategory.headerBgHex || editingCategory.colorHex,
                    color: editingCategory.headerTextHex || '#171A15',
                    borderTopColor: editingCategory.colorHex
                  }}
                >
                  {editingCategory.name || 'Category Name'}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleUpdateCategory}
                className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Save
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modal: Edit Module */}
      <AnimatePresence>
        {editingModule && (
          <ModalShell onClose={() => setEditingModule(null)}>
            <div className="flex items-center justify-between pb-2 border-b border-sage-200/70 dark:border-sage-300/70">
              <h3 className="font-display text-base font-medium text-sage-900">Edit Module Title</h3>
              <button onClick={() => setEditingModule(null)} className="text-sage-400 hover:text-sage-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Module Name</label>
                <input
                  type="text"
                  value={editingModule.name}
                  onChange={e => setEditingModule({ ...editingModule, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 font-medium focus:ring-2 focus:ring-brass-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-500 mb-1">Parent Category</label>
                <select
                  value={editingModule.categoryId}
                  onChange={e => setEditingModule({ ...editingModule, categoryId: e.target.value })}
                  className="w-full text-xs p-2.5 border border-sage-200 dark:border-sage-300 rounded-xl bg-white dark:bg-sage-100 text-sage-900 focus:ring-2 focus:ring-brass-500/40"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setEditingModule(null)}
                className="px-4 py-2 text-xs font-medium text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleUpdateModule}
                className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Save
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};