'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Assessment {
  id: string;
  title: string;
  assessment_date: string;
  max_score: string;
  status: string;
  grades_entered: string;
}

const statusTone: Record<string, 'neutral' | 'active' | 'done' | 'alert'> = {
  draft: 'neutral',
  submitted: 'active',
  controlled: 'active',
  validated: 'done',
  locked: 'alert',
};

export default function AssessmentsListPage() {
  const searchParams = useSearchParams();
  const teachingAssignmentId = searchParams.get('teachingAssignmentId') ?? '';
  const classId = searchParams.get('classId') ?? '';
  const academicYearId = searchParams.get('academicYearId') ?? '';

  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teachingAssignmentId) return;
    api
      .get<Assessment[]>(`/assessments/by-teaching-assignment/${teachingAssignmentId}`)
      .then(setAssessments)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [teachingAssignmentId]);

  if (!teachingAssignmentId) {
    return <p className="text-sm text-clay">Paramètres manquants — revenez à « Mon espace ».</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Évaluations</h1>
        <Link href={`/assessments/new?teachingAssignmentId=${teachingAssignmentId}&classId=${classId}&academicYearId=${academicYearId}`}>
          <Button variant="secondary">Nouvelle évaluation</Button>
        </Link>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {assessments === null && !error && <p className="text-sm text-muted">Chargement…</p>}
      {assessments !== null && assessments.length === 0 && (
        <div className="rounded-sige border border-dashed border-rule px-5 py-8 text-center">
          <p className="text-sm text-muted">Aucune évaluation créée pour cet enseignement.</p>
        </div>
      )}

      <ul className="space-y-3">
        {assessments?.map((a) => (
          <li key={a.id}>
            <Link
              href={`/assessments/${a.id}?classId=${classId}`}
              className="block rounded-sige border border-rule px-5 py-4 hover:border-ink"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">{a.assessment_date.slice(0, 10)}</p>
                  <h2 className="text-lg font-medium">{a.title}</h2>
                </div>
                <Badge tone={statusTone[a.status] ?? 'neutral'}>{a.status}</Badge>
              </div>
              <p className="text-sm text-muted">/{a.max_score} · {a.grades_entered} note(s) saisie(s)</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
