import { parseToISODate } from './dateUtils';

export interface ParsedResidentRow {
  fullName: string;
  admissionDate?: string;
  elevationDate?: string;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

export function parsePastedResidentText(rawText: string, existingNames: Set<string>): ParsedResidentRow[] {
  const lines = rawText.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
  const results: ParsedResidentRow[] = [];

  for (const line of lines) {
    // If it's a header line, skip
    if (/^name|^resident|^admission/i.test(line)) continue;

    // Split by TAB (Excel default) or comma
    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
    const name = cols[0]?.trim();

    if (!name) continue;

    const admissionDate = cols[1] ? parseToISODate(cols[1]) || undefined : undefined;
    const elevationDate = cols[2] ? parseToISODate(cols[2]) || undefined : undefined;

    const isDuplicate = existingNames.has(name.toLowerCase());

    results.push({
      fullName: name,
      admissionDate,
      elevationDate,
      status: isDuplicate ? 'duplicate' : 'valid',
      errorMessage: isDuplicate ? 'Already in database' : undefined
    });
  }

  return results;
}