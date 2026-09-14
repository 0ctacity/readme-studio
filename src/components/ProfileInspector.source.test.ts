import { describe, expect, test } from 'bun:test';

describe('ProfileInspector GitHub identity', () => {
  test('uses a connected-account notice as the fallback for manual username fields', async () => {
    const source = await Bun.file(new URL('./ProfileInspector.tsx', import.meta.url)).text();

    expect(source).toContain('class="github-identity-source"');
    expect(source).toContain('Using @{props.currentUser?.login} from your connected GitHub account.');
    expect(source.match(/<Show when=\{props\.currentUser\} fallback=\{/g)?.length).toBe(2);
  });
});
