'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Un compte peut cumuler plusieurs profils en théorie ; priorité au
    // profil staff (l'usage le plus fréquent de ce frontend aujourd'hui),
    // puis parent, puis élève.
    api
      .get<{ isStaff: boolean; isGuardian: boolean; isStudent: boolean }>('/auth/me')
      .then((profile) => {
        if (profile.isStaff) router.replace('/today');
        else if (profile.isGuardian) router.replace('/parent');
        else if (profile.isStudent) router.replace('/student');
        else router.replace('/login');
      })
      .catch(() => router.replace('/login'));
  }, [isLoading, isAuthenticated, router]);

  return null;
}
