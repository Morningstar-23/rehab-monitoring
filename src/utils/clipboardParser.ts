// src/utils/clipboardParser.ts
import { parseToISODate } from './dateUtils';
import type { Resident } from '../types';

export interface ParsedResidentRow {
  fullName: string;
  admissionDate?: string;
  elevationDate?: string;
  phaseStatus: Resident['phaseStatus'];
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

export function parsePastedResidentText(
  rawText: string,
  existingNames: Set<string>
): ParsedResidentRow[] {
  const lines = rawText.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
  const results: ParsedResidentRow[] = [];

  for (const line of lines) {
    // If it's a header line, skip
    if (/^(name|resident|admission|full\s*name)/i.test(line)) continue;

    // Split by TAB (Excel default), comma, or 2+ spaces
    let cols: string[];
    if (line.includes('\t')) {
      cols = line.split('\t');
    } else if (line.includes(',')) {
      cols = line.split(',');
    } else {
      cols = line.split(/\s{2,}/);
    }

    // Clean outer quotes from Excel and trim whitespace
    const cleanCols = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));
    const name = cleanCols[0];

    if (!name) continue;

    const admissionDate = cleanCols[1] ? parseToISODate(cleanCols[1]) || undefined : undefined;
    const elevationDate = cleanCols[2] ? parseToISODate(cleanCols[2]) || undefined : undefined;

    // Smart auto-detection: If elevation date exists -> Senior, else -> Junior
    const phaseStatus: Resident['phaseStatus'] = elevationDate ? 'Senior' : 'Junior';

    const isDuplicate = existingNames.has(name.toLowerCase());

    results.push({
      fullName: name,
      admissionDate,
      elevationDate,
      phaseStatus,
      status: isDuplicate ? 'duplicate' : 'valid',
      errorMessage: isDuplicate ? 'Already in database' : undefined
    });
  }

  return results;
}