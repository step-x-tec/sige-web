'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const tabs = [
  { href: '/admin/academic-years', label: 'Années scolaires' },
  { href: '/admin/classes', label: 'Classes' },
  { href: '/admin/timetables', label: 'Emplois du temps' },
  { href: '/admin/subjects', label: 'Matières' },
  { href: '/admin/students', label: 'Élèves' },
  { href: '/admin/staff', label: 'Personnel' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { permissions, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = permissions.includes('users.manage');

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/today');
  }, [isLoading, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Administration</h1>
      <p className="mb-6 text-sm text-muted">Données de référence — établissement, années, classes, personnel.</p>
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-rule">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              pathname === tab.href ? 'border-board font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
