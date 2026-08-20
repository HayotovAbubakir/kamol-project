import type { DataStore } from '@/types';

export const STORE_VERSION = 2;

export const initialStore: DataStore = {
  version: STORE_VERSION,
  users: [],
  projects: [],
  notifications: [],
  ratingEntries: [],
  comments: [],
};
