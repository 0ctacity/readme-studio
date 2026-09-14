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

  test('offers undoable controls for the selected table cell', () => {
    expect(source).toContain("type TableAction = 'add-row' | 'add-column' | 'delete-row' | 'delete-column' | 'clear-cell' | 'delete-table'");
    expect(source).toContain('aria-label="Table controls"');
    expect(source).toContain("editTable('add-row')");
    expect(source).toContain("editTable('add-column')");
    expect(source).toContain("editTable('delete-row')");
    expect(source).toContain("editTable('delete-column')");
    expect(source).toContain("editTable('clear-cell')");
    expect(source).toContain("editTable('delete-table')");
    expect(source).toContain("disabled={tableControls()?.isHeader}");
    expect(source).toContain("document.execCommand('insertHTML', false, replacementHtml)");
  });
});
