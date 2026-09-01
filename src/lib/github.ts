export interface GitHubUser {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly avatar_url: string;
  readonly html_url: string;
}

export interface GitHubRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
  readonly description: string | null;
  readonly default_branch: string;
  readonly fork: boolean;
  readonly archived: boolean;
  readonly private: boolean;
  readonly pushed_at: string;
  readonly owner: { readonly login: string };
}

export interface GitHubSessionData {
  readonly token: string;
  readonly user: GitHubUser;
}

export interface ReadmeFileResult {
  readonly path: string;
  readonly content: string;
  readonly sha: string;
  readonly branch: string;
}

export interface PublishResult {
  readonly repository: string;
  readonly branch: string;
  readonly files: readonly { readonly path: string; readonly sha: string }[];
}

const DEFAULT_API_BASE = 'https://readme-studio.rappeland2005.workers.dev';
const AUTH_TOKEN_KEY = 'readme-studio:auth-token';
const AUTH_USER_KEY = 'readme-studio:auth-user';
const PKCE_VERIFIER_KEY = 'readme-studio:pkce-verifier';
const OAUTH_STATE_KEY = 'readme-studio:oauth-state';

// In-memory fallback storage for non-browser / test environments
const memoryStorage = new Map<string, string>();

function getLocalStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => { memoryStorage.set(k, v); },
    removeItem: (k: string) => { memoryStorage.delete(k); },
  };
}

export function getApiBaseUrl(): string {
  const storage = getLocalStorage();
  const custom = storage.getItem('readme-studio:api-url');
  if (custom) return custom.replace(/\/+$/, '');
  return DEFAULT_API_BASE;
}

export function getStoredSession(): GitHubSessionData | null {
  const storage = getLocalStorage();
  const token = storage.getItem(AUTH_TOKEN_KEY);
  const userJson = storage.getItem(AUTH_USER_KEY);
  if (!token || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as GitHubUser;
    return { token, user };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: GitHubSessionData): void {
  const storage = getLocalStorage();
  storage.setItem(AUTH_TOKEN_KEY, session.token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession(): void {
  const storage = getLocalStorage();
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_USER_KEY);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function generatePkcePair(): Promise<{ verifier: string; challenge: string; state: string }> {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64UrlEncode(verifierBytes);

  const stateBytes = new Uint8Array(24);
  crypto.getRandomValues(stateBytes);
  const state = base64UrlEncode(stateBytes);

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge, state };
}

export async function startGitHubLogin(apiBase = getApiBaseUrl()): Promise<void> {
  const { verifier, challenge, state } = await generatePkcePair();
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
  }

  const startUrl = new URL(`${apiBase}/auth/github/start`);
  startUrl.searchParams.set('state', state);
  startUrl.searchParams.set('code_challenge', challenge);

  if (typeof window !== 'undefined') {
    window.location.href = startUrl.toString();
  }
}

export async function handleOAuthCallback(apiBase = getApiBaseUrl()): Promise<GitHubSessionData | null> {
  if (typeof window === 'undefined') return null;

  const rawHash = window.location.hash.replace(/^#/, '');
  if (!rawHash) return null;

  const params = new URLSearchParams(rawHash);
  if (params.get('github_oauth') !== 'callback') return null;

  const code = params.get('code');
  const state = params.get('state');
  const storedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
  const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY);

  // Clean the hash from the browser URL immediately
  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', cleanUrl);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  if (!code || !state || state !== storedState || !codeVerifier) {
    return null;
  }

  const response = await fetch(`${apiBase}/auth/github/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier, state }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code with backend worker.');
  }

  const data = (await response.json()) as { token: string; user: GitHubUser };
  const session: GitHubSessionData = { token: data.token, user: data.user };
  saveStoredSession(session);
  return session;
}

export async function fetchUserRepositories(
  token: string,
  apiBase = getApiBaseUrl(),
): Promise<readonly GitHubRepository[]> {
  const response = await fetch(`${apiBase}/github/repositories`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) clearStoredSession();
    throw new Error(`Failed to load repositories (${response.status})`);
  }

  const data = (await response.json()) as { repositories: readonly GitHubRepository[] };
  return data.repositories;
}

export async function fetchRepositoryReadme(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  apiBase = getApiBaseUrl(),
): Promise<ReadmeFileResult> {
  const url = new URL(`${apiBase}/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
  if (branch) url.searchParams.set('branch', branch);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repository README (${response.status})`);
  }

  return (await response.json()) as ReadmeFileResult;
}

export async function publishReadmeToRepository(
  token: string,
  owner: string,
  repo: string,
  options: {
    readonly branch: string;
    readonly commitMessage: string;
    readonly readmeContent: string;
    readonly workflowFiles?: readonly { readonly path: string; readonly content: string }[];
  },
  apiBase = getApiBaseUrl(),
): Promise<PublishResult> {
  const url = `${apiBase}/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/publish`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: options.branch,
      commitMessage: options.commitMessage,
      readmeContent: options.readmeContent,
      workflowFiles: options.workflowFiles ?? [],
    }),
  });

  if (!response.ok) {
    const errorJson = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorJson?.error?.message ?? `Failed to publish to repository (${response.status})`);
  }

  return (await response.json()) as PublishResult;
}
