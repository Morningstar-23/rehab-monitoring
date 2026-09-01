import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { Navbar } from './components/Navbar';
import { MatrixView } from './components/MatrixView';
import { BatchLoggingView } from './components/BatchLoggingView';
import { JournalEntryView } from './components/JournalEntryView';
import { ConfigView } from './components/ConfigView';
import { exportMatrixToExcel } from './utils/excelExport';

export default function App() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'batch' | 'journal' | 'config'>('matrix');

  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];
  const residents = useLiveQuery(() => db.residents.toArray(), []) || [];
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) || [];

  const handleExport = () => {
    exportMatrixToExcel(categories, modules, residents, attendance);
  };

  return (
    <div className="min-h-screen bg-sage-50 text-slate-800 flex flex-col">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExport}
        residentCount={residents.length}
      />

      <main className="flex-1">
        {activeTab === 'matrix' && (
          <MatrixView
            categories={categories}
            modules={modules}
            residents={residents}
            attendance={attendance}
          />
        )}
        {activeTab === 'batch' && (
          <BatchLoggingView
            categories={categories}
            modules={modules}
            residents={residents}
            attendance={attendance}
          />
        )}
        {activeTab === 'journal' && (
          <JournalEntryView
            categories={categories}
            modules={modules}
            residents={residents}
            attendance={attendance}
          />
        )}
        {activeTab === 'config' && (
          <ConfigView
            categories={categories}
            modules={modules}
            residents={residents}
          />
        )}
      </main>
    </div>
  );
}