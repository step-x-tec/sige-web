'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

interface Institution {
  id: string;
  name: string;
}

/**
 * useInstitution
 *
 * Simplification assumée : prend le premier établissement du tenant. Tant
 * qu'il n'y a qu'un seul établissement par tenant (cas de démarrage typique,
 * §5), ça suffit. Le jour où un tenant gère plusieurs établissements, cet
 * unique hook devient un sélecteur — mais rien dans les pages admin qui
 * l'utilisent n'a besoin de changer, elles reçoivent juste institutionId.
 */
export function useInstitution() {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Institution[]>('/settings/institutions')
      .then((list) => setInstitution(list[0] ?? null))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
  }, []);

  return { institution, error };
}
