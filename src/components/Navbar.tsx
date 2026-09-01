import React from 'react';
import { Activity, FileSpreadsheet, Users, BookOpen, Settings, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: 'matrix' | 'batch' | 'journal' | 'config';
  onTabChange: (tab: 'matrix' | 'batch' | 'journal' | 'config') => void;
  onExport: () => void;
  residentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onExport, residentCount }) => {
  return (
    <header className="bg-rehab-900 border-b border-rehab-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rehab-500 to-emerald-400 flex items-center justify-center shadow-inner">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-wide leading-tight">RehabTrack</h1>
            <p className="text-xs text-rehab-200">Clinical Attendance & Monitoring</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 bg-rehab-950/60 p-1.5 rounded-xl border border-rehab-800/60">
          <button
            onClick={() => onTabChange('matrix')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'matrix' ? 'bg-rehab-700 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-rehab-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Master Matrix</span>
          </button>

          <button
            onClick={() => onTabChange('batch')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'batch' ? 'bg-rehab-700 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-rehab-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Batch Session</span>
          </button>

          <button
            onClick={() => onTabChange('journal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'journal' ? 'bg-rehab-700 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-rehab-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Resident Journal</span>
          </button>

          <button
            onClick={() => onTabChange('config')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'config' ? 'bg-rehab-700 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-rehab-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-rehab-800/80 text-rehab-200 border border-rehab-700/50">
            {residentCount} Active Residents
          </span>
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
};