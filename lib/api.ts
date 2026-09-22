const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * ApiClient
 *
 * Volontairement minimal : pas de lib type React Query ici pour garder ce
 * MVP lisible sans dépendance supplémentaire. À introduire dès que le
 * nombre d'écrans grossit (cache, invalidation, retry) — cette classe reste
 * le seul point de contact HTTP, donc l'introduire plus tard ne demande pas
 * de tout réécrire.
 */
class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = window.localStorage.getItem('sige_access_token');
      this.refreshToken = window.localStorage.getItem('sige_refresh_token');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    window.localStorage.setItem('sige_access_token', accessToken);
    window.localStorage.setItem('sige_refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    window.localStorage.removeItem('sige_access_token');
    window.localStorage.removeItem('sige_refresh_token');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return true;
  }

  /**
   * Requête authentifiée avec retry unique en cas de 401 (le temps de
   * rafraîchir le token) — au-delà, on considère la session morte et on
   * laisse l'appelant rediriger vers /login.
   */
  async request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401 && !retried) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return this.request<T>(path, options, true);
      this.clearTokens();
      throw new ApiError(401, 'Session expirée');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message ?? 'Une erreur est survenue');
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  /**
   * Variante hors ligne (§46) : sert la dernière réponse mise en cache
   * (IndexedDB) si le réseau échoue, plutôt que de casser l'écran. Utilisée
   * uniquement là où consulter des données figées vaut mieux qu'un écran
   * vide — cours du jour, effectif de classe. `isFromCache: true` permet à
   * l'appelant d'afficher "données du <heure>" plutôt que de laisser croire
   * que c'est à jour.
   */
  async getWithOfflineFallback<T>(path: string): Promise<{ data: T; isFromCache: boolean; cachedAt?: number }> {
    const { cacheApiResponse, getCachedApiResponse } = await import('./offlineDb');
    try {
      const data = await this.get<T>(path);
      cacheApiResponse(path, data); // best-effort, pas d'attente
      return { data, isFromCache: false };
    } catch (err) {
      if (err instanceof ApiError) throw err; // erreur applicative légitime (401, 403...) — pas un cas hors ligne
      const cached = await getCachedApiResponse<T>(path);
      if (!cached) throw err;
      return { data: cached.data, isFromCache: true, cachedAt: cached.cachedAt };
    }
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  /**
   * Pour les réponses binaires (PDF du bulletin) — fetch direct plutôt que
   * request<T>() qui suppose du JSON. Retourne une URL blob à ouvrir dans un
   * nouvel onglet ; l'appelant est responsable de révoquer l'URL après usage
   * (URL.revokeObjectURL) si elle est recréée souvent.
   */
  async getBlobUrl(path: string): Promise<string> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, 'Échec du téléchargement');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const api = new ApiClient();
