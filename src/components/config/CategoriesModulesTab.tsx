import React, { useState } from 'react';
import type { Category, Module } from '../../types';
import { formatToUSDate } from '../../utils/dateUtils';
import { db } from '../../db/db';
import { Plus, Trash2, Edit2, FolderPlus, X } from 'lucide-react';

interface CategoriesModulesTabProps {
  categories: Category[];
  modules: Module[];
}

export const CategoriesModulesTab: React.FC<CategoriesModulesTabProps> = ({ categories, modules }) => {
  // Category States
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  // Module States
  const [targetCategoryForNewMod, setTargetCategoryForNewMod] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Per-Module Date Input
  const [moduleDateInputs, setModuleDateInputs] = useState<Record<string, string>>({});

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedMods = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);

  // Category Actions
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await db.categories.add({
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      colorHex: newCatColor,
      headerBgHex: newCatColor,
      headerTextHex: '#000000',
      sortOrder: categories.length + 1
    });
    setNewCatName('');
    setShowAddCatModal(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    await db.categories.update(editingCategory.id, {
      name: editingCategory.name.trim(),
      colorHex: editingCategory.colorHex
    });
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this entire Category and all its modules?')) {
      await db.categories.delete(id);
      const catMods = modules.filter(m => m.categoryId === id);
      for (const m of catMods) {
        await db.modules.delete(m.id);
        await db.attendance.where('moduleId').equals(m.id).delete();
      }
    }
  };

  // Module Actions
  const handleAddModule = async () => {
    if (!newModName.trim() || !targetCategoryForNewMod) return;
    const catMods = modules.filter(m => m.categoryId === targetCategoryForNewMod);
    await db.modules.add({
      id: `mod_${targetCategoryForNewMod}_${Date.now()}`,
      categoryId: targetCategoryForNewMod,
      name: newModName.trim(),
      sortOrder: catMods.length + 1,
      conductedDates: []
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
    if (confirm('Delete this therapeutic module?')) {
      await db.modules.delete(id);
      await db.attendance.where('moduleId').equals(id).delete();
    }
  };

  // Conducted Date Actions
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

    await db.modules.update(moduleId, {
      conductedDates: mod.conductedDates.filter(d => d !== dateStr)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddCatModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm"
        >
          <FolderPlus className="w-4 h-4" />
          <span>+ Add New Category</span>
        </button>
      </div>

      {/* Categories & Nested Modules List */}
      {sortedCats.map(cat => {
        const catMods = sortedMods.filter(m => m.categoryId === cat.id);

        return (
          <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Category Header */}
            <div
              className="p-4 flex items-center justify-between border-b border-slate-200"
              style={{ borderLeft: `6px solid ${cat.colorHex}` }}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                  style={{ backgroundColor: cat.colorHex }}
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {catMods.length} Modules in this Category
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTargetCategoryForNewMod(cat.id)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Module</span>
                </button>
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                  title="Edit Category Title & Color"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="p-4 bg-slate-50/50">
              {catMods.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No modules in this category yet. Click "+ Add Module" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {catMods.map(mod => (
                    <div
                      key={mod.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-semibold text-xs text-slate-800 leading-snug">
                            {mod.name}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => setEditingModule(mod)}
                              className="p-1 text-slate-400 hover:text-emerald-700 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(mod.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Dates List */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                            Conducted Dates ({mod.conductedDates?.length || 0}):
                          </span>
                          <div className="flex flex-wrap gap-1 min-h-6">
                            {mod.conductedDates?.length ? (
                              mod.conductedDates.map(d => (
                                <span
                                  key={d}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono"
                                >
                                  <span>{formatToUSDate(d)}</span>
                                  <button
                                    onClick={() => handleRemoveDateFromModule(mod.id, d)}
                                    className="text-slate-400 hover:text-red-500"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No dates added</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Add Date */}
                      <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5">
                        <input
                          type="date"
                          value={moduleDateInputs[mod.id] || ''}
                          onChange={e => setModuleDateInputs({ ...moduleDateInputs, [mod.id]: e.target.value })}
                          className="text-[11px] p-1 border border-slate-200 rounded-lg bg-slate-50 flex-1"
                        />
                        <button
                          onClick={() => handleAddDateToModule(mod.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold"
                        >
                          + Date
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal: Add Module to Category */}
      {targetCategoryForNewMod && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Add Module to Category</h3>
              <button onClick={() => setTargetCategoryForNewMod(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Module Title *</label>
              <input
                type="text"
                placeholder="e.g. Relapse Prevention Plan"
                value={newModName}
                onChange={e => setNewModName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setTargetCategoryForNewMod(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModule}
                disabled={!newModName.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Add Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Create New Category</h3>
              <button onClick={() => setShowAddCatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Relapse Prevention Workshop"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category Theme Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    className="w-12 h-9 p-0.5 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase text-slate-600">{newCatColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setShowAddCatModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCatName.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Edit Category Theme</h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category Title</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category Header Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={editingCategory.colorHex}
                    onChange={e => setEditingCategory({ ...editingCategory, colorHex: e.target.value })}
                    className="w-12 h-9 p-0.5 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase text-slate-600">{editingCategory.colorHex}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCategory}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Module */}
      {editingModule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Edit Module Title</h3>
              <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Module Name</label>
                <input
                  type="text"
                  value={editingModule.name}
                  onChange={e => setEditingModule({ ...editingModule, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Parent Category</label>
                <select
                  value={editingModule.categoryId}
                  onChange={e => setEditingModule({ ...editingModule, categoryId: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
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
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateModule}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};