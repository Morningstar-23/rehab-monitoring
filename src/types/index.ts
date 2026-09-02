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
  phaseStatus: 'Junior' | 'Senior' | 'Re Entry';
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

export interface MatrixSettings {
  id: string; // always 'global' — single settings row
  residentDetailsBgHex: string;
  residentDetailsTextHex: string;
  sessionsTotalBgHex: string;
  sessionsTotalTextHex: string;
  columnWidths: Record<string, number>; // key: 'name' | 'admission' | 'elevation' | moduleId -> px width
}