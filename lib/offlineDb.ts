'use client';

const DB_NAME = 'sige-offline';
const DB_VERSION = 2; // v2 : ajout du store pendingGrades (voir migration ci-dessous)
const STORE_CACHE = 'apiCache';
const STORE_QUEUE = 'pendingAttendance';
const STORE_GRADES_QUEUE = 'pendingGrades';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE); // clé = chemin d'API
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_GRADES_QUEUE)) {
        db.createObjectStore(STORE_GRADES_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// -------------------- Cache de lecture (rosters, cours du jour) --------------------

export async function cacheApiResponse(path: string, data: unknown): Promise<void> {
  await withStore(STORE_CACHE, 'readwrite', (store) => store.put({ data, cachedAt: Date.now() }, path));
}

export async function getCachedApiResponse<T>(path: string): Promise<{ data: T; cachedAt: number } | null> {
  const result = await withStore<{ data: T; cachedAt: number } | undefined>(STORE_CACHE, 'readonly', (store) => store.get(path));
  return result ?? null;
}

// -------------------- File d'attente d'écriture (présences hors ligne) --------------------

export interface PendingAttendance {
  id?: number;
  timetableSlotId: string;
  records: { enrollmentId: string; status: string }[];
  createdAt: number;
}

export async function enqueueAttendance(entry: Omit<PendingAttendance, 'id'>): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.add(entry));
}

export async function getQueuedAttendance(): Promise<PendingAttendance[]> {
  return withStore<PendingAttendance[]>(STORE_QUEUE, 'readonly', (store) => store.getAll());
}

export async function removeQueuedAttendance(id: number): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.delete(id));
}

export async function countQueuedAttendance(): Promise<number> {
  return withStore<number>(STORE_QUEUE, 'readonly', (store) => store.count());
}

// -------------------- File d'attente d'écriture (notes hors ligne) --------------------

export interface PendingGrades {
  id?: number;
  assessmentId: string;
  grades: { enrollmentId: string; score?: number }[];
  createdAt: number;
}

export async function enqueueGrades(entry: Omit<PendingGrades, 'id'>): Promise<void> {
  await withStore(STORE_GRADES_QUEUE, 'readwrite', (store) => store.add(entry));
}

export async function getQueuedGrades(): Promise<PendingGrades[]> {
  return withStore<PendingGrades[]>(STORE_GRADES_QUEUE, 'readonly', (store) => store.getAll());
}

export async function removeQueuedGrades(id: number): Promise<void> {
  await withStore(STORE_GRADES_QUEUE, 'readwrite', (store) => store.delete(id));
}

export async function countQueuedGrades(): Promise<number> {
  return withStore<number>(STORE_GRADES_QUEUE, 'readonly', (store) => store.count());
}
