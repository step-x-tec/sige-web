'use client';

import { useEffect, useState } from 'react';
import { subscribeToQueueChanges, flushQueue } from '@/lib/offlineSync';
import { countQueuedAttendance, countQueuedGrades } from '@/lib/offlineDb';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    Promise.all([countQueuedAttendance(), countQueuedGrades()]).then(([a, g]) => setPendingCount(a + g));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribe = subscribeToQueueChanges(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`px-4 py-2 text-center text-sm sm:px-6 ${isOnline ? 'bg-chalk/30 text-ink' : 'bg-clay/15 text-clay'}`}>
      {!isOnline && <span>Hors ligne — l’appel et la saisie de notes restent utilisables, la synchronisation reprendra automatiquement. </span>}
      {pendingCount > 0 && (
        <span>
          {pendingCount} saisie{pendingCount > 1 ? 's' : ''} en attente de synchronisation
          {isOnline && (
            <button onClick={() => flushQueue()} className="ml-2 underline">
              Synchroniser maintenant
            </button>
          )}
        </span>
      )}
    </div>
  );
}
