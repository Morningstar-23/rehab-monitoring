import Dexie, { type EntityTable } from 'dexie';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { SEED_CATEGORIES, SEED_MODULES, SEED_RESIDENTS } from './seedData';

const db = new Dexie('RehabTrackerDB') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  modules: EntityTable<Module, 'id'>;
  residents: EntityTable<Resident, 'id'>;
  attendance: EntityTable<AttendanceRecord, 'id'>;
};

db.version(1).stores({
  categories: 'id, sortOrder',
  modules: 'id, categoryId, sortOrder',
  residents: 'id, fullName, phaseStatus',
  attendance: 'id, residentId, moduleId, dateAttended, [residentId+moduleId]'
});

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

    const initialRecords: AttendanceRecord[] = [
      { id: 'att_1', residentId: 'res_1', moduleId: 'mod_cat_cbt_1', dateAttended: '2026-04-15', timestamp: Date.now() },
      { id: 'att_2', residentId: 'res_1', moduleId: 'mod_cat_cbt_3', dateAttended: '2026-05-12', timestamp: Date.now() },
      { id: 'att_3', residentId: 'res_3', moduleId: 'mod_cat_cbt_3', dateAttended: '2026-04-13', timestamp: Date.now() },
      { id: 'att_4', residentId: 'res_4', moduleId: 'mod_cat_cbt_3', dateAttended: '2026-04-13', timestamp: Date.now() },
    ];
    await db.attendance.bulkAdd(initialRecords);
  }
});

export { db };

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