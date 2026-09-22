'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

export default function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [mfaSetupSecret, setMfaSetupSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(email, password, tenantSlug);
      if (result.mfaRequired && result.mfaSessionToken) {
        setMfaSessionToken(result.mfaSessionToken);
        setMfaSetupSecret(result.mfaSetupRequired ? result.mfaSecret ?? null : null);
        setStep('mfa');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de se connecter');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyMfa(mfaSessionToken, mfaCode);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-semibold">SIGE</h1>
        <p className="mb-8 text-sm text-muted">
          {step === 'credentials' ? 'Connectez-vous à votre espace' : 'Entrez le code de votre application d’authentification'}
        </p>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <TextField
              id="tenantSlug"
              label="Établissement"
              placeholder="ex : lycee-central"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              required
            />
            <TextField
              id="email"
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              id="password"
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {mfaSetupSecret && (
              <div className="rounded-sige border border-chalk bg-chalk/10 px-4 py-3 text-sm">
                <p className="mb-1 font-medium">Première connexion : configurez votre application d’authentification</p>
                <p className="mb-2 text-muted">
                  Ajoutez une clé manuelle dans Google Authenticator, Authy, etc. avec cette valeur :
                </p>
                <p className="break-all rounded bg-white/60 px-2 py-1.5 font-mono text-xs">{mfaSetupSecret}</p>
              </div>
            )}
            <TextField
              id="mfaCode"
              label="Code à 6 chiffres"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Vérification…' : 'Valider'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
