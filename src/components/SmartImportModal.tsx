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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
            <Clipboard className="w-5 h-5 text-rehab-600" />
            <span>Smart Bulk Paste Import (Excel / CSV)</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Paste rows directly from Excel (e.g. Name [TAB] Admission Date [TAB] Elevation Date):
          </label>
          <textarea
            rows={4}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Joker Pantig De Leon&#9;01/05/2026&#9;02/27/2026&#10;Robert Apolo&#9;02/10/2026"
            className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rehab-500"
          />
          <button
            onClick={handleParse}
            className="mt-2 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900"
          >
            Parse & Validate Clipboard
          </button>
        </div>

        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Preview ({parsedRows.length} Rows Detected)</h4>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Admission</th>
                    <th className="p-2">Elevation</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-medium">{r.fullName}</td>
                      <td className="p-2 font-mono text-slate-500">{formatToUSDate(r.admissionDate) || '—'}</td>
                      <td className="p-2 font-mono text-slate-500">{formatToUSDate(r.elevationDate) || '—'}</td>
                      <td className="p-2">
                        {r.status === 'valid' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
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

        <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={parsedRows.filter(r => r.status === 'valid').length === 0}
            className="px-5 py-2 bg-rehab-700 hover:bg-rehab-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-sm"
          >
            Import {parsedRows.filter(r => r.status === 'valid').length} Valid Residents
          </button>
        </div>
      </div>
    </div>
  );
};