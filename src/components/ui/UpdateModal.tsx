// src/components/ui/UpdateModal.tsx
import React, { useEffect, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Sparkles, Download, RotateCw, X, ArrowUpCircle, AlertCircle } from 'lucide-react';

interface UpdateModalProps {
  manualCheckTrigger?: boolean;
  onCheckComplete?: (status: 'updated' | 'no-update' | 'error', version?: string) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  manualCheckTrigger,
  onCheckComplete,
}) => {
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'installing' | 'restarting' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    checkForUpdate(false);
  }, []);

  useEffect(() => {
    if (manualCheckTrigger) {
      checkForUpdate(true);
    }
  }, [manualCheckTrigger]);

  const checkForUpdate = async (isManual = false) => {
    try {
      const update = await check();
      if (update) {
        startTransition(() => {
          setUpdateInfo(update);
          setStatus('idle');
          setErrorMessage(null);
          setIsOpen(true);
        });
        if (onCheckComplete) onCheckComplete('updated', update.version);
      } else {
        if (onCheckComplete && isManual) onCheckComplete('no-update');
      }
    } catch (err: unknown) {
      console.error('Update check failed:', err);
      if (onCheckComplete && isManual) onCheckComplete('error');
    }
  };

  const handleInstall = async () => {
    if (!updateInfo) return;

    try {
      setStatus('downloading');
      setErrorMessage(null);
      let downloaded = 0;
      let total = 0;

      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength || 0;
            setTotalBytes(total);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setDownloadedBytes(downloaded);
            if (total > 0) {
              setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
            }
            break;
          case 'Finished':
            setStatus('installing');
            break;
        }
      });

      setStatus('restarting');
      // Wait a moment for NSIS installer to initialize, then relaunch
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (e: unknown) {
          console.error('Relaunch failed:', e);
          setStatus('error');
          setErrorMessage('Update downloaded. Please manually close and reopen the app to apply.');
        }
      }, 1000);
    } catch (error: unknown) {
      console.error('Failed to install update:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error installing update. Please try again.');
    }
  };

  const isBusy = status === 'downloading' || status === 'installing' || status === 'restarting';

  return (
    <AnimatePresence>
      {isOpen && updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-sage-50 dark:bg-sage-100 border border-brass-500/30 dark:border-brass-500/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-linear-to-b from-rehab-100/60 to-transparent dark:from-rehab-900/40 dark:to-transparent border-b border-brass-500/15">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-linear-to-br from-rehab-500 to-rehab-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(47,122,84,0.3)] shrink-0">
                    <Sparkles className="w-5 h-5 text-brass-200" />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-lg text-sage-900 dark:text-sage-950 leading-tight">
                      Update Available
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brass-100 dark:bg-brass-900/60 text-brass-700 dark:text-brass-400 border border-brass-500/20">
                        v{updateInfo.version}
                      </span>
                      <span className="text-xs text-sage-500">Ready to install</span>
                    </div>
                  </div>
                </div>

                {!isBusy && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-sage-400 hover:text-sage-700 dark:hover:text-sage-900 hover:bg-sage-200/50 dark:hover:bg-sage-300/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content & Release Notes */}
            <div className="p-6 space-y-4">
              <div className="bg-sage-100/70 dark:bg-sage-200/40 rounded-xl p-3.5 border border-sage-200 dark:border-sage-300/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brass-600 dark:text-brass-400 mb-1.5 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  Release Notes
                </p>
                <div className="text-xs text-sage-700 dark:text-sage-600 max-h-32 overflow-y-auto pr-1 whitespace-pre-wrap leading-relaxed">
                  {updateInfo.body || 'Performance improvements, stability updates, and bug fixes.'}
                </div>
              </div>

              {/* Progress & Installation States */}
              {isBusy && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs font-medium text-sage-600 dark:text-sage-400">
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-rehab-600 dark:text-rehab-400" />
                      {status === 'downloading' && `Downloading update... (${progress}%)`}
                      {status === 'installing' && 'Applying update files...'}
                      {status === 'restarting' && 'Relaunching RehabMonitoring...'}
                    </span>
                    {status === 'downloading' && (
                      <span className="font-semibold text-rehab-700 dark:text-rehab-300">{progress}%</span>
                    )}
                  </div>
                  <div className="w-full h-2.5 bg-sage-200 dark:bg-sage-300/40 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-linear-to-r from-rehab-500 to-rehab-600 rounded-full transition-all duration-200 ease-out"
                      style={{ width: status === 'installing' || status === 'restarting' ? '100%' : `${progress}%` }}
                    />
                  </div>
                  {status === 'downloading' && totalBytes > 0 && (
                    <div className="flex justify-end text-[11px] text-sage-400">
                      {(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / {(totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {status === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-sage-100/50 dark:bg-sage-200/20 border-t border-brass-500/15 flex items-center justify-end space-x-3">
              {!isBusy && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-sage-600 dark:text-sage-400 hover:text-sage-900 dark:hover:text-sage-900 hover:bg-sage-200/60 dark:hover:bg-sage-300/30 transition"
                >
                  Remind Me Later
                </button>
              )}
              <button
                type="button"
                onClick={handleInstall}
                disabled={isBusy}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-linear-to-r from-rehab-700 to-rehab-600 hover:from-rehab-600 hover:to-rehab-500 text-white text-xs font-medium shadow-[0_2px_10px_rgba(47,122,84,0.3)] transition disabled:opacity-50 select-none cursor-pointer"
              >
                {isBusy ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {status === 'downloading' && 'Downloading...'}
                      {status === 'installing' && 'Installing...'}
                      {status === 'restarting' && 'Restarting...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download & Update Now</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};