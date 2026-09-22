'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Subject {
  id: string;
  code: string;
  name: string;
  default_coefficient: string;
}

export default function SubjectsPage() {
  const { institution, error: institutionError } = useInstitution();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload(institutionId: string) {
    api.get<Subject[]>(`/settings/subjects?institutionId=${institutionId}`).then(setSubjects);
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
      await api.post('/settings/subjects', { institutionId: institution.id, code: code.toUpperCase(), name });
      setCode('');
      setName('');
      reload(institution.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {institutionError && <p className="mb-4 text-sm text-clay">{institutionError}</p>}

      <ul className="mb-8 divide-y divide-rule">
        {subjects?.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2.5">
            <span>{s.name}</span>
            <span className="font-mono text-xs text-muted">{s.code}</span>
          </li>
        ))}
        {subjects !== null && subjects.length === 0 && <p className="py-3 text-sm text-muted">Aucune matière.</p>}
      </ul>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Nouvelle matière</h2>
      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <TextField id="code" label="Code" placeholder="MATH" value={code} onChange={(e) => setCode(e.target.value)} required className="w-28" />
        <TextField id="name" label="Nom" placeholder="Mathématiques" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" disabled={isSubmitting || !institution}>
          {isSubmitting ? '…' : 'Ajouter'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </div>
  );
}
