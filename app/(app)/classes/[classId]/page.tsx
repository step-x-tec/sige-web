'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

interface RosterEntry {
  enrollment_id: string;
  student_id: string;
  code: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

interface TeachingAssignment {
  id: string;
  code: string;
  subject_name: string;
  coefficient: string;
  teacher_first_name: string;
  teacher_last_name: string;
}

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const searchParams = useSearchParams();
  const academicYearId = searchParams.get('academicYearId') ?? '';

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [subjects, setSubjects] = useState<TeachingAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!academicYearId) return;
    Promise.all([
      api.get<RosterEntry[]>(`/attendance/classes/${params.classId}/roster?academicYearId=${academicYearId}`),
      api.get<TeachingAssignment[]>(`/teaching-assignments/by-class/${params.classId}`),
    ])
      .then(([r, s]) => {
        setRoster(r);
        setSubjects(s);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [params.classId, academicYearId]);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Classe</h1>

      {error && <p className="mb-4 text-sm text-clay">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Enseignants de la classe
        </h2>
        {subjects === null && !error && <p className="text-sm text-muted">Chargement…</p>}
        {subjects && subjects.length === 0 && <p className="text-sm text-muted">Aucun enseignement attribué.</p>}
        <ul className="divide-y divide-rule">
          {subjects?.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>{s.subject_name}</span>
              <span className="text-muted">{s.teacher_last_name} {s.teacher_first_name} · coeff. {s.coefficient}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Effectif {roster ? `(${roster.length})` : ''}
        </h2>
        {roster === null && !error && <p className="text-sm text-muted">Chargement…</p>}
        <ul className="divide-y divide-rule">
          {roster?.map((s) => (
            <li key={s.enrollment_id} className="flex items-center justify-between py-2.5">
              <span className="font-medium">{s.last_name} {s.first_name}</span>
              <span className="font-mono text-xs text-muted">{s.code}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
