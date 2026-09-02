// src/App.tsx
import { useEffect } from 'react';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { db } from './db/db';
import { Navbar } from './components/Navbar';
import { MatrixView } from './components/MatrixView';
import { BatchLoggingView } from './components/BatchLoggingView';
import { JournalEntryView } from './components/JournalEntryView';
import { ConfigView } from './components/ConfigView';
import { exportMatrixToExcel } from './utils/excelExport';
import { useSessionStore } from './utils/useSessionStore';
import { NotificationProvider, useToast, useConfirm } from './context/NotificationProvider';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const PAGE_TRANSITION: Transition = {
  duration: 0.15,
  ease: [0.22, 1, 0.36, 1] as const,
};

function AppContent() {
  const { appActiveTab, configTab, setAppState, setConfigState } = useSessionStore();
  const toast = useToast();
  const confirm = useConfirm();

  const activeTab = appActiveTab;
  const setActiveTab = (tab: 'matrix' | 'batch' | 'journal' | 'config') =>
    setAppState({ appActiveTab: tab });

  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];
  const residents = useLiveQuery(() => db.residents.toArray(), []) || [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) || [];

  // Check for updates from GitHub Releases on application startup
  useEffect(() => {
    async function checkForAppUpdates() {
      try {
        const update = await check();
        if (update?.available) {
          const proceed = await confirm({
            title: 'Update available',
            message: `Version ${update.version} is ready to install. Would you like to download and install it now?`,
            confirmLabel: 'Update Now',
            cancelLabel: 'Later'
          });
          if (proceed) {
            await update.downloadAndInstall();
            toast.success('Restarting RehabMonitoring...', 'Update complete');
            await relaunch();
          }
        }
      } catch (err) {
        // Silently continue if offline or running in web dev mode
        console.log('Update check skipped or offline:', err);
      }
    }

    checkForAppUpdates();
  }, []);

  const handleExport = () => {
    exportMatrixToExcel(categories, modules, residents, attendance);
  };

  const handleNavigateToConfig = (subTab: 'modules' | 'residents' | 'backup' = 'modules') => {
    setConfigState({ configTab: subTab });
    setAppState({ appActiveTab: 'config' });
  };

  return (
    <div className="min-h-screen bg-sage-50 text-sage-800 flex flex-col transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExport}
        residentCount={residents.length}
      />

      <main className="flex-1 relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'matrix' && (
            <motion.div
              key="matrix"
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
            >
              <MatrixView
                categories={categories}
                modules={modules}
                residents={residents}
                attendance={attendance}
              />
            </motion.div>
          )}

          {activeTab === 'batch' && (
            <motion.div
              key="batch"
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
            >
              <BatchLoggingView
                categories={categories}
                modules={modules}
                residents={residents}
                attendance={attendance}
                onNavigateToConfig={handleNavigateToConfig}
              />
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
            >
              <JournalEntryView
                categories={categories}
                modules={modules}
                residents={residents}
                attendance={attendance}
              />
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
            >
              <ConfigView
                categories={categories}
                modules={modules}
                residents={residents}
                initialTab={configTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}