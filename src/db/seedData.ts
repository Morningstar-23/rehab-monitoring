import type { Category, Module, Resident } from '../types';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat_cbt',
    name: 'Early Recovery Skills (CBT)',
    colorHex: '#FACC15',
    headerBgHex: '#FEF08A',
    headerTextHex: '#713F12',
    sortOrder: 1,
  },
  {
    id: 'cat_discovery',
    name: 'Discovery Session',
    colorHex: '#4ADE80',
    headerBgHex: '#DCFCE7',
    headerTextHex: '#14532D',
    sortOrder: 2,
  },
  {
    id: 'cat_additional',
    name: 'Additional Activities',
    colorHex: '#15803D',
    headerBgHex: '#BBF7D0',
    headerTextHex: '#052E16',
    sortOrder: 3,
  },
  {
    id: 'cat_civic',
    name: 'Social Awareness / Civic Consciousness Session',
    colorHex: '#38BDF8',
    headerBgHex: '#E0F2FE',
    headerTextHex: '#0C4A6E',
    sortOrder: 4,
  }
];

export const SEED_MODULES: Omit<Module, 'id'>[] = [
  // CBT (10 modules)
  { categoryId: 'cat_cbt', name: 'Triggers', sortOrder: 1, conductedDates: ['2026-04-15'] },
  { categoryId: 'cat_cbt', name: 'Coping w/ Triggers', sortOrder: 2, conductedDates: ['2026-04-08', '2026-05-13'] },
  { categoryId: 'cat_cbt', name: 'Thought Stopping Techniques', sortOrder: 3, conductedDates: ['2026-04-13', '2026-05-12'] },
  { categoryId: 'cat_cbt', name: 'External Triggers', sortOrder: 4, conductedDates: ['2026-04-15', '2026-05-12'] },
  { categoryId: 'cat_cbt', name: 'Internal Triggers', sortOrder: 5, conductedDates: ['2026-04-20', '2026-04-21'] },
  { categoryId: 'cat_cbt', name: 'Roadmap to Recovery', sortOrder: 6, conductedDates: ['2026-04-22', '2026-04-27'] },
  { categoryId: 'cat_cbt', name: 'Self-Help Group', sortOrder: 7, conductedDates: ['2026-02-02', '2026-04-27'] },
  { categoryId: 'cat_cbt', name: '12-Steps Wisdom', sortOrder: 8, conductedDates: ['2026-02-04', '2026-04-29'] },
  { categoryId: 'cat_cbt', name: 'Common Challenges in maintaining Abstinence', sortOrder: 9, conductedDates: ['2026-05-04', '2026-05-09'] },
  { categoryId: 'cat_cbt', name: 'Thinking, Feeling and Doing', sortOrder: 10, conductedDates: ['2026-05-12'] },

  // Discovery (10 modules)
  { categoryId: 'cat_discovery', name: 'Dealing with Character Flaws in Recovery', sortOrder: 1, conductedDates: ['2026-02-16', '2026-05-12', '2026-05-13'] },
  { categoryId: 'cat_discovery', name: 'Addiction & Denial', sortOrder: 2, conductedDates: ['2026-02-17', '2026-05-13'] },
  { categoryId: 'cat_discovery', name: 'Adiction & Creativity', sortOrder: 3, conductedDates: ['2026-02-24', '2026-05-18'] },
  { categoryId: 'cat_discovery', name: 'Change is Possible for Addict', sortOrder: 4, conductedDates: ['2026-02-24', '2026-05-20'] },
  { categoryId: 'cat_discovery', name: 'Rehab means Second Chance in Life', sortOrder: 5, conductedDates: ['2026-02-05', '2026-02-25', '2026-05-25'] },
  { categoryId: 'cat_discovery', name: 'Personality Clashes in Rehab', sortOrder: 6, conductedDates: ['2026-03-02', '2026-05-28'] },
  { categoryId: 'cat_discovery', name: 'Expressing Empathy', sortOrder: 7, conductedDates: ['2026-03-04', '2026-06-03'] },
  { categoryId: 'cat_discovery', name: 'Hearing & Listening', sortOrder: 8, conductedDates: ['2026-03-09', '2026-06-05'] },
  { categoryId: 'cat_discovery', name: 'A New Self-Image in Rehab', sortOrder: 9, conductedDates: ['2026-03-11'] },
  { categoryId: 'cat_discovery', name: 'Identifying Strength & Weaknesses', sortOrder: 10, conductedDates: ['2026-03-12', '2026-03-16', '2026-06-09'] },

  // Additional (3 modules)
  { categoryId: 'cat_additional', name: 'Self Expression & Leisure', sortOrder: 1, conductedDates: ['2026-03-18', '2026-05-25', '2026-06-15'] },
  { categoryId: 'cat_additional', name: 'Emotional Well-Being and Goal Planning', sortOrder: 2, conductedDates: ['2026-03-23', '2026-05-23'] },
  { categoryId: 'cat_additional', name: 'Receiving Criticism or Confrontation', sortOrder: 3, conductedDates: ['2026-03-25'] },

  // Civic Consciousness (10 modules)
  { categoryId: 'cat_civic', name: 'Cultural 1', sortOrder: 1, conductedDates: ['2026-04-08', '2026-04-22', '2026-06-08'] },
  { categoryId: 'cat_civic', name: 'Cultural 2', sortOrder: 2, conductedDates: ['2026-04-08', '2026-04-22', '2026-06-22'] },
  { categoryId: 'cat_civic', name: 'Environment 1', sortOrder: 3, conductedDates: ['2026-03-09', '2026-05-13', '2026-05-27'] },
  { categoryId: 'cat_civic', name: 'Environment 2', sortOrder: 4, conductedDates: ['2026-03-09', '2026-04-29', '2026-05-27'] },
  { categoryId: 'cat_civic', name: 'Family 1', sortOrder: 5, conductedDates: ['2026-03-04', '2026-06-03'] },
  { categoryId: 'cat_civic', name: 'Family 2', sortOrder: 6, conductedDates: ['2026-04-29', '2026-05-06', '2026-06-03'] },
  { categoryId: 'cat_civic', name: 'Social 1', sortOrder: 7, conductedDates: ['2026-02-25', '2026-04-29', '2026-06-08'] },
  { categoryId: 'cat_civic', name: 'Social 2', sortOrder: 8, conductedDates: ['2026-03-18', '2026-05-13', '2026-06-03'] },
  { categoryId: 'cat_civic', name: 'Educational 1', sortOrder: 9, conductedDates: ['2026-02-24', '2026-06-08'] },
  { categoryId: 'cat_civic', name: 'Educational 2', sortOrder: 10, conductedDates: ['2026-03-25', '2026-05-20'] }
];

export const SEED_RESIDENTS: Resident[] = [
  { id: 'res_1', fullName: 'Joker Pantig De Leon', admissionDate: '2026-01-05', elevationDate: '2026-02-27', phaseStatus: 'Junior' },
  { id: 'res_2', fullName: 'Robert Apolo', admissionDate: '', elevationDate: '', phaseStatus: 'Junior' },
  { id: 'res_3', fullName: 'Adrian Libumfacil', admissionDate: '', elevationDate: '2026-02-27', phaseStatus: 'Junior' },
  { id: 'res_4', fullName: 'Nicole John Mojica', admissionDate: '2026-01-30', elevationDate: '2026-02-06', phaseStatus: 'Junior' },
  { id: 'res_5', fullName: 'Jun Jun Sanchez', admissionDate: '', elevationDate: '', phaseStatus: 'Junior' },
  { id: 'res_6', fullName: 'Placido Garcia', admissionDate: '', elevationDate: '2026-05-08', phaseStatus: 'Junior' },
  { id: 'res_7', fullName: 'Alvin Concivido', admissionDate: '2026-02-23', elevationDate: '2026-03-23', phaseStatus: 'Junior' },
  { id: 'res_8', fullName: 'Irold Dizon', admissionDate: '2026-02-26', elevationDate: '2026-03-23', phaseStatus: 'Junior' },
  { id: 'res_9', fullName: 'Francis Magsino', admissionDate: '2026-03-03', elevationDate: '', phaseStatus: 'Junior' }
];