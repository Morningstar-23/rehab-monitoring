import Dexie, { type EntityTable } from 'dexie';
import type { Category, Module, Resident, AttendanceRecord, MatrixSettings } from '../types';
import { SEED_CATEGORIES, SEED_MODULES, SEED_RESIDENTS } from './seedData';

const db = new Dexie('RehabTrackerDB') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  modules: EntityTable<Module, 'id'>;
  residents: EntityTable<Resident, 'id'>;
  attendance: EntityTable<AttendanceRecord, 'id'>;
  matrixSettings: EntityTable<MatrixSettings, 'id'>;
};

db.version(1).stores({
  categories: 'id, sortOrder',
  modules: 'id, categoryId, sortOrder',
  residents: 'id, fullName, phaseStatus',
  attendance: 'id, residentId, moduleId, dateAttended, [residentId+moduleId]'
});

db.version(2).stores({
  categories: 'id, sortOrder',
  modules: 'id, categoryId, sortOrder',
  residents: 'id, fullName, phaseStatus',
  attendance: 'id, residentId, moduleId, dateAttended, [residentId+moduleId]',
  matrixSettings: 'id'
});

export const DEFAULT_MATRIX_SETTINGS: MatrixSettings = {
  id: 'global',
  residentDetailsBgHex: '#E3DFD0',
  residentDetailsTextHex: '#171A15',
  sessionsTotalBgHex: '#E4D2AC',
  sessionsTotalTextHex: '#503C24',
  columnWidths: {
    name: 200,
    admission: 110,
    elevation: 110,
    sessionsTotal: 100
  }
};

const DEFAULT_MODULE_COL_WIDTH = 130;

// Auto-seed only if empty on first installation
db.on('ready', async () => {
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd(SEED_CATEGORIES);
    const modulesWithIds = SEED_MODULES.map((m, idx) => ({
      ...m,
      id: `mod_${m.categoryId}_${idx + 1}`
    }));
    await db.modules.bulkAdd(modulesWithIds);
    await db.residents.bulkAdd(SEED_RESIDENTS);
  }

  const settingsCount = await db.matrixSettings.count();
  if (settingsCount === 0) {
    await db.matrixSettings.add(DEFAULT_MATRIX_SETTINGS);
  }
});

export { db };

// Matrix Settings Helpers
export async function getMatrixSettings(): Promise<MatrixSettings> {
  const existing = await db.matrixSettings.get('global');
  return existing || DEFAULT_MATRIX_SETTINGS;
}

export async function updateMatrixSettings(patch: Partial<MatrixSettings>) {
  const existing = await getMatrixSettings();
  await db.matrixSettings.put({ ...existing, ...patch, id: 'global' });
}

export async function setColumnWidth(columnKey: string, width: number) {
  const existing = await getMatrixSettings();
  await db.matrixSettings.put({
    ...existing,
    id: 'global',
    columnWidths: { ...existing.columnWidths, [columnKey]: width }
  });
}

export async function resetColumnWidths() {
  const existing = await getMatrixSettings();
  await db.matrixSettings.put({
    ...existing,
    id: 'global',
    columnWidths: { ...DEFAULT_MATRIX_SETTINGS.columnWidths }
  });
}

export function getDefaultModuleColWidth() {
  return DEFAULT_MODULE_COL_WIDTH;
}

// Attendance Helpers
export async function toggleAttendance(residentId: string, moduleId: string, dateAttended: string) {
  const existing = await db.attendance
    .where({ residentId, moduleId, dateAttended })
    .first();

  if (existing) {
    await db.attendance.delete(existing.id);
  } else {
    await db.attendance.add({
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      residentId,
      moduleId,
      dateAttended,
      timestamp: Date.now()
    });
  }
}

export async function batchSetAttendance(residentIds: string[], moduleId: string, dateAttended: string, attended: boolean) {
  for (const residentId of residentIds) {
    const existing = await db.attendance
      .where({ residentId, moduleId, dateAttended })
      .first();

    if (attended && !existing) {
      await db.attendance.add({
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        residentId,
        moduleId,
        dateAttended,
        timestamp: Date.now()
      });
    } else if (!attended && existing) {
      await db.attendance.delete(existing.id);
    }
  }
}

// Reset Database to Clean Production Template
export async function resetToCleanTemplate() {
  await db.attendance.clear();
  await db.residents.clear();
  await db.modules.clear();
  await db.categories.clear();

  await db.categories.bulkAdd(SEED_CATEGORIES);
  const modulesWithIds = SEED_MODULES.map((m, idx) => ({
    ...m,
    id: `mod_${m.categoryId}_${idx + 1}`
  }));
  await db.modules.bulkAdd(modulesWithIds);
}