// src/utils/backupRestore.ts
import { db } from '../db/db';
import type { Category, Module, Resident, AttendanceRecord } from '../types';

export interface BackupPayload {
  categories?: Category[];
  modules?: Module[];
  residents?: Resident[];
  attendance?: AttendanceRecord[];
  exportedAt?: string;
}

/**
 * Checks if raw text is a valid exported JSON backup package
 */
export function isJsonBackup(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return (
        Array.isArray(parsed.categories) ||
        Array.isArray(parsed.modules) ||
        Array.isArray(parsed.residents) ||
        Array.isArray(parsed.attendance)
      );
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Parses and extracts backup tables from raw JSON string
 */
export function parseJsonBackup(raw: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed && typeof parsed === 'object') {
      return {
        categories: Array.isArray(parsed.categories) ? parsed.categories : undefined,
        modules: Array.isArray(parsed.modules) ? parsed.modules : undefined,
        residents: Array.isArray(parsed.residents) ? parsed.residents : undefined,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : undefined,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Restores entire database atomically from a backup payload
 */
export async function restoreFullBackup(payload: BackupPayload): Promise<{
  categoriesCount: number;
  modulesCount: number;
  residentsCount: number;
  attendanceCount: number;
}> {
  return await db.transaction('rw', [db.categories, db.modules, db.residents, db.attendance], async () => {
    let categoriesCount = 0;
    let modulesCount = 0;
    let residentsCount = 0;
    let attendanceCount = 0;

    if (payload.categories && payload.categories.length > 0) {
      await db.categories.clear();
      await db.categories.bulkAdd(payload.categories);
      categoriesCount = payload.categories.length;
    }

    if (payload.modules && payload.modules.length > 0) {
      await db.modules.clear();
      await db.modules.bulkAdd(payload.modules);
      modulesCount = payload.modules.length;
    }

    if (payload.residents && payload.residents.length > 0) {
      await db.residents.clear();
      await db.residents.bulkAdd(payload.residents);
      residentsCount = payload.residents.length;
    }

    if (payload.attendance && payload.attendance.length > 0) {
      await db.attendance.clear();
      await db.attendance.bulkAdd(payload.attendance);
      attendanceCount = payload.attendance.length;
    }

    return { categoriesCount, modulesCount, residentsCount, attendanceCount };
  });
}