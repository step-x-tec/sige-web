'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { enqueueAttendance } from '@/lib/offlineDb';
import { Button } from '@/components/ui/Button';

type Status = 'present' | 'absent' | 'late' | 'excused';

interface RosterEntry {
  enrollment_id: string;
  student_id: string;
  code: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

const statusLabels: Record<Status, string> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'Retard',
  excused: 'Justifié',
};

const statusStyles: Record<Status, string> = {
  present: 'bg-board text-paper border-board',
  absent: 'bg-clay text-paper border-clay',
  late: 'bg-chalk text-ink border-chalk',
  excused: 'bg-rule text-ink border-rule',
};

export default function AttendancePage() {
  const params = useParams<{ slotId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('classId') ?? '';
  const academicYearId = searchParams.get('academicYearId') ?? '';

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    if (!classId || !academicYearId) return;
    api
      .getWithOfflineFallback<RosterEntry[]>(`/attendance/classes/${classId}/roster?academicYearId=${academicYearId}`)
      .then(({ data, isFromCache }) => {
        setRoster(data);
        setIsFromCache(isFromCache);
        // Par défaut, tout le monde est marqué présent — l'enseignant
        // corrige seulement les exceptions, plus rapide que de tout cocher.
        const initial: Record<string, Status> = {};
        data.forEach((r) => (initial[r.enrollment_id] = 'present'));
        setStatuses(initial);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [classId, academicYearId]);

  function setStatus(enrollmentId: string, status: Status) {
    setStatuses((prev) => ({ ...prev, [enrollmentId]: status }));
  }

  function markAllPresent() {
    const all: Record<string, Status> = {};
    roster?.forEach((r) => (all[r.enrollment_id] = 'present'));
    setStatuses(all);
  }

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);
    const records = Object.entries(statuses).map(([enrollmentId, status]) => ({ enrollmentId, status }));
    try {
      await api.post('/attendance/submit', { timetableSlotId: params.slotId, records });
      setSaved(true);
      setTimeout(() => router.push('/today'), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        // Erreur applicative légitime (permission, créneau invalide...) —
        // ne pas la faire passer pour un problème réseau.
        setError(err.message);
      } else {
        // Pas de réponse du tout = hors ligne (ou serveur injoignable).
        // §46 : l'enseignant doit pouvoir continuer à faire l'appel sans
        // réseau — on met en file plutôt que de bloquer sa saisie.
        await enqueueAttendance({ timetableSlotId: params.slotId, records, createdAt: Date.now() });
        setSavedOffline(true);
        setTimeout(() => router.push('/today'), 1200);
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!classId || !academicYearId) {
    return <p className="text-sm text-clay">Paramètres manquants — revenez à « Mon espace ».</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Appel</h1>
        <button onClick={markAllPresent} className="text-sm text-board hover:underline">
          Tout marquer présent
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-clay">{error}</p>}
      {isFromCache && (
        <p className="mb-4 rounded-sige bg-chalk/20 px-3 py-2 text-sm">
          Effectif chargé depuis la dernière sauvegarde locale (hors ligne).
        </p>
      )}
      {roster === null && !error && <p className="text-sm text-muted">Chargement…</p>}

      <ul className="mb-6 divide-y divide-rule">
        {roster?.map((student) => (
          <li key={student.enrollment_id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{student.last_name} {student.first_name}</p>
              <p className="font-mono text-xs text-muted">{student.code}</p>
            </div>
            <div className="flex gap-1.5">
              {(Object.keys(statusLabels) as Status[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatus(student.enrollment_id, status)}
                  className={`rounded-sige border px-2.5 py-1 text-xs font-medium transition-colors ${
                    statuses[student.enrollment_id] === status
                      ? statusStyles[status]
                      : 'border-rule bg-transparent text-muted hover:border-ink'
                  }`}
                  aria-pressed={statuses[student.enrollment_id] === status}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {roster && roster.length > 0 && (
        <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
          {isSaving
            ? 'Enregistrement…'
            : saved
              ? 'Enregistré ✓'
              : savedOffline
                ? 'Enregistré localement — sera synchronisé ✓'
                : 'Enregistrer l’appel'}
        </Button>
      )}
    </div>
  );
}
