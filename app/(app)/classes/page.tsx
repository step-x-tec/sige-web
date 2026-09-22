'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

interface MyClass {
  id: string;
  name: string;
  code: string;
  role: string;
  enrolled_count: string;
  academic_year: string;
  academic_year_id: string;
}

const roleLabels: Record<string, string> = {
  head_teacher: 'Titulaire',
  co_head: 'Co-titulaire',
  substitute: 'Suppléant',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<MyClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MyClass[]>('/classes/my-assignments')
      .then(setClasses)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Mes classes</h1>
      <p className="mb-8 text-sm text-muted">Les classes dont vous êtes titulaire, co-titulaire ou suppléant.</p>

      {error && <p className="text-sm text-clay">{error}</p>}
      {classes === null && !error && <p className="text-sm text-muted">Chargement…</p>}
      {classes !== null && classes.length === 0 && (
        <div className="rounded-sige border border-dashed border-rule px-5 py-8 text-center">
          <p className="text-sm text-muted">Vous n’êtes titulaire d’aucune classe.</p>
        </div>
      )}

      <ul className="space-y-3">
        {classes?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/classes/${c.id}?academicYearId=${c.academic_year_id}`}
              className="block rounded-sige border border-rule px-5 py-4 hover:border-ink"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{c.name}</h2>
                <Badge tone="neutral">{roleLabels[c.role] ?? c.role}</Badge>
              </div>
              <p className="text-sm text-muted">{c.enrolled_count} élèves · {c.academic_year}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
