'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Badge } from '@/components/ui/Badge';

interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function AcademicYearsPage() {
  const { institution, error: institutionError } = useInstitution();
  const [years, setYears] = useState<AcademicYear[] | null>(null);
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload(institutionId: string) {
    api.get<AcademicYear[]>(`/settings/academic-years?institutionId=${institutionId}`).then(setYears);
  }

  useEffect(() => {
    if (institution) reload(institution.id);
  }, [institution]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!institution) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/settings/academic-years', { institutionId: institution.id, label, startDate, endDate });
      setLabel('');
      setStartDate('');
      setEndDate('');
      reload(institution.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivate(id: string) {
    if (!institution) return;
    await api.post(`/settings/academic-years/${id}/activate`);
    reload(institution.id);
  }

  return (
    <div>
      {institutionError && <p className="mb-4 text-sm text-clay">{institutionError}</p>}

      <ul className="mb-8 divide-y divide-rule">
        {years?.map((y) => (
          <li key={y.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{y.label}</p>
              <p className="text-xs text-muted">{y.start_date.slice(0, 10)} → {y.end_date.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={y.status === 'active' ? 'active' : y.status === 'closed' ? 'alert' : 'neutral'}>
                {y.status}
              </Badge>
              {y.status === 'draft' && (
                <button onClick={() => handleActivate(y.id)} className="text-sm text-board hover:underline">
                  Activer
                </button>
              )}
            </div>
          </li>
        ))}
        {years !== null && years.length === 0 && <p className="py-3 text-sm text-muted">Aucune année scolaire.</p>}
      </ul>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Nouvelle année</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <TextField id="label" label="Libellé" placeholder="2026-2027" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <div className="grid grid-cols-2 gap-4">
          <TextField id="start" label="Début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <TextField id="end" label="Fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-clay">{error}</p>}
        <Button type="submit" disabled={isSubmitting || !institution}>
          {isSubmitting ? 'Création…' : 'Créer'}
        </Button>
      </form>
    </div>
  );
}
