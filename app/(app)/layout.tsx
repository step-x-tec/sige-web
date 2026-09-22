'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, permissions, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  // Le lien "Administration" mène à des écrans qui exigent tous des
  // permissions de gestion (institutions/années/personnel...) — plutôt que
  // de lister chacune, on se sert de `users.manage` comme proxy de "est un
  // profil administratif". Ça ne remplace pas le contrôle réel : un
  // enseignant qui devinerait l'URL /admin/... continuerait de recevoir des
  // 403 du backend, ce lien ne fait qu'éviter de lui montrer une porte qui
  // ne s'ouvrira pas.
  const isAdmin = permissions.includes('users.manage');

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold">SIGE</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/today" className="text-muted hover:text-ink">Mon espace</Link>
            <Link href="/classes" className="text-muted hover:text-ink">Mes classes</Link>
            {isAdmin && <Link href="/admin/academic-years" className="text-muted hover:text-ink">Administration</Link>}
          </nav>
        </div>
        <button onClick={logout} className="text-sm text-muted hover:text-ink">
          Se déconnecter
        </button>
      </header>
      <OfflineBanner />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
