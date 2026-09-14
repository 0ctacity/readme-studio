import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('VisualEditor behavior wiring', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'VisualEditor.tsx'), 'utf-8');

  test('accepts reactive Markdown and exposes undoable insertion', () => {
    expect(source).toContain('readonly markdown: Accessor<string>');
    expect(source).toContain('readonly ref?: (handle: VisualEditorHandle) => void');
    expect(source).toContain("document.execCommand('insertHTML', false, markdownToVisualHtml(markdown))");
  });
});
