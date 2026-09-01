export interface Category {
  id: string;
  name: string;
  colorHex: string;
  headerBgHex: string;
  headerTextHex: string;
  sortOrder: number;
}

export interface Module {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  conductedDates: string[]; // ISO YYYY-MM-DD
}

export interface Resident {
  id: string;
  fullName: string;
  admissionDate?: string;
  elevationDate?: string;
  stayDuration?: string;
  phaseStatus: 'Junior' | 'Senior' | 'Aftercare' | 'Discharged';
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  residentId: string;
  moduleId: string;
  dateAttended: string; // ISO YYYY-MM-DD
  timestamp: number;
}

export interface MatrixRow {
  resident: Resident;
  moduleDates: Record<string, string[]>; // moduleId -> array of YYYY-MM-DD
  socialSupportCount: number;
}