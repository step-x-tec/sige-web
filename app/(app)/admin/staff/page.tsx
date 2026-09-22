'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface StaffRow {
  id: string;
  code: string;
  staff_type: string;
  first_name: string;
  last_name: string;
  email: string;
}

const staffTypeLabels: Record<string, string> = {
  teacher: 'Enseignant',
  class_head: 'Titulaire de classe',
  accountant: 'Comptable',
  institution_admin: "Administrateur d'établissement",
  supervisor: 'Surveillant',
};

export default function StaffPage() {
  const { institution } = useInstitution();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [staffType, setStaffType] = useState('teacher');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; email: string; password: string } | null>(null);

  function reload(institutionId: string) {
    api.get<StaffRow[]>(`/staff?institutionId=${institutionId}`).then(setStaff);
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
      const result = await api.post<{ temporaryPassword: string }>('/staff', {
        firstName, lastName, email, staffType, institutionId: institution.id,
      });
      setCreatedInfo({ name: `${firstName} ${lastName}`, email, password: result.temporaryPassword });
      setFirstName('');
      setLastName('');
      setEmail('');
      reload(institution.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <ul className="mb-8 divide-y divide-rule">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2.5">
            <div>
              <span className="font-medium">{s.last_name} {s.first_name}</span>{' '}
              <span className="font-mono text-xs text-muted">{s.code}</span>
            </div>
            <span className="text-sm text-muted">{staffTypeLabels[s.staff_type] ?? s.staff_type}</span>
          </li>
        ))}
        {staff.length === 0 && <p className="py-3 text-sm text-muted">Aucun membre du personnel.</p>}
      </ul>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Nouveau membre du personnel</h2>

      {createdInfo && (
        <div className="mb-4 rounded-sige border border-chalk bg-chalk/10 px-4 py-3 text-sm">
          <p className="mb-1 font-medium">{createdInfo.name} créé(e)</p>
          <p className="text-muted">
            Mot de passe temporaire à lui communiquer :{' '}
            <span className="font-mono text-ink">{createdInfo.password}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField id="firstName" label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <TextField id="lastName" label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <TextField id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Fonction</span>
          <select value={staffType} onChange={(e) => setStaffType(e.target.value)} className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5">
            {Object.entries(staffTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {error && <p className="text-sm text-clay">{error}</p>}
        <Button type="submit" disabled={isSubmitting || !institution}>
          {isSubmitting ? 'Création…' : 'Créer le compte'}
        </Button>
      </form>
    </div>
  );
}
