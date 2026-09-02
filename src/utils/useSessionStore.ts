// src/utils/useSessionStore.ts
import { useState, useEffect } from 'react';

export interface SessionState {
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

  // Config View State
  configTab: 'modules' | 'residents' | 'backup';
}

const defaultState: SessionState = {
  matrixSearch: '',
  matrixPage: 1,
  matrixPageSize: 25,
  matrixStickDates: false,

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

  journalResidentId: '',
  journalResidentSearch: '',
  journalPhaseFilter: 'ALL',
  journalModuleSearch: '',
  journalCatFilter: 'ALL',
  journalCollapsedCats: [],
  journalManualDates: {},

  configTab: 'modules',
};

// Global in-memory state for session preservation (zero external dependencies)
let globalState: SessionState = { ...defaultState };
const listeners = new Set<() => void>();

export function useSessionStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setMatrixState = (patch: Partial<SessionState>) => {
    globalState = { ...globalState, ...patch };
    listeners.forEach(l => l());
  };

  const setBatchState = (patch: Partial<SessionState>) => {
    globalState = { ...globalState, ...patch };
    listeners.forEach(l => l());
  };

  const setJournalState = (patch: Partial<SessionState>) => {
    globalState = { ...globalState, ...patch };
    listeners.forEach(l => l());
  };

  const setConfigState = (patch: Partial<SessionState>) => {
    globalState = { ...globalState, ...patch };
    listeners.forEach(l => l());
  };

  return {
    ...globalState,
    setMatrixState,
    setBatchState,
    setJournalState,
    setConfigState,
  };
}