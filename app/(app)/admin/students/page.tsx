'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Student { id: string; code: string; first_name: string; last_name: string; }
interface Option { id: string; name: string; }

export default function StudentsPage() {
  const { institution } = useInstitution();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [years, setYears] = useState<Option[]>([]);
  const [classesByYear, setClassesByYear] = useState<Option[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);

  useEffect(() => {
    if (institution) {
      api.get<any[]>(`/settings/academic-years?institutionId=${institution.id}`).then((d) => setYears(d.map((y) => ({ id: y.id, name: y.label }))));
    }
  }, [institution]);

  useEffect(() => {
    if (academicYearId) api.get<any[]>(`/classes?academicYearId=${academicYearId}`).then(setClassesByYear);
  }, [academicYearId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const student = await api.post<Student>('/students', { firstName, lastName });
      setCreatedStudent(student);
      setFirstName('');
      setLastName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const data = await api.get<Student[]>(`/students/search?q=${encodeURIComponent(query)}`);
    setResults(data);
  }

  async function handleEnroll(studentId: string) {
    setEnrollMessage(null);
    try {
      await api.post(`/students/${studentId}/enrollments`, { academicYearId, classId });
      setEnrollMessage('Inscription enregistrée.');
    } catch (err) {
      setEnrollMessage(err instanceof ApiError ? err.message : 'Échec de l’inscription');
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Nouvel élève</h2>
        <form onSubmit={handleCreate} className="flex items-end gap-3">
          <TextField id="firstName" label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <TextField id="lastName" label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '…' : 'Créer'}</Button>
        </form>
        {error && <p className="mt-2 text-sm text-clay">{error}</p>}
        {createdStudent && (
          <p className="mt-2 text-sm text-board">
            {createdStudent.first_name} {createdStudent.last_name} créé — matricule <span className="font-mono">{createdStudent.code}</span>.
            Inscris-le ci-dessous.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Rechercher / inscrire</h2>
        <form onSubmit={handleSearch} className="mb-4 flex items-end gap-3">
          <TextField id="query" label="Nom ou matricule" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Année scolaire</span>
            <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5">
              <option value="">—</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Classe</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5">
              <option value="">—</option>
              {classesByYear.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        {enrollMessage && <p className="mb-3 text-sm text-board">{enrollMessage}</p>}

        <ul className="divide-y divide-rule">
          {results.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <span className="font-medium">{s.last_name} {s.first_name}</span>{' '}
                <span className="font-mono text-xs text-muted">{s.code}</span>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleEnroll(s.id)}
                disabled={!academicYearId || !classId}
              >
                Inscrire dans cette classe
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
