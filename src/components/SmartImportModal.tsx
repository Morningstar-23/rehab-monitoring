// src/components/SmartImportModal.tsx
import React, { useState, useRef } from 'react';
import { parsePastedResidentText, type ParsedResidentRow } from '../utils/clipboardParser';
import { isJsonBackup, parseJsonBackup, restoreFullBackup, type BackupPayload } from '../utils/backupRestore';
import { formatToUSDate } from '../utils/dateUtils';
import { db } from '../db/db';
import type { Resident } from '../types';
import { useToast, useConfirm } from '../context/NotificationProvider';
import { Clipboard, CheckCircle, AlertTriangle, X, Upload, Database, Layers, Users, BookOpen } from 'lucide-react';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingResidents: Resident[];
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, existingResidents }) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedResidentRow[]>([]);
  const [detectedBackup, setDetectedBackup] = useState<BackupPayload | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();

  if (!isOpen) return null;

  const handleParse = (textToParse: string = rawText) => {
    const trimmed = textToParse.trim();
    if (!trimmed) return;

    // Check if pasted content is a JSON backup package
    if (isJsonBackup(trimmed)) {
      const backup = parseJsonBackup(trimmed);
      if (backup) {
        setDetectedBackup(backup);
        setParsedRows([]);
        return;
      }
    }

    // Otherwise parse as standard Excel / CSV resident rows
    setDetectedBackup(null);
    const names = new Set(existingResidents.map(r => r.fullName.toLowerCase()));
    const results = parsePastedResidentText(trimmed, names);
    setParsedRows(results);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        handleParse(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitResidents = async () => {
    const valid = parsedRows.filter(r => r.status === 'valid');
    const newRecords: Resident[] = valid.map((r, idx) => ({
      id: `res_${Date.now()}_${idx}`,
      fullName: r.fullName,
      admissionDate: r.admissionDate,
      elevationDate: r.elevationDate,
      phaseStatus: 'Junior'
    }));

    await db.residents.bulkAdd(newRecords);
    toast.success(`Imported ${newRecords.length} residents successfully.`);
    onClose();
  };

  const handleRestoreFullSystemBackup = async () => {
    if (!detectedBackup) return;

    const ok = await confirm({
      title: 'Restore full backup?',
      message: 'Restoring this backup will replace current local database tables with the backup contents (categories, modules, residents & attendance). Proceed?',
      variant: 'danger',
      confirmLabel: 'Restore Backup'
    });
    if (!ok) return;

    try {
      setIsRestoringBackup(true);
      const res = await restoreFullBackup(detectedBackup);
      toast.success(
        `${res.categoriesCount} Categories · ${res.modulesCount} Modules · ${res.residentsCount} Residents · ${res.attendanceCount} Attendance Logs`,
        'System successfully restored'
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : String(err), 'Failed to restore backup');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-sage-200 dark:border-sage-300">
          <h3 className="font-display text-base font-semibold text-sage-900 flex items-center space-x-2">
            <Clipboard className="w-5 h-5 text-brass-600" />
            <span>Smart Bulk Paste & JSON Backup Restore</span>
          </h3>
          <button
            onClick={onClose}
            className="text-sage-400 hover:text-sage-600 p-1 rounded-xl hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-sage-600">
              Paste rows from Excel (Name [TAB] Dates) or Full Backup (.json):
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-brass-700 hover:underline flex items-center space-x-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .json or .csv</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <textarea
            rows={4}
            value={rawText}
            onChange={e => {
              setRawText(e.target.value);
              if (detectedBackup || parsedRows.length > 0) {
                setDetectedBackup(null);
                setParsedRows([]);
              }
            }}
            placeholder="Paste Excel tab-separated rows OR paste exported backup JSON here..."
            className="w-full p-3 text-xs font-mono bg-sage-50 dark:bg-sage-200/50 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 dark:placeholder:text-sage-500 focus:outline-none focus:ring-2 focus:ring-brass-500/40"
          />

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => handleParse()}
              disabled={!rawText.trim()}
              className="px-5 py-2.5 bg-rehab-700 hover:bg-rehab-800 dark:bg-rehab-600 dark:hover:bg-rehab-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Parse & Validate Clipboard</span>
            </button>
          </div>
        </div>

        {/* Mode A: Backup JSON Package Detected */}
        {detectedBackup && (
          <div className="p-4 rounded-2xl bg-brass-50 dark:bg-brass-500/15 border border-brass-300/70 dark:border-brass-400/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-brass-600" />
                <h4 className="text-xs font-bold text-brass-900">
                  Full System Backup JSON Detected!
                </h4>
              </div>
              {detectedBackup.exportedAt && (
                <span className="text-[10px] font-mono text-sage-500">
                  Exported: {new Date(detectedBackup.exportedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-white dark:bg-sage-200/60 rounded-xl border border-sage-200 dark:border-sage-300 text-center">
                <Layers className="w-3.5 h-3.5 text-brass-600 mx-auto mb-0.5" />
                <div className="font-bold text-xs text-sage-900">
                  {detectedBackup.categories?.length || 0}
                </div>
                <div className="text-[10px] text-sage-500">Categories</div>
              </div>

              <div className="p-2.5 bg-white dark:bg-sage-200/60 rounded-xl border border-sage-200 dark:border-sage-300 text-center">
                <BookOpen className="w-3.5 h-3.5 text-brass-600 mx-auto mb-0.5" />
                <div className="font-bold text-xs text-sage-900">
                  {detectedBackup.modules?.length || 0}
                </div>
                <div className="text-[10px] text-sage-500">Modules</div>
              </div>

              <div className="p-2.5 bg-white dark:bg-sage-200/60 rounded-xl border border-sage-200 dark:border-sage-300 text-center">
                <Users className="w-3.5 h-3.5 text-brass-600 mx-auto mb-0.5" />
                <div className="font-bold text-xs text-sage-900">
                  {detectedBackup.residents?.length || 0}
                </div>
                <div className="text-[10px] text-sage-500">Residents</div>
              </div>

              <div className="p-2.5 bg-white dark:bg-sage-200/60 rounded-xl border border-sage-200 dark:border-sage-300 text-center">
                <CheckCircle className="w-3.5 h-3.5 text-brass-600 mx-auto mb-0.5" />
                <div className="font-bold text-xs text-sage-900">
                  {detectedBackup.attendance?.length || 0}
                </div>
                <div className="text-[10px] text-sage-500">Attendance Logs</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestoreFullSystemBackup}
              disabled={isRestoringBackup}
              className="w-full py-2.5 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>
                {isRestoringBackup
                  ? 'Restoring Database...'
                  : 'Restore Full System from this JSON'}
              </span>
            </button>
          </div>
        )}

        {/* Mode B: Resident List Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-sage-700">
              Preview ({parsedRows.length} Rows Detected)
            </h4>
            <div className="max-h-56 overflow-y-auto border border-sage-200 dark:border-sage-300 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-sage-100 dark:bg-sage-200 border-b border-sage-200 dark:border-sage-300 text-sage-700">
                  <tr>
                    <th className="p-2.5 font-semibold">Name</th>
                    <th className="p-2.5 font-semibold">Admission</th>
                    <th className="p-2.5 font-semibold">Elevation</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-200 dark:divide-sage-300">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-sage-50 dark:hover:bg-sage-200/50">
                      <td className="p-2.5 font-semibold text-sage-900">{r.fullName}</td>
                      <td className="p-2.5 font-mono text-sage-600">{formatToUSDate(r.admissionDate) || '—'}</td>
                      <td className="p-2.5 font-mono text-sage-600">{formatToUSDate(r.elevationDate) || '—'}</td>
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

        {/* Footer */}
        <div className="pt-3 border-t border-sage-200 dark:border-sage-300 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          {!detectedBackup && (
            <button
              type="button"
              onClick={handleCommitResidents}
              disabled={parsedRows.filter(r => r.status === 'valid').length === 0}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Import {parsedRows.filter(r => r.status === 'valid').length} Valid Residents
            </button>
          )}
        </div>
      </div>
    </div>
  );
};