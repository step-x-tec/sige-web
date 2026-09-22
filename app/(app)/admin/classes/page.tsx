'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Option { id: string; name: string; label?: string; }
interface ClassRow { id: string; name: string; enrolled_count: string; education_level_name: string; }

function Select({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Option[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5 focus:border-board focus:outline-none"
        required
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label ?? o.name}</option>)}
      </select>
    </label>
  );
}

export default function ClassesPage() {
  const { institution } = useInstitution();
  const [years, setYears] = useState<Option[]>([]);
  const [campuses, setCampuses] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Option[]>([]);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);

  const [academicYearId, setAcademicYearId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [educationLevelId, setEducationLevelId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCampusName, setNewCampusName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelSeq, setNewLevelSeq] = useState(1);

  function reloadRefs(institutionId: string) {
    api.get<any[]>(`/settings/academic-years?institutionId=${institutionId}`).then((d) => setYears(d.map((y) => ({ id: y.id, name: y.label }))));
    api.get<any[]>(`/settings/campuses?institutionId=${institutionId}`).then((d) => setCampuses(d));
    api.get<any[]>(`/settings/education-levels?institutionId=${institutionId}`).then((d) => setLevels(d));
  }

  useEffect(() => {
    if (institution) reloadRefs(institution.id);
  }, [institution]);

  useEffect(() => {
    if (academicYearId) api.get<ClassRow[]>(`/classes?academicYearId=${academicYearId}`).then(setClasses);
  }, [academicYearId]);

  async function handleCreateCampus(e: FormEvent) {
    e.preventDefault();
    if (!institution) return;
    await api.post('/settings/campuses', { institutionId: institution.id, name: newCampusName, isMain: campuses.length === 0 });
    setNewCampusName('');
    reloadRefs(institution.id);
  }

  async function handleCreateLevel(e: FormEvent) {
    e.preventDefault();
    if (!institution) return;
    await api.post('/settings/education-levels', { institutionId: institution.id, name: newLevelName, sequence: newLevelSeq });
    setNewLevelName('');
    reloadRefs(institution.id);
  }

  async function handleCreateClass(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/classes', { campusId, academicYearId, educationLevelId, name });
      setName('');
      const d = await api.get<ClassRow[]>(`/classes?academicYearId=${academicYearId}`);
      setClasses(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 max-w-xs">
        <Select label="Année scolaire" value={academicYearId} onChange={setAcademicYearId} options={years} placeholder="Choisir une année" />
      </div>

      {academicYearId && (
        <>
          <ul className="mb-8 divide-y divide-rule">
            {classes?.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted">{c.education_level_name} · {c.enrolled_count} élèves</span>
              </li>
            ))}
            {classes !== null && classes.length === 0 && <p className="py-3 text-sm text-muted">Aucune classe pour cette année.</p>}
          </ul>

          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Nouvelle classe</h2>
          <form onSubmit={handleCreateClass} className="mb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Campus" value={campusId} onChange={setCampusId} options={campuses} placeholder="Choisir un campus" />
              <Select label="Niveau" value={educationLevelId} onChange={setEducationLevelId} options={levels} placeholder="Choisir un niveau" />
            </div>
            <TextField id="className" label="Nom" placeholder="3e A" value={name} onChange={(e) => setName(e.target.value)} required />
            {error && <p className="text-sm text-clay">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '…' : 'Créer la classe'}</Button>
          </form>

          <button onClick={() => setShowQuickAdd((v) => !v)} className="text-sm text-board hover:underline">
            {showQuickAdd ? 'Masquer' : 'Campus ou niveau manquant ?'}
          </button>

          {showQuickAdd && (
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-sige border border-rule p-4">
              <form onSubmit={handleCreateCampus} className="space-y-2">
                <TextField id="newCampus" label="Nouveau campus" value={newCampusName} onChange={(e) => setNewCampusName(e.target.value)} required />
                <Button type="submit" variant="secondary" className="w-full">Ajouter</Button>
              </form>
              <form onSubmit={handleCreateLevel} className="space-y-2">
                <TextField id="newLevel" label="Nouveau niveau" value={newLevelName} onChange={(e) => setNewLevelName(e.target.value)} required />
                <TextField id="newLevelSeq" label="Ordre" type="number" value={newLevelSeq} onChange={(e) => setNewLevelSeq(Number(e.target.value))} required />
                <Button type="submit" variant="secondary" className="w-full">Ajouter</Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
