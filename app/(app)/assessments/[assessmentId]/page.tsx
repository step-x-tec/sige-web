'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { enqueueGrades } from '@/lib/offlineDb';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface RosterEntry {
  enrollment_id: string;
  code: string;
  first_name: string;
  last_name: string;
}

interface AssessmentWithGrades {
  id: string;
  title: string;
  max_score: string;
  status: string;
  academic_year_id: string;
  class_id: string;
  grades: { enrollment_id: string; score: string | null; is_locked: boolean }[];
}

export default function GradeEntryPage() {
  const params = useParams<{ assessmentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const classIdParam = searchParams.get('classId');

  const [assessment, setAssessment] = useState<AssessmentWithGrades | null>(null);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    api
      .getWithOfflineFallback<AssessmentWithGrades>(`/assessments/${params.assessmentId}`)
      .then(async ({ data: a, isFromCache: assessmentFromCache }) => {
        setAssessment(a);
        const classId = classIdParam ?? a.class_id;
        const { data: r, isFromCache: rosterFromCache } = await api.getWithOfflineFallback<RosterEntry[]>(
          `/attendance/classes/${classId}/roster?academicYearId=${a.academic_year_id}`,
        );
        setRoster(r);
        setIsFromCache(assessmentFromCache || rosterFromCache);
        const initialScores: Record<string, string> = {};
        const existing = new Map(a.grades.map((g) => [g.enrollment_id, g.score]));
        r.forEach((student) => {
          const existingScore = existing.get(student.enrollment_id);
          initialScores[student.enrollment_id] = existingScore != null ? String(existingScore) : '';
        });
        setScores(initialScores);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [params.assessmentId, classIdParam]);

  const maxScore = assessment ? Number(assessment.max_score) : 20;
  const isLocked = assessment?.status === 'locked';

  function setScore(enrollmentId: string, value: string) {
    setScores((prev) => ({ ...prev, [enrollmentId]: value }));
  }

  const invalidCount = useMemo(
    () =>
      Object.values(scores).filter((v) => v !== '' && (Number(v) < 0 || Number(v) > maxScore)).length,
    [scores, maxScore],
  );

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);
    const grades = Object.entries(scores).map(([enrollmentId, value]) => ({
      enrollmentId,
      ...(value !== '' ? { score: Number(value) } : {}),
    }));
    try {
      await api.post(`/assessments/${params.assessmentId}/grades`, { grades });
      setSaved(true);
      setTimeout(() => router.push('/today'), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        await enqueueGrades({ assessmentId: params.assessmentId, grades, createdAt: Date.now() });
        setSavedOffline(true);
        setTimeout(() => router.push('/today'), 1200);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{assessment?.title ?? 'Évaluation'}</h1>
        {assessment && <Badge tone={isLocked ? 'alert' : 'active'}>{assessment.status}</Badge>}
      </div>
      <p className="mb-8 text-sm text-muted">Barème /{maxScore} — laissez vide pour « note manquante ».</p>

      {isLocked && (
        <p className="mb-4 rounded-sige bg-clay/10 px-4 py-3 text-sm text-clay">
          Cette évaluation est verrouillée — contactez un administrateur pour la déverrouiller avant de corriger une note.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-clay">{error}</p>}
      {isFromCache && (
        <p className="mb-4 rounded-sige bg-chalk/20 px-3 py-2 text-sm">
          Chargé depuis la dernière sauvegarde locale (hors ligne).
        </p>
      )}
      {roster === null && !error && <p className="text-sm text-muted">Chargement…</p>}

      <ul className="mb-6 divide-y divide-rule">
        {roster?.map((student) => {
          const value = scores[student.enrollment_id] ?? '';
          const isInvalid = value !== '' && (Number(value) < 0 || Number(value) > maxScore);
          return (
            <li key={student.enrollment_id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{student.last_name} {student.first_name}</p>
                <p className="font-mono text-xs text-muted">{student.code}</p>
              </div>
              <input
                type="number"
                min={0}
                max={maxScore}
                step={0.25}
                value={value}
                disabled={isLocked}
                onChange={(e) => setScore(student.enrollment_id, e.target.value)}
                placeholder="—"
                className={`w-20 rounded-sige border px-2.5 py-1.5 text-right focus:outline-none disabled:bg-rule/30 ${
                  isInvalid ? 'border-clay text-clay' : 'border-rule focus:border-board'
                }`}
              />
            </li>
          );
        })}
      </ul>

      {invalidCount > 0 && (
        <p className="mb-4 text-sm text-clay">{invalidCount} note(s) hors barème (0–{maxScore}).</p>
      )}

      {roster && roster.length > 0 && !isLocked && (
        <Button onClick={handleSubmit} disabled={isSaving || invalidCount > 0} className="w-full">
          {isSaving
            ? 'Enregistrement…'
            : saved
              ? 'Enregistré ✓'
              : savedOffline
                ? 'Enregistré localement — sera synchronisé ✓'
                : 'Enregistrer les notes'}
        </Button>
      )}
    </div>
  );
}
