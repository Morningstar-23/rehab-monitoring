// src/utils/useSessionStore.ts
import { useState, useEffect } from 'react';

export interface SessionState {
  // App Navigation
  appActiveTab: 'matrix' | 'batch' | 'journal' | 'config';

  // Matrix View State
  matrixSearch: string;
  matrixPage: number;
  matrixPageSize: number;
  matrixStickDates: boolean;

  // Batch Logging State
  batchCategoryId: string;
  batchModuleId: string;
  batchDate: string;
  batchSelectedResidents: string[];
  batchSearch: string;
  batchPage: number;
  batchPageSize: number;
  batchHeaderSticky: boolean;
  batchFooterSticky: boolean;
  batchHeaderMinimized: boolean;

  // Journal View State
  journalResidentId: string;
  journalResidentSearch: string;
  journalPhaseFilter: string;
  journalModuleSearch: string;
  journalCatFilter: string;
  journalCollapsedCats: string[];
  journalManualDates: Record<string, string>;
  journalRosterPage: number;
  journalRosterPageSize: number;

  // Config View State
  configTab: 'modules' | 'residents' | 'backup';

  // Config: Categories & Modules Tab
  configCatSearch: string;
  configCatFilter: string;
  configCollapsedCats: string[];
  configModDateInputs: Record<string, string>;

  // Config: Residents Tab
  configResidentSearch: string;
  configResidentPhaseFilter: string;
  configResidentPage: number;
  configResidentPageSize: number;
}

const STORAGE_KEY = 'rehab_monitoring_session_state';

const defaultState: SessionState = {
  // App Navigation
  appActiveTab: 'matrix',

  // Matrix View
  matrixSearch: '',
  matrixPage: 1,
  matrixPageSize: 25,
  matrixStickDates: true,

  // Batch Logging
  batchCategoryId: '',
  batchModuleId: '',
  batchDate: '',
  batchSelectedResidents: [],
  batchSearch: '',
  batchPage: 1,
  batchPageSize: 24,
  batchHeaderSticky: true,
  batchFooterSticky: true,
  batchHeaderMinimized: false,

  // Journal View
  journalResidentId: '',
  journalResidentSearch: '',
  journalPhaseFilter: 'ALL',
  journalModuleSearch: '',
  journalCatFilter: 'ALL',
  journalCollapsedCats: [],
  journalManualDates: {},
  journalRosterPage: 1,
  journalRosterPageSize: 15,

  // Config View
  configTab: 'modules',

  // Config: Categories & Modules
  configCatSearch: '',
  configCatFilter: 'ALL',
  configCollapsedCats: [],
  configModDateInputs: {},

  // Config: Residents
  configResidentSearch: '',
  configResidentPhaseFilter: 'ALL',
  configResidentPage: 1,
  configResidentPageSize: 10,
};

// Hydrate initial state from sessionStorage if available
const loadInitialState = (): SessionState => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to load session store from sessionStorage', err);
  }
  return { ...defaultState };
};

// Global in-memory state for session preservation
let globalState: SessionState = loadInitialState();
const listeners = new Set<() => void>();

function updateGlobalState(patch: Partial<SessionState>) {
  globalState = { ...globalState, ...patch };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
  } catch (err) {
    console.error('Failed to save session store to sessionStorage', err);
  }
  listeners.forEach(l => l());
}

export function useSessionStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setAppState = (patch: Partial<SessionState>) => updateGlobalState(patch);
  const setMatrixState = (patch: Partial<SessionState>) => updateGlobalState(patch);
  const setBatchState = (patch: Partial<SessionState>) => updateGlobalState(patch);
  const setJournalState = (patch: Partial<SessionState>) => updateGlobalState(patch);
  const setConfigState = (patch: Partial<SessionState>) => updateGlobalState(patch);

  return {
    ...globalState,
    setAppState,
    setMatrixState,
    setBatchState,
    setJournalState,
    setConfigState,
  };
}