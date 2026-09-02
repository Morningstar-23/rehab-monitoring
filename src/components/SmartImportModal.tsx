// src/components/SmartImportModal.tsx
import React, { useState, useRef } from 'react';
import { parsePastedResidentText, type ParsedResidentRow } from '../utils/clipboardParser';
import { isJsonBackup, parseJsonBackup, restoreFullBackup, type BackupPayload } from '../utils/backupRestore';
import { formatToUSDate } from '../utils/dateUtils';
import { db } from '../db/db';
import type { Resident } from '../types';
import { useToast, useConfirm } from '../context/NotificationProvider';
import {
  Clipboard,
  CheckCircle,
  AlertTriangle,
  X,
  Upload,
  Database,
  Layers,
  Users,
  BookOpen,
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingResidents: Resident[];
}

type BatchPhaseMode = 'auto' | Resident['phaseStatus'];

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  existingResidents
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedResidentRow[]>([]);
  const [batchPhaseMode, setBatchPhaseMode] = useState<BatchPhaseMode>('auto');
  const [detectedBackup, setDetectedBackup] = useState<BackupPayload | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();

  if (!isOpen) return null;

  const handleParse = (textToParse: string = rawText, phaseMode: BatchPhaseMode = batchPhaseMode) => {
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

    // Parse as standard Excel / CSV resident rows
    setDetectedBackup(null);
    const names = new Set(existingResidents.map(r => r.fullName.toLowerCase()));
    const rawResults = parsePastedResidentText(trimmed, names);

    // Apply active batch phase setting
    const results = rawResults.map(r => ({
      ...r,
      phaseStatus: phaseMode === 'auto' ? (r.elevationDate ? 'Senior' : 'Junior') : phaseMode
    }));

    setParsedRows(results);
  };

  const handleBatchPhaseChange = (mode: BatchPhaseMode) => {
    setBatchPhaseMode(mode);
    setParsedRows(prev =>
      prev.map(row => ({
        ...row,
        phaseStatus: mode === 'auto' ? (row.elevationDate ? 'Senior' : 'Junior') : mode
      }))
    );
  };

  const handleRowPhaseChange = (index: number, newPhase: Resident['phaseStatus']) => {
    setParsedRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], phaseStatus: newPhase };
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        handleParse(content, batchPhaseMode);
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
      phaseStatus: r.phaseStatus
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

  const validCount = parsedRows.filter(r => r.status === 'valid').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-sage-200 dark:border-sage-300">
          <h3 className="font-display text-base font-semibold text-sage-900 flex items-center space-x-2">
            <Clipboard className="w-5 h-5 text-brass-600" />
            <span>Smart Bulk Paste & JSON Backup Restore</span>
          </h3>
          <button
            onClick={onClose}
            className="text-sage-400 hover:text-sage-600 p-1 rounded-xl hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors cursor-pointer"
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
              className="text-xs font-semibold text-brass-700 dark:text-brass-400 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .json, .csv or .txt</span>
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
            placeholder="Paste Excel tab-separated rows (e.g. John Doe [TAB] 01/15/2024 [TAB] 07/15/2024) OR paste backup JSON..."
            className="w-full p-3 text-xs font-mono bg-sage-50 dark:bg-sage-200/50 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 placeholder:text-sage-400 dark:placeholder:text-sage-500 focus:outline-none focus:ring-2 focus:ring-brass-500/40"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => handleParse(rawText, batchPhaseMode)}
              disabled={!rawText.trim()}
              className="px-5 py-2.5 bg-rehab-700 hover:bg-rehab-800 dark:bg-rehab-600 dark:hover:bg-rehab-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parse & Validate Clipboard</span>
            </button>

            <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-sage-500">
              <Info className="w-3.5 h-3.5 text-brass-600" />
              <span>2 dates = Senior, 1 date = Junior automatically</span>
            </div>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-sage-700 dark:text-sage-300">
                Preview ({parsedRows.length} Rows Detected · {validCount} Valid)
              </h4>
              <span className="text-[11px] text-sage-500">
                You can change phases per row or use the batch selector below.
              </span>
            </div>

            {/* Table */}
            <div className="max-h-56 overflow-y-auto border border-sage-200 dark:border-sage-300 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-sage-100 dark:bg-sage-200 border-b border-sage-200 dark:border-sage-300 text-sage-700">
                  <tr>
                    <th className="p-2.5 font-semibold w-8">#</th>
                    <th className="p-2.5 font-semibold">Name</th>
                    <th className="p-2.5 font-semibold">Admission</th>
                    <th className="p-2.5 font-semibold">Elevation</th>
                    <th className="p-2.5 font-semibold">Phase Status</th>
                    <th className="p-2.5 font-semibold">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-200 dark:divide-sage-300">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-sage-50 dark:hover:bg-sage-200/50 transition-colors">
                      <td className="p-2.5 font-mono text-sage-400 text-[11px]">{i + 1}</td>
                      <td className="p-2.5 font-semibold text-sage-900">{r.fullName}</td>
                      <td className="p-2.5 font-mono text-sage-600">{formatToUSDate(r.admissionDate) || '—'}</td>
                      <td className="p-2.5 font-mono text-sage-600">{formatToUSDate(r.elevationDate) || '—'}</td>
                      <td className="p-2.5">
                        <select
                          value={r.phaseStatus}
                          onChange={e => handleRowPhaseChange(i, e.target.value as Resident['phaseStatus'])}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-brass-500 ${
                            r.phaseStatus === 'Junior'
                              ? 'bg-brass-50 dark:bg-brass-900/40 text-brass-800 dark:text-brass-300 border-brass-300/70 dark:border-brass-500/30'
                              : r.phaseStatus === 'Senior'
                              ? 'bg-rehab-50 dark:bg-rehab-900/40 text-rehab-800 dark:text-rehab-300 border-rehab-400/40 dark:border-rehab-500/30'
                              : 'bg-sage-100 dark:bg-sage-200 text-sage-800 dark:text-sage-300 border-sage-300 dark:border-sage-400/30'
                          }`}
                        >
                          <option value="Junior">Junior Phase</option>
                          <option value="Senior">Senior Phase</option>
                          <option value="Re Entry">Re Entry</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        {r.status === 'valid' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{r.errorMessage || 'Duplicate'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Manual / Batch Phase Override Controls at the bottom */}
            <div className="p-3 bg-sage-100/70 dark:bg-sage-200/50 rounded-2xl border border-sage-200 dark:border-sage-300/70 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-sage-800 dark:text-sage-200">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brass-600" />
                  <span>Batch Phase Setting:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBatchPhaseChange('auto')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                      batchPhaseMode === 'auto'
                        ? 'bg-brass-600 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-sage-100 text-sage-600 hover:text-sage-900 border border-sage-200 dark:border-sage-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-detect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBatchPhaseChange('Junior')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      batchPhaseMode === 'Junior'
                        ? 'bg-brass-600 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-sage-100 text-sage-600 hover:text-sage-900 border border-sage-200 dark:border-sage-300'
                    }`}
                  >
                    All Junior
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBatchPhaseChange('Senior')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      batchPhaseMode === 'Senior'
                        ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-sage-100 text-sage-600 hover:text-sage-900 border border-sage-200 dark:border-sage-300'
                    }`}
                  >
                    All Senior
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBatchPhaseChange('Re Entry')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      batchPhaseMode === 'Re Entry'
                        ? 'bg-sage-700 dark:bg-sage-400 dark:text-sage-900 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-sage-100 text-sage-600 hover:text-sage-900 border border-sage-200 dark:border-sage-300'
                    }`}
                  >
                    All Re Entry
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-sage-500">
                {batchPhaseMode === 'auto'
                  ? '✨ Auto-detect is active: rows with both Admission and Elevation dates are marked as Senior; 1-date rows are marked as Junior.'
                  : `Manual batch override active: all valid rows above are set to "${batchPhaseMode}". You can still edit individual rows in the table.`}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-sage-200 dark:border-sage-300 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {!detectedBackup && (
            <button
              type="button"
              onClick={handleCommitResidents}
              disabled={validCount === 0}
              className="px-5 py-2 bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Import {validCount} Valid Residents
            </button>
          )}
        </div>
      </div>
    </div>
  );
};