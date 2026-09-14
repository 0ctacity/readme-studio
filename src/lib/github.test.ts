import { describe, expect, test } from 'bun:test';
import {
  clearStoredSession,
  fetchRepositoryReadme,
  fetchUserRepositories,
  generatePkcePair,
  getApiBaseUrl,
  getStoredSession,
  handleOAuthCallback,
  prioritizeProfileRepository,
  publishReadmeToRepository,
  saveStoredSession,
  type GitHubSessionData,
} from './github';

class TestStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function restoreGlobal<K extends 'fetch' | 'window'>(key: K, value: typeof globalThis[K]): void {
  if (value === undefined) {
    Reflect.deleteProperty(globalThis, key);
  } else {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
}

describe('GitHub client library', () => {
  test('moves the signed-in user profile repository to the top', () => {
    const repository = {
      archived: false,
      default_branch: 'main',
      description: null,
      fork: false,
      html_url: 'https://github.com/octocat/example',
      owner: { login: 'octocat' },
      private: false,
      pushed_at: '2026-09-13T00:00:00Z',
    };
    const repositories = [
      { ...repository, full_name: 'octocat/newest', id: 1, name: 'newest' },
      { ...repository, full_name: 'octocat/octocat', id: 2, name: 'octocat' },
      { ...repository, full_name: 'octocat/older', id: 3, name: 'older' },
    ];

    expect(prioritizeProfileRepository(repositories, 'OctoCat').map((repo) => repo.name)).toEqual([
      'octocat',
      'newest',
      'older',
    ]);
    expect(repositories.map((repo) => repo.name)).toEqual(['newest', 'octocat', 'older']);
  });

  test('generates valid PKCE pair and state', async () => {
    const { verifier, challenge, state } = await generatePkcePair();
    expect(verifier).toBeString();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBeString();
    expect(challenge.length).toBeGreaterThanOrEqual(43);
    expect(state).toBeString();
    expect(state.length).toBeGreaterThanOrEqual(32);
  });

  test('handles default and custom API base URL', () => {
    const defaultUrl = getApiBaseUrl();
    expect(defaultUrl).toBe('https://readme-studio.rappeland2005.workers.dev');
  });

  test('saves and retrieves stored session correctly', () => {
    const mockSession: GitHubSessionData = {
      expiresAt: '2999-09-13T17:15:00.000Z',
      token: 'jwt-encrypted-token-xyz',
      user: {
        id: 12345,
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        html_url: 'https://github.com/octocat',
      },
    };

    saveStoredSession(mockSession);
    const retrieved = getStoredSession();
    expect(retrieved).toEqual(mockSession);

    clearStoredSession();
    expect(getStoredSession()).toBeNull();
  });

  test('removes an expired stored session', () => {
    const session: GitHubSessionData = {
      expiresAt: '2026-09-13T17:15:00.000Z',
      token: 'expired-token',
      user: {
        avatar_url: 'https://avatars.example/octocat',
        html_url: 'https://github.com/octocat',
        id: 7,
        login: 'octocat',
        name: null,
      },
    };

    saveStoredSession(session);
    expect(getStoredSession(new Date('2026-09-13T17:15:00.001Z').getTime())).toBeNull();
  });

  test('exchanges the OAuth callback using the Worker contract and stores the signed-in session', async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;
    const localStorage = new TestStorage();
    const sessionStorage = new TestStorage();
    sessionStorage.setItem('readme-studio:oauth-state', 'expected-state');
    sessionStorage.setItem('readme-studio:pkce-verifier', 'v'.repeat(43));

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        history: { replaceState: () => undefined },
        localStorage,
        location: {
          hash: '#github_oauth=callback&code=temporary-code&state=expected-state',
          pathname: '/readme-studio/',
          search: '',
        },
        sessionStorage,
      },
      writable: true,
    });

    let requestBody: unknown;
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          expiresAt: '2999-09-13T17:15:00.000Z',
          sessionToken: 'encrypted-session-token',
          user: {
            avatarUrl: 'https://avatars.example/octocat',
            id: 7,
            login: 'octocat',
            profileUrl: 'https://github.com/octocat',
          },
        });
      },
      writable: true,
    });

    try {
      const session = await handleOAuthCallback('https://api.example');

      expect(requestBody).toEqual({
        code: 'temporary-code',
        codeVerifier: 'v'.repeat(43),
      });
      expect(session).toEqual({
        expiresAt: '2999-09-13T17:15:00.000Z',
        token: 'encrypted-session-token',
        user: {
          avatar_url: 'https://avatars.example/octocat',
          html_url: 'https://github.com/octocat',
          id: 7,
          login: 'octocat',
          name: null,
        },
      });
      expect(getStoredSession()).toEqual(session);
    } finally {
      restoreGlobal('fetch', originalFetch);
      restoreGlobal('window', originalWindow);
    }
  });

  test('uses and normalizes the Worker repository API contract', async () => {
    const originalFetch = globalThis.fetch;
    const requests: Request[] = [];
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        requests.push(request);

        if (request.url === 'https://api.example/api/github/repositories?page=1') {
          return Response.json({ repositories: [{
            archived: false,
            defaultBranch: 'main',
            description: 'README workbench',
            fork: false,
            fullName: 'octocat/readme-studio',
            id: 42,
            name: 'readme-studio',
            owner: 'octocat',
            private: false,
            pushedAt: '2026-09-13T00:00:00Z',
            url: 'https://github.com/octocat/readme-studio',
          }] });
        }

        if (request.url === 'https://api.example/api/github/repositories/octocat/readme-studio/readme?ref=main') {
          return Response.json({
            branch: 'main',
            markdown: '# Readme Studio\n',
            path: 'README.md',
            sha: 'readme-sha',
          });
        }

        if (request.url === 'https://api.example/api/github/publish') {
          return Response.json({
            branch: 'main',
            files: [{ commitSha: 'commit-sha', commitUrl: 'https://github.com/commit', path: 'README.md' }],
            repository: 'octocat/readme-studio',
          });
        }

        return new Response(null, { status: 404 });
      },
      writable: true,
    });

    try {
      const repositories = await fetchUserRepositories('session-token', 'https://api.example');
      expect(repositories[0]).toEqual({
        archived: false,
        default_branch: 'main',
        description: 'README workbench',
        fork: false,
        full_name: 'octocat/readme-studio',
        html_url: 'https://github.com/octocat/readme-studio',
        id: 42,
        name: 'readme-studio',
        owner: { login: 'octocat' },
        private: false,
        pushed_at: '2026-09-13T00:00:00Z',
      });

      const readme = await fetchRepositoryReadme(
        'session-token',
        'octocat',
        'readme-studio',
        'main',
        'https://api.example',
      );
      expect(readme.content).toBe('# Readme Studio\n');

      const published = await publishReadmeToRepository(
        'session-token',
        'octocat',
        'readme-studio',
        {
          branch: 'main',
          commitMessage: 'docs: update README',
          readmeContent: '# Readme Studio\n',
          workflowFiles: [{ content: 'name: Snake\n', path: '.github/workflows/snake.yml' }],
        },
        'https://api.example',
      );
      expect(published.files).toEqual([{ path: 'README.md', sha: 'commit-sha' }]);

      expect(await requests[2]?.json()).toEqual({
        branch: 'main',
        message: 'docs: update README',
        owner: 'octocat',
        readme: '# Readme Studio\n',
        repository: 'readme-studio',
        workflows: [{ content: 'name: Snake\n', path: '.github/workflows/snake.yml' }],
      });
      expect(requests.every((request) => request.headers.get('authorization') === 'Bearer session-token')).toBe(true);
    } finally {
      restoreGlobal('fetch', originalFetch);
    }
  });

  test('loads every repository page', async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    const repository = {
      archived: false,
      defaultBranch: 'main',
      description: null,
      fork: false,
      fullName: 'octocat/example',
      id: 1,
      name: 'example',
      owner: 'octocat',
      private: false,
      pushedAt: '2026-09-13T00:00:00Z',
      url: 'https://github.com/octocat/example',
    };
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async (input: RequestInfo | URL) => {
        const url = String(input);
        requests.push(url);
        return Response.json({
          repositories: url.endsWith('page=1')
            ? Array.from({ length: 100 }, (_, index) => ({ ...repository, id: index + 1 }))
            : [{ ...repository, id: 101 }],
        });
      },
      writable: true,
    });

    try {
      const repositories = await fetchUserRepositories('session-token', 'https://api.example');
      expect(repositories).toHaveLength(101);
      expect(requests).toEqual([
        'https://api.example/api/github/repositories?page=1',
        'https://api.example/api/github/repositories?page=2',
      ]);
    } finally {
      restoreGlobal('fetch', originalFetch);
    }
  });

  test('clears and announces a session rejected by the Worker', async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;
    const localStorage = new TestStorage();
    const browserWindow = Object.assign(new EventTarget(), { localStorage });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow, writable: true });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async () => new Response(null, { status: 401 }),
      writable: true,
    });
    const session: GitHubSessionData = {
      expiresAt: '2999-09-13T17:15:00.000Z',
      token: 'rejected-token',
      user: {
        avatar_url: 'https://avatars.example/octocat',
        html_url: 'https://github.com/octocat',
        id: 7,
        login: 'octocat',
        name: null,
      },
    };
    saveStoredSession(session);
    let announced = false;
    browserWindow.addEventListener('readme-studio:session-cleared', () => { announced = true; });

    try {
      await expect(fetchRepositoryReadme('rejected-token', 'octocat', 'repo', 'main', 'https://api.example')).rejects.toThrow();
      expect(getStoredSession()).toBeNull();
      expect(announced).toBe(true);
    } finally {
      restoreGlobal('fetch', originalFetch);
      restoreGlobal('window', originalWindow);
    }
  });
});
