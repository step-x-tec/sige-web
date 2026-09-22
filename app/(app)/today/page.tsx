'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface CurrentSession {
  timetable_slot_id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  class_id: string;
  class_name: string;
  subject_name: string;
  teaching_assignment_id: string;
  academic_year_id: string;
  already_taken: boolean;
}

function formatTime(t: string) {
  return t.slice(0, 5); // 'HH:MM:SS' → 'HH:MM'
}

export default function TodayPage() {
  const [sessions, setSessions] = useState<CurrentSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    api
      .getWithOfflineFallback<CurrentSession[]>('/attendance/my-current-sessions')
      .then(({ data, isFromCache }) => {
        setSessions(data);
        setIsFromCache(isFromCache);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Mon espace</h1>
      <p className="mb-8 text-sm text-muted">Voici ce que vous devez faire maintenant.</p>

      {error && <p className="text-sm text-clay">{error}</p>}
      {isFromCache && (
        <p className="mb-4 rounded-sige bg-chalk/20 px-3 py-2 text-sm">
          Liste des cours chargée depuis la dernière sauvegarde locale (hors ligne) — peut ne plus être à jour.
        </p>
      )}

      {sessions === null && !error && <p className="text-sm text-muted">Chargement…</p>}

      {sessions !== null && sessions.length === 0 && (
        <div className="rounded-sige border border-dashed border-rule px-5 py-8 text-center">
          <p className="text-sm text-muted">Aucun cours en ce moment.</p>
        </div>
      )}

      <ul className="space-y-3">
        {sessions?.map((s) => (
          <li
            key={s.timetable_slot_id}
            className={`rounded-sige border border-rule bg-white/40 px-5 py-4 ${
              !s.already_taken ? 'border-l-4 border-l-board' : ''
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{formatTime(s.start_time)} – {formatTime(s.end_time)}{s.room ? ` · ${s.room}` : ''}</p>
                <h2 className="text-lg font-medium">{s.subject_name} — {s.class_name}</h2>
              </div>
              {s.already_taken ? <Badge tone="done">Appel fait</Badge> : <Badge tone="active">En cours</Badge>}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/attendance/${s.timetable_slot_id}?classId=${s.class_id}&academicYearId=${s.academic_year_id}`}
              >
                <Button variant={s.already_taken ? 'secondary' : 'primary'}>
                  {s.already_taken ? 'Revoir l’appel' : 'Faire l’appel'}
                </Button>
              </Link>
              <Link
                href={`/assessments?teachingAssignmentId=${s.teaching_assignment_id}&classId=${s.class_id}&academicYearId=${s.academic_year_id}`}
              >
                <Button variant="ghost">Évaluations</Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
