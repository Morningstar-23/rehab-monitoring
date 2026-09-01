import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Category, Module, Resident, AttendanceRecord } from '../types';
import { formatToUSDate } from './dateUtils';

export async function exportMatrixToExcel(
  categories: Category[],
  modules: Module[],
  residents: Resident[],
  attendance: AttendanceRecord[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Tracker', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }]
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

  const row1: any[] = ['Name\nof Resident', 'Date of\nAdmission', 'Date of Elevation\nto Junior Phase'];
  const row2: any[] = ['', '', ''];

  sortedCats.forEach(cat => {
    const mods = catModuleMap.get(cat.id) || [];
    mods.forEach((mod, idx) => {
      row1.push(idx === 0 ? cat.name : '');
      row2.push(mod.name);
    });
  });

  row1.push('Social Support\nSessions');
  row2.push('Total Count');

  worksheet.addRow(row1);
  worksheet.addRow(row2);

  let currentCol = 4;
  sortedCats.forEach(cat => {
    const mods = catModuleMap.get(cat.id) || [];
    if (mods.length > 0) {
      const startCol = currentCol;
      const endCol = currentCol + mods.length - 1;
      if (endCol > startCol) {
        worksheet.mergeCells(1, startCol, 1, endCol);
      }

      const cell = worksheet.getCell(1, startCol);
      cell.value = cat.name;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cat.colorHex.replace('#', 'FF') }
      };
      cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      currentCol += mods.length;
    }
  });

  for (let c = 1; c <= 3; c++) {
    worksheet.mergeCells(1, c, 2, c);
    const cell = worksheet.getCell(1, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  const summaryColIndex = currentCol;
  worksheet.mergeCells(1, summaryColIndex, 2, summaryColIndex);
  const summaryCell = worksheet.getCell(1, summaryColIndex);
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
  summaryCell.font = { bold: true, color: { argb: 'FF7C2D12' } };
  summaryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const r2 = worksheet.getRow(2);
  r2.height = 48;
  for (let c = 4; c < summaryColIndex; c++) {
    const cell = r2.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.font = { size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  const attLookup = new Map<string, string[]>();
  attendance.forEach(a => {
    const key = `${a.residentId}_${a.moduleId}`;
    const list = attLookup.get(key) || [];
    list.push(formatToUSDate(a.dateAttended));
    attLookup.set(key, list);
  });

  residents.forEach(res => {
    const rowData: any[] = [
      res.fullName,
      formatToUSDate(res.admissionDate),
      formatToUSDate(res.elevationDate)
    ];

    let attendedCount = 0;
    sortedCats.forEach(cat => {
      const mods = catModuleMap.get(cat.id) || [];
      mods.forEach(mod => {
        const dates = attLookup.get(`${res.id}_${mod.id}`) || [];
        if (dates.length > 0) attendedCount++;
        rowData.push(dates.join('\n'));
      });
    });

    rowData.push(attendedCount);

    const addedRow = worksheet.addRow(rowData);
    addedRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    addedRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  });

  worksheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 24 : idx < 3 ? 14 : 12;
  });

  worksheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Rehab_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
}