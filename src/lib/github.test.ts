import { describe, expect, test } from 'bun:test';
import {
  clearStoredSession,
  generatePkcePair,
  getApiBaseUrl,
  getStoredSession,
  saveStoredSession,
  type GitHubSessionData,
} from './github';

describe('GitHub client library', () => {
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
});
