import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('App layout', () => {
  test('places editor controls in the top bar instead of the workbench', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'App.tsx'), 'utf-8');
    const topBar = source.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1] ?? '';
    const workbench = source.match(/<main class="workbench">([\s\S]*?)<div class=\{\['workspace'/)?.[1] ?? '';

    expect(topBar).toContain('editor-style-switcher');
    expect(topBar).toContain('view-switcher');
    expect(workbench).not.toContain('editor-style-switcher');
    expect(workbench).not.toContain('view-switcher');

    const styles = fs.readFileSync(path.resolve(__dirname, 'App.css'), 'utf-8');
    expect(styles).toContain('.editor-style-switcher .control-label { display: none; }');
  });
});
