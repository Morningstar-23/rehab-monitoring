// src/utils/excelExport.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Category, Module, Resident, AttendanceRecord, MatrixSettings } from '../types';
import { formatToUSDate } from './dateUtils';
import { getMatrixSettings, DEFAULT_MATRIX_SETTINGS } from '../db/db';

export interface ExportResult {
  success: boolean;
  filename: string;
  path?: string;
  cancelled?: boolean;
}

function hexToARGB(hexStr?: string, fallback = 'FF171A15'): string {
  if (!hexStr) return fallback;
  const clean = hexStr.replace('#', '').trim();
  if (clean.length === 3) {
    const full = clean.split('').map(c => c + c).join('');
    return `FF${full.toUpperCase()}`;
  }
  if (clean.length === 6) {
    return `FF${clean.toUpperCase()}`;
  }
  return fallback;
}

function getContrastTextColor(hex?: string): string {
  if (!hex || hex.length < 6) return 'FF171A15';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? 'FF171A15' : 'FFFFFFFF';
}

async function saveExcelFile(buffer: ExcelJS.Buffer, defaultFilename: string): Promise<ExportResult> {
  const isTauri = typeof window !== 'undefined' && Boolean(
    (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__
  );

  if (isTauri) {
    try {
      const uint8Array = new Uint8Array(buffer as ArrayBuffer);
      const dataArray = Array.from(uint8Array);

      // Invoke Tauri backend command
      let invokeFn: ((cmd: string, args?: any) => Promise<any>) | null = null;
      try {
        const apiCore = await import('@tauri-apps/api/core');
        invokeFn = apiCore.invoke;
      } catch {
        invokeFn = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.invoke;
      }

      if (invokeFn) {
        const savedPath: string | null = await invokeFn('save_excel_file', {
          filename: defaultFilename,
          data: dataArray
        });

        // User clicked cancel
        if (!savedPath) {
          return { success: false, filename: defaultFilename, cancelled: true };
        }

        const extractedFilename = savedPath.split(/[/\\]/).pop() || defaultFilename;
        return { success: true, filename: extractedFilename, path: savedPath };
      }
    } catch (err) {
      console.error('Tauri native save failed, falling back to browser download:', err);
    }
  }

  // Browser / Dev mode fallback
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, defaultFilename);
  return { success: true, filename: defaultFilename, path: 'Downloads folder' };
}

export async function exportMatrixToExcel(
  categories: Category[],
  modules: Module[],
  residents: Resident[],
  attendance: AttendanceRecord[],
  customSettings?: MatrixSettings
): Promise<ExportResult> {
  const exportDate = new Date().toISOString().split('T')[0];
  const defaultFilename = `Rehab_Attendance_${exportDate}.xlsx`;

  try {
    const settings = customSettings || (await getMatrixSettings()) || DEFAULT_MATRIX_SETTINGS;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rehab Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Attendance Tracker', {
      views: [
        {
          state: 'frozen',
          xSplit: 1,
          ySplit: 2,
          topLeftCell: 'B3',
          activeCell: 'B3',
          showGridLines: true
        }
      ]
    });

    const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const sortedMods = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);

    const catModuleMap = new Map<string, Module[]>();
    sortedCats.forEach(c => catModuleMap.set(c.id, []));
    sortedMods.forEach(m => {
      const list = catModuleMap.get(m.categoryId) || [];
      list.push(m);
      catModuleMap.set(m.categoryId, list);
    });

    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    const borderThickBottom: Partial<ExcelJS.Borders> = {
      ...borderThin,
      bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } }
    };

    const resDetailsBg = hexToARGB(settings.residentDetailsBgHex, 'FFE3DFD0');
    const resDetailsText = hexToARGB(
      settings.residentDetailsTextHex,
      getContrastTextColor(settings.residentDetailsBgHex)
    );

    const totalBg = hexToARGB(settings.sessionsTotalBgHex, 'FFE4D2AC');
    const totalText = hexToARGB(
      settings.sessionsTotalTextHex,
      getContrastTextColor(settings.sessionsTotalBgHex)
    );

    // Row 1 & Row 2 Headers
    const row1: any[] = ['Name of Resident', 'Date of Admission', 'Date of Elevation'];
    const row2: any[] = ['', '', ''];

    const categoryColMerges: { startCol: number; endCol: number; cat: Category }[] = [];
    let currentCol = 4;

    sortedCats.forEach(cat => {
      const mods = catModuleMap.get(cat.id) || [];
      if (mods.length > 0) {
        const startCol = currentCol;
        const endCol = currentCol + mods.length - 1;

        categoryColMerges.push({ startCol, endCol, cat });

        mods.forEach((mod, idx) => {
          row1.push(idx === 0 ? cat.name : '');
          row2.push(mod.name);
          currentCol++;
        });
      }
    });

    row1.push('Social Support\nSessions');
    row2.push('Total Count');
    const summaryColIndex = currentCol;

    const r1 = worksheet.addRow(row1);
    const r2 = worksheet.addRow(row2);

    r1.height = 30;
    r2.height = 42;

    for (let c = 1; c <= 3; c++) {
      worksheet.mergeCells(1, c, 2, c);
      const cell = worksheet.getCell(1, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: resDetailsBg } };
      cell.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: resDetailsText } };
      cell.alignment = {
        horizontal: c === 1 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
        indent: c === 1 ? 1 : 0
      };
      cell.border = borderThickBottom;
    }

    categoryColMerges.forEach(({ startCol, endCol, cat }) => {
      if (endCol > startCol) {
        worksheet.mergeCells(1, startCol, 1, endCol);
      }

      const catBg = hexToARGB(cat.headerBgHex || cat.colorHex, 'FF2F7A54');
      const catText = hexToARGB(
        cat.headerTextHex,
        getContrastTextColor(cat.headerBgHex || cat.colorHex)
      );

      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(1, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catBg } };
        cell.font = { name: 'Segoe UI', bold: true, size: 10.5, color: { argb: catText } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderThin;
      }

      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(2, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catBg } };
        cell.font = { name: 'Segoe UI', bold: true, size: 9.5, color: { argb: catText } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderThickBottom;
      }
    });

    worksheet.mergeCells(1, summaryColIndex, 2, summaryColIndex);
    const summaryCell = worksheet.getCell(1, summaryColIndex);
    summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalBg } };
    summaryCell.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: totalText } };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    summaryCell.border = borderThickBottom;

    // Build Data Rows
    const attLookup = new Map<string, string[]>();
    attendance.forEach(a => {
      const key = `${a.residentId}_${a.moduleId}`;
      const list = attLookup.get(key) || [];
      list.push(formatToUSDate(a.dateAttended));
      attLookup.set(key, list);
    });

    residents.forEach((res, resIdx) => {
      const rowData: any[] = [
        res.fullName,
        formatToUSDate(res.admissionDate) || '—',
        formatToUSDate(res.elevationDate) || '—'
      ];

      let attendedCount = 0;
      sortedCats.forEach(cat => {
        const mods = catModuleMap.get(cat.id) || [];
        mods.forEach(mod => {
          const dates = attLookup.get(`${res.id}_${mod.id}`) || [];
          if (dates.length > 0) {
            attendedCount++;
            rowData.push(dates.join('\n'));
          } else {
            rowData.push('—');
          }
        });
      });

      rowData.push(attendedCount);

      const addedRow = worksheet.addRow(rowData);
      addedRow.height = 24;

      const isEven = resIdx % 2 === 0;
      const rowBg = isEven ? 'FFFFFFFF' : 'FFFBFDF9';

      const nameCell = addedRow.getCell(1);
      nameCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF171A15' } };
      nameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      nameCell.border = borderThin;

      for (let c = 2; c <= 3; c++) {
        const cell = addedRow.getCell(c);
        cell.font = { name: 'Consolas', size: 9.5, color: { argb: 'FF4B5563' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.border = borderThin;
      }

      let modColIdx = 4;
      sortedCats.forEach(cat => {
        const mods = catModuleMap.get(cat.id) || [];
        const catColorHex = cat.colorHex || '#2F7A54';
        const catColorARGB = hexToARGB(catColorHex);

        mods.forEach(mod => {
          const cell = addedRow.getCell(modColIdx);
          const dates = attLookup.get(`${res.id}_${mod.id}`) || [];
          const hasAttended = dates.length > 0;

          cell.border = borderThin;
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

          if (hasAttended) {
            cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: catColorARGB } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: hexToARGB(`${catColorHex}20`, 'FFE8F5E9') }
            };
          } else {
            cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF9CA3AF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          }

          modColIdx++;
        });
      });

      const totalCell = addedRow.getCell(summaryColIndex);
      totalCell.font = { name: 'Consolas', size: 10, bold: true, color: { argb: totalBg } };
      totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(`${settings.sessionsTotalBgHex}20`, 'FFE8F5E9') }
      };
      totalCell.border = borderThin;
    });

    worksheet.getColumn(1).width = 26;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 16;

    for (let c = 4; c < summaryColIndex; c++) {
      worksheet.getColumn(c).width = 15;
    }
    worksheet.getColumn(summaryColIndex).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    return await saveExcelFile(buffer, defaultFilename);
  } catch (error) {
    console.error('Failed to export Excel matrix:', error);
    return { success: false, filename: defaultFilename };
  }
}