import { describe, expect, test } from 'bun:test';
import { markdownToVisualHtml, visualHtmlToMarkdown } from './editor-converter';

describe('Editor Converter (Markdown <-> Visual HTML)', () => {
  test('converts headings and paragraphs back and forth', () => {
    const md = '# Project Title\n\nThis is a great project description.';
    const html = markdownToVisualHtml(md);
    expect(html).toContain('<h1>Project Title</h1>');
    expect(html).toContain('<p>This is a great project description.</p>');

    const convertedMd = visualHtmlToMarkdown(html);
    expect(convertedMd).toContain('# Project Title');
    expect(convertedMd).toContain('This is a great project description.');
  });

  test('converts lists and checkboxes', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const html = markdownToVisualHtml(md);
    const convertedMd = visualHtmlToMarkdown(html);
    expect(convertedMd).toContain('- Item 1');
    expect(convertedMd).toContain('- Item 2');
  });

  test('converts GFM tables', () => {
    const tableHtml = '<table><thead><tr><th>Feature</th><th>Status</th></tr></thead><tbody><tr><td>Editor</td><td>Ready</td></tr></tbody></table>';
    const md = visualHtmlToMarkdown(tableHtml);
    expect(md).toContain('| Feature | Status |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| Editor | Ready |');
  });

  test('preserves code blocks and inline formatting', () => {
    const md = 'Here is `inline code` and **bold text** and *italic*.';
    const html = markdownToVisualHtml(md);
    const convertedMd = visualHtmlToMarkdown(html);
    expect(convertedMd).toContain('`inline code`');
    expect(convertedMd).toContain('**bold text**');
    expect(convertedMd).toContain('*italic*');
  });
});
