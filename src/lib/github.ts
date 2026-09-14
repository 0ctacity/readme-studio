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
  readonly expiresAt: string;
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

interface WorkerGitHubUser {
  readonly avatarUrl: string;
  readonly id: number;
  readonly login: string;
  readonly profileUrl: string;
}

interface WorkerGitHubRepository {
  readonly archived: boolean;
  readonly defaultBranch: string;
  readonly description: string | null;
  readonly fork: boolean;
  readonly fullName: string;
  readonly id: number;
  readonly name: string;
  readonly owner: string;
  readonly private: boolean;
  readonly pushedAt: string;
  readonly url: string;
}

interface WorkerPublishedFile {
  readonly commitSha: string;
  readonly path: string;
}

const DEFAULT_API_BASE = 'https://readme-studio.rappeland2005.workers.dev';
const AUTH_TOKEN_KEY = 'readme-studio:auth-token';
const AUTH_USER_KEY = 'readme-studio:auth-user';
const AUTH_EXPIRES_AT_KEY = 'readme-studio:auth-expires-at';
const PKCE_VERIFIER_KEY = 'readme-studio:pkce-verifier';
const OAUTH_STATE_KEY = 'readme-studio:oauth-state';
export const SESSION_CLEARED_EVENT = 'readme-studio:session-cleared';

// In-memory fallback storage for non-browser / test environments
const memoryStorage = new Map<string, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkerGitHubUser(value: unknown): value is WorkerGitHubUser {
  return isRecord(value)
    && typeof value.avatarUrl === 'string'
    && typeof value.id === 'number'
    && typeof value.login === 'string'
    && typeof value.profileUrl === 'string';
}

function isWorkerGitHubRepository(value: unknown): value is WorkerGitHubRepository {
  return isRecord(value)
    && typeof value.archived === 'boolean'
    && typeof value.defaultBranch === 'string'
    && (typeof value.description === 'string' || value.description === null)
    && typeof value.fork === 'boolean'
    && typeof value.fullName === 'string'
    && typeof value.id === 'number'
    && typeof value.name === 'string'
    && typeof value.owner === 'string'
    && typeof value.private === 'boolean'
    && typeof value.pushedAt === 'string'
    && typeof value.url === 'string';
}

function isWorkerPublishedFile(value: unknown): value is WorkerPublishedFile {
  return isRecord(value)
    && typeof value.commitSha === 'string'
    && typeof value.path === 'string';
}

function normalizeUser(user: WorkerGitHubUser): GitHubUser {
  return {
    avatar_url: user.avatarUrl,
    html_url: user.profileUrl,
    id: user.id,
    login: user.login,
    name: null,
  };
}

function normalizeRepository(repository: WorkerGitHubRepository): GitHubRepository {
  return {
    archived: repository.archived,
    default_branch: repository.defaultBranch,
    description: repository.description,
    fork: repository.fork,
    full_name: repository.fullName,
    html_url: repository.url,
    id: repository.id,
    name: repository.name,
    owner: { login: repository.owner },
    private: repository.private,
    pushed_at: repository.pushedAt,
  };
}

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

export function getStoredSession(now = Date.now()): GitHubSessionData | null {
  const storage = getLocalStorage();
  const token = storage.getItem(AUTH_TOKEN_KEY);
  const userJson = storage.getItem(AUTH_USER_KEY);
  const expiresAt = storage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!token || !userJson || !expiresAt || Date.parse(expiresAt) <= now) {
    clearStoredSession(false);
    return null;
  }
  try {
    const user = JSON.parse(userJson) as GitHubUser;
    return { expiresAt, token, user };
  } catch {
    clearStoredSession(false);
    return null;
  }
}

export function saveStoredSession(session: GitHubSessionData): void {
  const storage = getLocalStorage();
  storage.setItem(AUTH_EXPIRES_AT_KEY, session.expiresAt);
  storage.setItem(AUTH_TOKEN_KEY, session.token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession(announce = true): void {
  const storage = getLocalStorage();
  storage.removeItem(AUTH_EXPIRES_AT_KEY);
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_USER_KEY);
  if (announce && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  }
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
    body: JSON.stringify({ code, codeVerifier }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code with backend worker.');
  }

  const data: unknown = await response.json();
  if (!isRecord(data)
    || typeof data.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(data.expiresAt))
    || typeof data.sessionToken !== 'string'
    || !isWorkerGitHubUser(data.user)) {
    throw new Error('The backend worker returned an invalid GitHub session.');
  }

  const session: GitHubSessionData = {
    expiresAt: data.expiresAt,
    token: data.sessionToken,
    user: normalizeUser(data.user),
  };
  saveStoredSession(session);
  return session;
}

export async function fetchUserRepositories(
  token: string,
  apiBase = getApiBaseUrl(),
): Promise<readonly GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetch(`${apiBase}/api/github/repositories?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401) clearStoredSession();
      throw new Error(`Failed to load repositories (${response.status})`);
    }
    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.repositories) || !data.repositories.every(isWorkerGitHubRepository)) {
      throw new Error('The backend worker returned an invalid repository list.');
    }
    repositories.push(...data.repositories.map(normalizeRepository));
    if (data.repositories.length < 100) break;
  }
  return repositories;
}

export async function fetchRepositoryReadme(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  apiBase = getApiBaseUrl(),
): Promise<ReadmeFileResult> {
  const url = new URL(`${apiBase}/api/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
  if (branch) url.searchParams.set('ref', branch);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) clearStoredSession();
    throw new Error(`Failed to fetch repository README (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data)
    || typeof data.branch !== 'string'
    || typeof data.markdown !== 'string'
    || typeof data.path !== 'string'
    || typeof data.sha !== 'string') {
    throw new Error('The backend worker returned an invalid README.');
  }

  return {
    branch: data.branch,
    content: data.markdown,
    path: data.path,
    sha: data.sha,
  };
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
  const url = `${apiBase}/api/github/publish`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: options.branch,
      message: options.commitMessage,
      owner,
      readme: options.readmeContent,
      repository: repo,
      workflows: options.workflowFiles ?? [],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) clearStoredSession();
    const errorJson = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorJson?.error?.message ?? `Failed to publish to repository (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data)
    || typeof data.branch !== 'string'
    || typeof data.repository !== 'string'
    || !Array.isArray(data.files)
    || !data.files.every(isWorkerPublishedFile)) {
    throw new Error('The backend worker returned an invalid publish result.');
  }

  return {
    branch: data.branch,
    files: data.files.map((file) => ({ path: file.path, sha: file.commitSha })),
    repository: data.repository,
  };
}
