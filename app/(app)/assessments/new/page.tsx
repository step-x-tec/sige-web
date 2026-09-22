'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface AcademicPeriod {
  id: string;
  label: string;
  sequence: number;
}

export default function NewAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teachingAssignmentId = searchParams.get('teachingAssignmentId') ?? '';
  const classId = searchParams.get('classId') ?? '';
  const academicYearId = searchParams.get('academicYearId') ?? '';

  const [periods, setPeriods] = useState<AcademicPeriod[] | null>(null);
  const [title, setTitle] = useState('');
  const [academicPeriodId, setAcademicPeriodId] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [maxScore, setMaxScore] = useState(20);
  const [coefficient, setCoefficient] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!academicYearId) return;
    api
      .get<AcademicPeriod[]>(`/settings/academic-years/${academicYearId}/periods`)
      .then((data) => {
        setPeriods(data);
        if (data.length > 0) setAcademicPeriodId(data[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, [academicYearId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const assessment = await api.post<{ id: string }>('/assessments', {
        teachingAssignmentId,
        academicPeriodId,
        title,
        assessmentDate,
        maxScore,
        coefficient,
      });
      router.push(`/assessments/${assessment.id}?classId=${classId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!teachingAssignmentId || !classId || !academicYearId) {
    return <p className="text-sm text-clay">Paramètres manquants — revenez à « Mon espace ».</p>;
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Nouvelle évaluation</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="title"
          label="Titre"
          placeholder="ex : Contrôle N°1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Période</span>
          <select
            value={academicPeriodId}
            onChange={(e) => setAcademicPeriodId(e.target.value)}
            className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5 focus:border-board focus:outline-none"
            required
          >
            {periods === null && <option>Chargement…</option>}
            {periods?.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <TextField
          id="date"
          label="Date"
          type="date"
          value={assessmentDate}
          onChange={(e) => setAssessmentDate(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="maxScore"
            label="Barème"
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            required
          />
          <TextField
            id="coefficient"
            label="Coefficient"
            type="number"
            min={0.5}
            step={0.5}
            value={coefficient}
            onChange={(e) => setCoefficient(Number(e.target.value))}
            required
          />
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting || !academicPeriodId}>
          {isSubmitting ? 'Création…' : 'Créer et saisir les notes'}
        </Button>
      </form>
    </div>
  );
}
