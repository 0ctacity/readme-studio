import { createEffect, createSignal, Show, type Accessor } from 'solid-js';
import { markdownToVisualHtml, visualHtmlToMarkdown } from '../lib/editor-converter';

export interface VisualEditorProps {
  readonly markdown: Accessor<string>;
  readonly onChange: (markdown: string) => void;
  readonly ref?: (handle: VisualEditorHandle) => void;
  readonly onOpenBadgeTool?: () => void;
  readonly onOpenArcadeTool?: () => void;
  readonly onOpenStatsTool?: () => void;
}

export interface VisualEditorHandle {
  readonly insertMarkdown: (markdown: string) => boolean;
}

interface SlashCommand {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly action: () => void;
}

type TableAction = 'add-row' | 'add-column' | 'delete-row' | 'delete-column' | 'clear-cell' | 'delete-table';

interface SelectedTableCell {
  readonly cell: HTMLTableCellElement;
  readonly table: HTMLTableElement;
}

interface TableControlState {
  readonly columnCount: number;
  readonly isHeader: boolean;
}

export function VisualEditor(props: VisualEditorProps) {
  let editorRef: HTMLDivElement | undefined;
  let isInternalUpdate = false;
  let updateTimer: number | undefined;
  let lastSelection: Range | undefined;

  const [editorElement, setEditorElement] = createSignal<HTMLDivElement>();
  const [slashQuery, setSlashQuery] = createSignal('');
  const [slashOpen, setSlashOpen] = createSignal(false);
  const [slashPos, setSlashPos] = createSignal({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [tableControls, setTableControls] = createSignal<TableControlState | null>(null);

  const slashCommands: SlashCommand[] = [
    {
      id: 'h1',
      title: 'Heading 1',
      description: 'Big title for project names',
      icon: 'H1',
      action: () => formatBlock('H1'),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: 'Section heading for Features, Installation, etc.',
      icon: 'H2',
      action: () => formatBlock('H2'),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: 'Sub-section heading',
      icon: 'H3',
      action: () => formatBlock('H3'),
    },
    {
      id: 'bullet',
      title: 'Bullet List',
      description: 'Create an unordered list',
      icon: '•',
      action: () => exec('insertUnorderedList'),
    },
    {
      id: 'number',
      title: 'Numbered List',
      description: 'Create an ordered sequence',
      icon: '1.',
      action: () => exec('insertOrderedList'),
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert a 2x2 GitHub table',
      icon: '⌗',
      action: () => insertTable(),
    },
    {
      id: 'code',
      title: 'Code Block',
      description: 'Fenced preformatted code block',
      icon: '</>',
      action: () => insertCodeBlock(),
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Capture a quote or highlight',
      icon: '”',
      action: () => formatBlock('BLOCKQUOTE'),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Horizontal divider rule',
      icon: '—',
      action: () => exec('insertHorizontalRule'),
    },
    {
      id: 'note',
      title: 'Alert Note',
      description: 'GitHub callout box',
      icon: '💡',
      action: () => insertAlert('NOTE'),
    },
  ];

  const filteredCommands = () => {
    const q = slashQuery().toLowerCase().replace(/^\//, '');
    if (!q) return slashCommands;
    return slashCommands.filter(
      (cmd) => cmd.id.includes(q) || cmd.title.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q),
    );
  };

  createEffect(() => [props.markdown(), editorElement()] as const, ([newMarkdown, element]) => {
    if (isInternalUpdate) return;
    if (element) {
      const currentMarkdown = visualHtmlToMarkdown(element.innerHTML);
      if (currentMarkdown.trim() !== newMarkdown.trim()) {
        element.innerHTML = markdownToVisualHtml(newMarkdown);
      }
    }
  });

  props.ref?.({ insertMarkdown });

  function triggerSync() {
    isInternalUpdate = true;
    if (updateTimer) window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(() => {
      if (editorRef) {
        const md = visualHtmlToMarkdown(editorRef.innerHTML);
        props.onChange(md);
      }
      isInternalUpdate = false;
    }, 150);
  }

  function captureSelection(): void {
    const selection = window.getSelection();
    if (!editorRef || !selection || selection.rangeCount === 0) {
      setTableControls(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (editorRef.contains(range.commonAncestorContainer)) {
      lastSelection = range.cloneRange();
      const selected = findTableCell(range);
      setTableControls(selected ? {
        columnCount: selected.cell.parentElement?.children.length ?? 0,
        isHeader: selected.cell.tagName === 'TH',
      } : null);
    } else {
      setTableControls(null);
    }
  }

  function restoreSelection(): void {
    if (!lastSelection) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(lastSelection);
  }

  function insertMarkdown(markdown: string): boolean {
    if (!editorRef) return false;
    editorRef.focus();
    restoreSelection();
    const inserted = document.execCommand('insertHTML', false, markdownToVisualHtml(markdown));
    if (inserted) {
      captureSelection();
      triggerSync();
    }
    return inserted;
  }

  function exec(command: string, value?: string) {
    if (!editorRef) return;
    editorRef.focus();
    document.execCommand(command, false, value);
    triggerSync();
  }

  function formatBlock(tag: string) {
    if (!editorRef) return;
    editorRef.focus();
    document.execCommand('formatBlock', false, tag);
    triggerSync();
  }

  function insertLink() {
    const url = window.prompt('Enter link URL (e.g. https://github.com):');
    if (url) {
      exec('createLink', url);
    }
  }

  function insertInlineCode() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'code';
    const codeNode = document.createElement('code');
    codeNode.textContent = selectedText;
    range.deleteContents();
    range.insertNode(codeNode);
    selection.removeAllRanges();
    triggerSync();
  }

  function insertTable() {
    const tableHtml = `
      <table>
        <thead>
          <tr><th>Feature</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td>Example 1</td><td>Value 1</td></tr>
          <tr><td>Example 2</td><td>Value 2</td></tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    exec('insertHTML', tableHtml);
  }

  function findTableCell(range = lastSelection): SelectedTableCell | null {
    if (!editorRef || !range) return null;
    const node = range.commonAncestorContainer;
    const element = node instanceof Element ? node : node.parentElement;
    const cell = element?.closest<HTMLTableCellElement>('td, th');
    const table = cell?.closest<HTMLTableElement>('table');
    if (!cell || !table || !editorRef.contains(table)) return null;
    return { cell, table };
  }

  function replaceTable(table: HTMLTableElement, replacementHtml: string): void {
    if (!editorRef) return;
    editorRef.focus();
    const range = document.createRange();
    range.selectNode(table);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('insertHTML', false, replacementHtml);
    lastSelection = undefined;
    setTableControls(null);
    triggerSync();
  }

  function editTable(action: TableAction): void {
    const selected = findTableCell();
    if (!selected) return;

    const rowIndex = selected.cell.closest<HTMLTableRowElement>('tr')?.rowIndex ?? -1;
    const columnIndex = selected.cell.cellIndex;
    const table = selected.table.cloneNode(true) as HTMLTableElement;
    const row = table.rows.item(rowIndex);
    const cell = row?.cells.item(columnIndex);
    if (!row || !cell) return;

    if (action === 'delete-table') {
      replaceTable(selected.table, '<p><br></p>');
      return;
    }

    if (action === 'add-row') {
      const newRow = document.createElement('tr');
      const columnCount = Math.max(...Array.from(table.rows, (tableRow) => tableRow.cells.length));
      for (let index = 0; index < columnCount; index += 1) {
        newRow.append(document.createElement('td'));
      }
      if (row.parentElement?.tagName === 'THEAD') {
        const body = table.tBodies.item(0) ?? table.createTBody();
        body.insertBefore(newRow, body.firstChild);
      } else {
        row.parentElement?.insertBefore(newRow, row.nextSibling);
      }
    } else if (action === 'add-column') {
      for (const tableRow of table.rows) {
        const tagName = tableRow.parentElement?.tagName === 'THEAD' ? 'th' : 'td';
        const newCell = document.createElement(tagName);
        tableRow.insertBefore(newCell, tableRow.cells.item(columnIndex + 1));
      }
    } else if (action === 'delete-row') {
      if (row.parentElement?.tagName === 'THEAD' || table.rows.length <= 1) return;
      row.remove();
    } else if (action === 'delete-column') {
      if (row.cells.length <= 1) return;
      for (const tableRow of table.rows) {
        tableRow.cells.item(columnIndex)?.remove();
      }
    } else if (action === 'clear-cell') {
      cell.textContent = '';
    }

    replaceTable(selected.table, table.outerHTML);
  }

  function insertCodeBlock() {
    const codeHtml = `<pre><code>// code snippet here</code></pre><p><br></p>`;
    exec('insertHTML', codeHtml);
  }

  function insertAlert(type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING') {
    const alertHtml = `<blockquote><p>[!${type}]<br>Highlight important information for users here.</p></blockquote><p><br></p>`;
    exec('insertHTML', alertHtml);
  }

  function handleInput() {
    captureSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const node = selection.anchorNode;
      const text = node?.textContent || '';
      const offset = selection.anchorOffset;
      const beforeCursor = text.slice(0, offset);

      const slashMatch = /\/([a-zA-Z0-9_-]*)$/.exec(beforeCursor);
      if (slashMatch) {
        const range = selection.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();
        setSlashPos({
          top: rect.bottom + window.scrollY + 6,
          left: Math.max(16, rect.left + window.scrollX),
        });
        setSlashQuery(slashMatch[1]);
        setSelectedIndex(0);
        setSlashOpen(true);
      } else {
        setSlashOpen(false);
      }
    }
    triggerSync();
  }

  function executeSlashCommand(cmd: SlashCommand) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const node = selection.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const offset = selection.anchorOffset;
        const slashIdx = text.lastIndexOf('/', offset);
        if (slashIdx !== -1) {
          node.textContent = text.slice(0, slashIdx) + text.slice(offset);
        }
      }
    }
    setSlashOpen(false);
    cmd.action();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (slashOpen()) {
      const cmds = filteredCommands();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % (cmds.length || 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((idx) => (idx - 1 + cmds.length) % (cmds.length || 1));
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (cmds[selectedIndex()]) {
          executeSlashCommand(cmds[selectedIndex()]);
        }
        return;
      }
      if (event.key === 'Escape') {
        setSlashOpen(false);
        return;
      }
    }

    if (event.metaKey || event.ctrlKey) {
      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        exec('bold');
      } else if (key === 'i') {
        event.preventDefault();
        exec('italic');
      } else if (key === 'k') {
        event.preventDefault();
        insertLink();
      }
    }
  }

  return (
    <div class="visual-editor-container">
      {/* Visual Formatting Toolbar */}
      <div class="visual-toolbar" aria-label="Visual formatting toolbar">
        <div class="toolbar-group">
          <button type="button" class="tool-btn" onClick={() => formatBlock('H1')} title="Heading 1 (H1)">
            <strong>H1</strong>
          </button>
          <button type="button" class="tool-btn" onClick={() => formatBlock('H2')} title="Heading 2 (H2)">
            <strong>H2</strong>
          </button>
          <button type="button" class="tool-btn" onClick={() => formatBlock('H3')} title="Heading 3 (H3)">
            <strong>H3</strong>
          </button>
          <button type="button" class="tool-btn" onClick={() => formatBlock('P')} title="Normal text (Paragraph)">
            <span>¶</span>
          </button>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-group">
          <button type="button" class="tool-btn" onClick={() => exec('bold')} title="Bold (⌘B)">
            <strong>B</strong>
          </button>
          <button type="button" class="tool-btn" onClick={() => exec('italic')} title="Italic (⌘I)">
            <em>I</em>
          </button>
          <button type="button" class="tool-btn" onClick={() => exec('strikeThrough')} title="Strikethrough">
            <s>S</s>
          </button>
          <button type="button" class="tool-btn" onClick={insertInlineCode} title="Inline Code">
            <code>&lt;/&gt;</code>
          </button>
          <button type="button" class="tool-btn" onClick={insertLink} title="Link (⌘K)">
            <span>↗</span>
          </button>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-group">
          <button type="button" class="tool-btn" onClick={() => exec('insertUnorderedList')} title="Bullet List">
            <span>• List</span>
          </button>
          <button type="button" class="tool-btn" onClick={() => exec('insertOrderedList')} title="Numbered List">
            <span>1. List</span>
          </button>
          <button type="button" class="tool-btn" onClick={insertTable} title="Insert Table">
            <span>⌗ Table</span>
          </button>
          <button type="button" class="tool-btn" onClick={insertCodeBlock} title="Code block">
            <span>{'{ }'} Code</span>
          </button>
          <button type="button" class="tool-btn" onClick={() => insertAlert('NOTE')} title="Alert note">
            <span>💡 Callout</span>
          </button>
        </div>

      </div>

      <Show when={tableControls()}>
        <div class="visual-table-toolbar" aria-label="Table controls">
          <span class="table-toolbar-label">Table</span>
          <button type="button" class="tool-btn" onClick={() => editTable('add-row')} title="Add row below">
            + Row
          </button>
          <button type="button" class="tool-btn" onClick={() => editTable('add-column')} title="Add column to the right">
            + Column
          </button>
          <button type="button" class="tool-btn" disabled={tableControls()?.isHeader} onClick={() => editTable('delete-row')} title={tableControls()?.isHeader ? 'The header row is required by GitHub Markdown' : 'Delete selected row'}>
            − Row
          </button>
          <button type="button" class="tool-btn" disabled={(tableControls()?.columnCount ?? 0) <= 1} onClick={() => editTable('delete-column')} title="Delete selected column">
            − Column
          </button>
          <button type="button" class="tool-btn" onClick={() => editTable('clear-cell')} title="Clear selected cell">
            Clear cell
          </button>
          <button type="button" class="tool-btn danger" onClick={() => editTable('delete-table')} title="Delete table">
            Delete table
          </button>
        </div>
      </Show>

      {/* Editable Canvas */}
      <div class="visual-canvas-scroller">
        <div
          ref={(element) => {
            editorRef = element;
            setEditorElement(element);
          }}
          class="visual-editor-canvas markdown-body"
          contenteditable={true}
          spellcheck={false}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={captureSelection}
          onMouseUp={captureSelection}
          onBlur={captureSelection}
          aria-label="Visual README Canvas"
        />
      </div>

      {/* Floating Slash Command Palette */}
      <Show when={slashOpen() && filteredCommands().length > 0}>
        <div
          class="slash-menu"
          style={{
            top: `${slashPos().top}px`,
            left: `${slashPos().left}px`,
          }}
        >
          <div class="slash-menu-header">Insert block (type to filter)</div>
          <div class="slash-menu-list">
            {filteredCommands().map((cmd, idx) => (
              <button
                type="button"
                class={['slash-item', { active: idx === selectedIndex() }]}
                onClick={() => executeSlashCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span class="slash-icon">{cmd.icon}</span>
                <div class="slash-text">
                  <strong>{cmd.title}</strong>
                  <small>{cmd.description}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Show>
    </div>
  );
}
