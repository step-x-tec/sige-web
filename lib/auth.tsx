'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { initOfflineSync } from './offlineSync';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  login: (
    email: string,
    password: string,
    tenantSlug: string,
  ) => Promise<{ mfaRequired: boolean; mfaSetupRequired?: boolean; mfaSessionToken?: string; mfaSecret?: string; otpAuthUrl?: string }>;
  verifyMfa: (mfaSessionToken: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const router = useRouter();

  const loadPermissions = useCallback(async () => {
    try {
      const profile = await api.get<{ permissions: string[] }>('/auth/me');
      setPermissions(profile.permissions);
    } catch {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    const authed = api.isAuthenticated();
    setIsAuthenticated(authed);
    setIsLoading(false);
    if (authed) loadPermissions();
    initOfflineSync();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non bloquant : l'app fonctionne sans, juste sans app-shell hors
        // ligne (la file d'attente des présences fonctionne indépendamment
        // du service worker, voir offlineSync.ts).
      });
    }
  }, [loadPermissions]);

  const login = useCallback(async (email: string, password: string, tenantSlug: string) => {
    const result = await api.post<{
      mfaRequired?: boolean;
      mfaSetupRequired?: boolean;
      mfaSessionToken?: string;
      mfaSecret?: string;
      otpAuthUrl?: string;
      accessToken?: string;
      refreshToken?: string;
    }>('/auth/login', { email, password, tenantSlug });

    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        mfaSetupRequired: result.mfaSetupRequired,
        mfaSessionToken: result.mfaSessionToken,
        mfaSecret: result.mfaSecret,
        otpAuthUrl: result.otpAuthUrl,
      };
    }
    api.setTokens(result.accessToken!, result.refreshToken!);
    setIsAuthenticated(true);
    await loadPermissions();
    return { mfaRequired: false };
  }, [loadPermissions]);

  const verifyMfa = useCallback(async (mfaSessionToken: string, code: string) => {
    const result = await api.post<{ accessToken: string; refreshToken: string }>('/auth/mfa/verify', {
      mfaSessionToken,
      code,
    });
    api.setTokens(result.accessToken, result.refreshToken);
    setIsAuthenticated(true);
    await loadPermissions();
  }, [loadPermissions]);

  const logout = useCallback(() => {
    api.clearTokens();
    setIsAuthenticated(false);
    setPermissions([]);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, permissions, login, verifyMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  return ctx;
}
