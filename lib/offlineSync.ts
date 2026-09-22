'use client';

import { api, ApiError } from './api';
import {
  getQueuedAttendance, removeQueuedAttendance, countQueuedAttendance,
  getQueuedGrades, removeQueuedGrades, countQueuedGrades,
} from './offlineDb';

type Listener = (pendingCount: number) => void;
const listeners = new Set<Listener>();

export function subscribeToQueueChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function notifyListeners() {
  const [attendanceCount, gradesCount] = await Promise.all([countQueuedAttendance(), countQueuedGrades()]);
  listeners.forEach((l) => l(attendanceCount + gradesCount));
}

/**
 * Vide la file d'attente vers le backend. Pas de résolution de conflit
 * complexe nécessaire ici : POST /attendance/submit fait un UPSERT par
 * (session du jour, élève) côté backend (voir attendance.service.ts), donc
 * rejouer un appel en attente écrase simplement la valeur avec la dernière
 * saisie de l'enseignant — pas de fusion à inventer.
 *
 * Un échec individuel (ex: le créneau a été supprimé entre-temps) laisse
 * l'entrée en file plutôt que de la perdre silencieusement ; elle
 * réapparaîtra à la prochaine tentative. Une erreur 4xx répétée resterait
 * bloquée indéfiniment avec cette logique simple — acceptable pour ce
 * premier jet, mais à surveiller si ça devient un vrai cas en usage réel.
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const [pendingAttendance, pendingGrades] = await Promise.all([getQueuedAttendance(), getQueuedGrades()]);
  let synced = 0;
  let failed = 0;

  for (const entry of pendingAttendance) {
    try {
      await api.post('/attendance/submit', {
        timetableSlotId: entry.timetableSlotId,
        records: entry.records,
      });
      if (entry.id !== undefined) await removeQueuedAttendance(entry.id);
      synced++;
    } catch (err) {
      if (!(err instanceof ApiError)) break; // toujours hors ligne, inutile d'insister
      failed++;
    }
  }

  for (const entry of pendingGrades) {
    try {
      await api.post(`/assessments/${entry.assessmentId}/grades`, { grades: entry.grades });
      if (entry.id !== undefined) await removeQueuedGrades(entry.id);
      synced++;
    } catch (err) {
      if (!(err instanceof ApiError)) break;
      failed++;
    }
  }

  await notifyListeners();
  return { synced, failed };
}

let initialized = false;

/**
 * À appeler une fois au montage de l'app (AuthProvider). Écoute
 * l'évènement `online` du navigateur pour déclencher la synchronisation
 * automatiquement — c'est le comportement attendu par le §46 ("lorsque la
 * connexion revient : synchronisation automatique").
 */
export function initOfflineSync() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('online', () => {
    flushQueue();
  });
  // Tentative aussi au chargement, au cas où la file contenait déjà des
  // éléments d'une session précédente et que le réseau est déjà revenu.
  if (navigator.onLine) flushQueue();
  notifyListeners();
}
