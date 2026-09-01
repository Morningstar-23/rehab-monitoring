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
  // 1. CBT (10 modules)
  { categoryId: 'cat_cbt', name: 'Triggers', sortOrder: 1, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Coping w/ Triggers', sortOrder: 2, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Thought Stopping Techniques', sortOrder: 3, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'External Triggers', sortOrder: 4, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Internal Triggers', sortOrder: 5, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Roadmap to Recovery', sortOrder: 6, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Self-Help Group', sortOrder: 7, conductedDates: [] },
  { categoryId: 'cat_cbt', name: '12-Steps Wisdom', sortOrder: 8, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Common Challenges in maintaining Abstinence', sortOrder: 9, conductedDates: [] },
  { categoryId: 'cat_cbt', name: 'Thinking, Feeling and Doing', sortOrder: 10, conductedDates: [] },

  // 2. Discovery (10 modules)
  { categoryId: 'cat_discovery', name: 'Dealing with Character Flaws in Recovery', sortOrder: 1, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Addiction & Denial', sortOrder: 2, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Adiction & Creativity', sortOrder: 3, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Change is Possible for Addict', sortOrder: 4, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Rehab means Second Chance in Life', sortOrder: 5, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Personality Clashes in Rehab', sortOrder: 6, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Expressing Empathy', sortOrder: 7, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Hearing & Listening', sortOrder: 8, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'A New Self-Image in Rehab', sortOrder: 9, conductedDates: [] },
  { categoryId: 'cat_discovery', name: 'Identifying Strength & Weaknesses', sortOrder: 10, conductedDates: [] },

  // 3. Additional (3 modules)
  { categoryId: 'cat_additional', name: 'Self Expression & Leisure', sortOrder: 1, conductedDates: [] },
  { categoryId: 'cat_additional', name: 'Emotional Well-Being and Goal Planning', sortOrder: 2, conductedDates: [] },
  { categoryId: 'cat_additional', name: 'Receiving Criticism or Confrontation', sortOrder: 3, conductedDates: [] },

  // 4. Civic Consciousness (10 modules)
  { categoryId: 'cat_civic', name: 'Cultural 1', sortOrder: 1, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Cultural 2', sortOrder: 2, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Environment 1', sortOrder: 3, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Environment 2', sortOrder: 4, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Family 1', sortOrder: 5, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Family 2', sortOrder: 6, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Social 1', sortOrder: 7, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Social 2', sortOrder: 8, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Educational 1', sortOrder: 9, conductedDates: [] },
  { categoryId: 'cat_civic', name: 'Educational 2', sortOrder: 10, conductedDates: [] }
];

// Production Clean: Zero dummy residents
export const SEED_RESIDENTS: Resident[] = [];