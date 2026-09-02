import React, { useState } from 'react';
import { parsePastedResidentText, type ParsedResidentRow } from '../utils/clipboardParser';
import { formatToUSDate } from '../utils/dateUtils';
import { db } from '../db/db';
import type { Resident } from '../types';
import { Clipboard, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingResidents: Resident[];
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, existingResidents }) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedResidentRow[]>([]);

  if (!isOpen) return null;

  const handleParse = () => {
    const names = new Set(existingResidents.map(r => r.fullName.toLowerCase()));
    const results = parsePastedResidentText(rawText, names);
    setParsedRows(results);
  };

  const handleCommit = async () => {
    const valid = parsedRows.filter(r => r.status === 'valid');
    const newRecords: Resident[] = valid.map((r, idx) => ({
      id: `res_${Date.now()}_${idx}`,
      fullName: r.fullName,
      admissionDate: r.admissionDate,
      elevationDate: r.elevationDate,
      phaseStatus: 'Junior'
    }));

    await db.residents.bulkAdd(newRecords);
    alert(`Imported ${newRecords.length} residents successfully!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-sage-50 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sage-200 dark:border-sage-300">
          <h3 className="font-display text-base font-semibold text-sage-900 flex items-center space-x-2">
            <Clipboard className="w-5 h-5 text-brass-600 dark:text-brass-400" />
            <span>Smart Bulk Paste Import (Excel / CSV)</span>
          </h3>
          <button onClick={onClose} className="text-sage-400 hover:text-sage-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-sage-500 mb-1.5">
            Paste rows directly from Excel (e.g. Name [TAB] Admission Date [TAB] Elevation Date):
          </label>
          <textarea
            rows={4}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Joker Pantig De Leon&#9;01/05/2026&#9;02/27/2026&#10;Robert Apolo&#9;02/10/2026"
            className="w-full p-3 text-xs font-mono bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 focus:ring-2 focus:ring-brass-500/40"
          />
          <button
            onClick={handleParse}
            className="mt-2 px-4 py-1.5 bg-sage-800 dark:bg-sage-200 text-white dark:text-sage-900 rounded-xl text-xs font-semibold hover:bg-sage-900 transition-colors"
          >
            Parse & Validate Clipboard
          </button>
        </div>

        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-sage-700 dark:text-sage-300">Preview ({parsedRows.length} Rows Detected)</h4>
            <div className="max-h-56 overflow-y-auto border border-sage-200 dark:border-sage-300 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-sage-100 dark:bg-sage-200 border-b border-sage-200 dark:border-sage-300 text-sage-600 dark:text-sage-300">
                  <tr>
                    <th className="p-2.5 font-semibold">Name</th>
                    <th className="p-2.5 font-semibold">Admission</th>
                    <th className="p-2.5 font-semibold">Elevation</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-200 dark:divide-sage-300">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-sage-100/50 dark:hover:bg-sage-200/50">
                      <td className="p-2.5 font-medium text-sage-900">{r.fullName}</td>
                      <td className="p-2.5 font-mono text-sage-500">{formatToUSDate(r.admissionDate) || '—'}</td>
                      <td className="p-2.5 font-mono text-sage-500">{formatToUSDate(r.elevationDate) || '—'}</td>
                      <td className="p-2.5">
                        {r.status === 'valid' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Duplicate</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-sage-200 dark:border-sage-300 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={parsedRows.filter(r => r.status === 'valid').length === 0}
            className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Import {parsedRows.filter(r => r.status === 'valid').length} Valid Residents
          </button>
        </div>
      </div>
    </div>
  );
};