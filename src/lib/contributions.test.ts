import { describe, expect, test } from 'bun:test';
import {
  fetchRealGitHubContributions,
  mapLevelToScore,
  parseWeeksToMatrix,
  setCachedContributions,
  getCachedContributions,
} from './contributions';

describe('Contributions helper', () => {
  test('maps level strings and numbers to 0-4 scale', () => {
    expect(mapLevelToScore('NONE')).toBe(0);
    expect(mapLevelToScore('FIRST_QUARTILE')).toBe(1);
    expect(mapLevelToScore('SECOND_QUARTILE')).toBe(2);
    expect(mapLevelToScore('THIRD_QUARTILE')).toBe(3);
    expect(mapLevelToScore('FOURTH_QUARTILE')).toBe(4);
    expect(mapLevelToScore('4')).toBe(4);
  });

  test('parses weeks data into 50x7 contribution matrix', () => {
    const mockWeeks = Array.from({ length: 52 }, (_, weekIndex) => ({
      contributionDays: Array.from({ length: 7 }, (_, dayIndex) => ({
        contributionLevel: weekIndex % 2 === 0 ? 'SECOND_QUARTILE' : 'FOURTH_QUARTILE',
        count: dayIndex * 2,
      })),
    }));

    const matrix = parseWeeksToMatrix(mockWeeks);
    expect(matrix.length).toBe(50);
    expect(matrix[0].length).toBe(7);
    expect(matrix[0][0]).toBe(2);
    expect(matrix[1][0]).toBe(4);
  });

  test('caches and retrieves contribution matrix', () => {
    const sampleMatrix = [[1, 2, 3, 4, 0, 1, 2]];
    setCachedContributions('testuser', sampleMatrix);
    expect(getCachedContributions('testuser')).toEqual(sampleMatrix);
    expect(getCachedContributions('TESTUSER')).toEqual(sampleMatrix);
  });

  test('uses the Worker for authenticated contribution data', async () => {
    const originalFetch = globalThis.fetch;
    const requests: Request[] = [];
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        requests.push(request);
        return Response.json({
          weeks: [{ contributionDays: [{ contributionCount: 4, contributionLevel: 'SECOND_QUARTILE' }] }],
        });
      },
      writable: true,
    });

    try {
      const matrix = await fetchRealGitHubContributions('worker-user', 'app-session', 'https://api.example');
      expect(matrix?.[0]?.[0]).toBe(2);
      expect(requests[0]?.url).toBe('https://api.example/api/github/contributions/worker-user');
      expect(requests[0]?.headers.get('authorization')).toBe('Bearer app-session');
    } finally {
      Object.defineProperty(globalThis, 'fetch', { configurable: true, value: originalFetch, writable: true });
    }
  });

  test('refreshes a public cache entry when an authenticated session is available', async () => {
    const originalFetch = globalThis.fetch;
    setCachedContributions('authenticated-user', [[1]]);
    let requests = 0;
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async () => {
        requests += 1;
        return Response.json({
          weeks: [{ contributionDays: [{ contributionCount: 12, contributionLevel: 'FOURTH_QUARTILE' }] }],
        });
      },
      writable: true,
    });

    try {
      const matrix = await fetchRealGitHubContributions('authenticated-user', 'app-session', 'https://api.example');
      expect(matrix?.[0]?.[0]).toBe(4);
      expect(requests).toBe(1);
    } finally {
      Object.defineProperty(globalThis, 'fetch', { configurable: true, value: originalFetch, writable: true });
    }
  });
});
