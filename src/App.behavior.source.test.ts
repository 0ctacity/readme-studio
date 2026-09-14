import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('App behavior wiring', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'App.tsx'), 'utf-8');

  test('mounts the GitHub modal from reactive state', () => {
    expect(source).toContain('<Show when={gitHubModalOpen()}>');
    expect(source).not.toContain('isOpen={gitHubModalOpen()}');
  });

  test('routes helper insertion only through the active editor', () => {
    expect(source).toContain("editorStyle() === 'plain' && editor?.isConnected");
    expect(source).toContain('visualEditor?.insertMarkdown');
  });

  test('returns the autosave timer cleanup from the effect', () => {
    expect(source).toContain('return () => window.clearTimeout(timer);');
    expect(source).not.toContain('onCleanup(() => window.clearTimeout(timer))');
  });

  test('expires the visible GitHub session on time', () => {
    expect(source).toContain('Date.parse(currentSession.expiresAt) - Date.now()');
    expect(source).toContain('window.setTimeout(() => clearStoredSession()');
  });
});
