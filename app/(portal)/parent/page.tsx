'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

interface Child {
  student_id: string;
  code: string;
  first_name: string;
  last_name: string;
  current_class_name: string | null;
  academic_year: string | null;
}

export default function ParentHomePage() {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Child[]>('/portal/parent/children')
      .then(setChildren)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Mes enfants</h1>
      <p className="mb-8 text-sm text-muted">Suivi scolaire — emploi du temps, présences, bulletins.</p>

      {error && <p className="text-sm text-clay">{error}</p>}
      {children === null && !error && <p className="text-sm text-muted">Chargement…</p>}
      {children !== null && children.length === 0 && (
        <p className="text-sm text-muted">Aucun enfant rattaché à votre compte.</p>
      )}

      <ul className="space-y-3">
        {children?.map((c) => (
          <li key={c.student_id}>
            <Link href={`/parent/${c.student_id}`} className="block rounded-sige border border-rule px-5 py-4 hover:border-ink">
              <h2 className="text-lg font-medium">{c.first_name} {c.last_name}</h2>
              <p className="text-sm text-muted">
                {c.current_class_name ? `${c.current_class_name} · ${c.academic_year}` : 'Aucune inscription active'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
