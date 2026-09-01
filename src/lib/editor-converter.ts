import TurndownService from 'turndown';
import { marked } from 'marked';

// Configure Turndown for standard GitHub Flavored Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Preserve raw HTML elements commonly used in READMEs
turndownService.keep(['div', 'span', 'details', 'summary', 'kbd', 'picture', 'source', 'iframe'] as (keyof HTMLElementTagNameMap)[]);

// Custom rule for GFM strikethrough (del / s)
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement(content) {
    return `~~${content}~~`;
  },
});

// Clean list items to have standard 1-space indentation
turndownService.addRule('listItem', {
  filter: 'li',
  replacement(content, node, options) {
    const parent = node.parentNode as HTMLElement | null;
    const isOrdered = parent && parent.nodeName === 'OL';
    const input = (node as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement | null;

    let cleanContent = content.trim();

    if (input) {
      const isChecked = input.checked || input.hasAttribute('checked');
      cleanContent = cleanContent.replace(/^\[[ xX]\]\s*/, '').trim();
      return `- [${isChecked ? 'x' : ' '}] ${cleanContent}\n`;
    }

    if (isOrdered) {
      const index = Array.from(parent?.children ?? []).indexOf(node) + 1;
      return `${index}. ${cleanContent}\n`;
    }

    return `${options.bulletListMarker} ${cleanContent}\n`;
  },
});

// Custom rule for GFM Tables
turndownService.addRule('table', {
  filter: 'table',
  replacement(_content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const lines: string[] = [];
    let colCount = 0;

    // Header row
    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    colCount = headerCells.length;
    if (colCount === 0) return '';

    const headerLine = `| ${headerCells.map((cell) => cell.textContent?.trim() || ' ').join(' | ')} |`;
    const separatorLine = `| ${headerCells.map(() => '---').join(' | ')} |`;
    lines.push(headerLine, separatorLine);

    // Body rows
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td, th'));
      const rowContent = Array.from({ length: colCount }, (_, idx) => cells[idx]?.textContent?.trim() || '');
      lines.push(`| ${rowContent.join(' | ')} |`);
    }

    return `\n\n${lines.join('\n')}\n\n`;
  },
});

export function markdownToVisualHtml(markdown: string): string {
  if (!markdown) return '<p><br></p>';
  return marked.parse(markdown, { gfm: true, breaks: false, async: false }) as string;
}

export function visualHtmlToMarkdown(html: string): string {
  if (!html || html === '<p><br></p>' || html.trim() === '<br>') return '';
  return turndownService.turndown(html);
}
