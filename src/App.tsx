import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { createEffect, createMemo, createSignal, onSettled, Show } from 'solid-js';
import './App.css';
import {
  buildBadgeMarkdown,
  buildBadgeUrl,
  generateProjectTree,
  generateTableOfContents,
  insertText,
  type BadgeOptions,
} from './lib/readme';

const STORAGE_KEY = 'readme-studio:draft';
const STARTER_README = `# Acme project

> A short, useful description of what this project does and who it is for.

## Features

- Fast to set up
- Pleasant to use
- Built for the web

## Getting started

\`\`\`bash
bun install
bun run dev
\`\`\`

## License

MIT
`;

type PanelMode = 'editor' | 'preview';
type ToolPanel = 'insert' | 'badge' | 'utilities';

const insertHelpers = [
  { label: 'Heading', hint: 'H2', before: '## ', after: '', placeholder: 'Section title' },
  { label: 'Link', hint: '↗', before: '[', after: '](https://example.com)', placeholder: 'link text' },
  { label: 'Image or GIF', hint: '▧', before: '![', after: '](https://example.com/image.png)', placeholder: 'alt text' },
  { label: 'Code block', hint: '</>', before: '\n```ts\n', after: '\n```\n', placeholder: '// your code' },
  { label: 'Table', hint: '⌗', before: '\n| Column | Column |\n| :-- | :-- |\n| Value | Value |\n', after: '', placeholder: '' },
  { label: 'Details', hint: '⌄', before: '\n<details>\n<summary>More details</summary>\n\n', after: '\n</details>\n', placeholder: 'Hidden content' },
  { label: 'Centered block', hint: '↔', before: '\n<div align="center">\n\n', after: '\n\n</div>\n', placeholder: 'Centered content' },
] as const;

function App() {
  const [markdown, setMarkdown] = createSignal(STARTER_README);
  const [fileName, setFileName] = createSignal('README.md');
  const [panelMode, setPanelMode] = createSignal<PanelMode>('editor');
  const [activeTool, setActiveTool] = createSignal<ToolPanel>('insert');
  const [saved, setSaved] = createSignal(true);
  const [draggingFile, setDraggingFile] = createSignal(false);
  const [treePaths, setTreePaths] = createSignal('src/App.tsx\nsrc/lib/readme.ts\npublic/favicon.ico\nREADME.md');
  const [badge, setBadge] = createSignal<BadgeOptions>({
    label: 'build', message: 'passing', color: '2f855a', style: 'flat-square', logo: 'github', link: '',
  });
  let editor!: HTMLTextAreaElement;
  let fileInput!: HTMLInputElement;

  marked.setOptions({ gfm: true, breaks: false });

  onSettled(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft !== null) {
      editor.value = draft;
      setMarkdown(draft);
    }
  });

  createEffect(
    () => markdown(),
    (value) => {
      setSaved(false);
      const timer = window.setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, value);
        setSaved(true);
      }, 450);
      return () => window.clearTimeout(timer);
    },
  );

  const renderedMarkdown = createMemo(() => {
    const html = marked.parse(markdown(), { async: false });
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  });

  const stats = createMemo(() => {
    const content = markdown();
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { words, characters: content.length, lines: content.split('\n').length };
  });

  function updateBadge<K extends keyof BadgeOptions>(key: K, value: BadgeOptions[K]): void {
    setBadge((current) => ({ ...current, [key]: value }));
  }

  function applyInsertion(before: string, after = '', placeholder = ''): void {
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    const result = insertText(editor.value, start, end, before, after, placeholder);
    const replacement = result.value.slice(start, result.selectionEnd + after.length);
    replaceEditorRange(replacement, start, end, result.selectionStart, result.selectionEnd);
  }

  function replaceEditorRange(
    replacement: string,
    start: number,
    end: number,
    selectionStart: number,
    selectionEnd: number,
  ): void {
    editor.focus();
    editor.setSelectionRange(start, end);

    // execCommand is retained here because it adds programmatic insertions to
    // the textarea's platform-native undo stack. setRangeText is the fallback.
    if (!document.execCommand('insertText', false, replacement)) {
      editor.setRangeText(replacement, start, end, 'end');
    }

    setMarkdown(editor.value);
    editor.setSelectionRange(selectionStart, selectionEnd);
  }

  function replaceEditorDocument(value: string): void {
    replaceEditorRange(value, 0, editor.value.length, value.length, value.length);
  }

  function downloadReadme(): void {
    const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'README.md';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file?: File): void {
    if (!file || (!file.name.endsWith('.md') && !file.name.endsWith('.markdown'))) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        replaceEditorDocument(reader.result);
        setFileName(file.name);
      }
    });
    reader.readAsText(file);
  }

  function resetReadme(): void {
    if (markdown().trim() && !window.confirm('Start a new README? Your current local draft will be replaced.')) return;
    const freshReadme = '# Project name\n\nDescribe your project here.\n';
    replaceEditorDocument(freshReadme);
    setFileName('README.md');
    requestAnimationFrame(() => editor.focus());
  }

  function insertToc(): void {
    const toc = generateTableOfContents(markdown());
    applyInsertion('\n## Table of contents\n\n', '\n', toc || '- Add some section headings first');
  }

  function insertTree(): void {
    applyInsertion('\n## Project structure\n\n```text\n', '\n```\n', generateProjectTree(treePaths()));
  }

  function handleKeyboard(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); downloadReadme(); }
    else if (key === 'b') { event.preventDefault(); applyInsertion('**', '**', 'bold text'); }
    else if (key === 'k') { event.preventDefault(); applyInsertion('[', '](https://example.com)', 'link text'); }
  }

  return (
    <div class="app-shell" onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDraggingFile(false); }} onDrop={(event) => { event.preventDefault(); setDraggingFile(false); importFile(event.dataTransfer?.files[0]); }}>
      <header class="topbar">
        <div class="brand" aria-label="Readme Studio"><span class="brand-mark">R/</span><span>Readme Studio</span></div>
        <div class="document-status"><span class="file-dot" aria-hidden="true" /><span class="file-name">{fileName()}</span><span class="save-status">{saved() ? 'Saved locally' : 'Saving…'}</span></div>
        <div class="top-actions">
          <input ref={fileInput} class="visually-hidden" type="file" accept=".md,.markdown,text/markdown" onChange={(event) => importFile(event.currentTarget.files?.[0])} />
          <button class="button ghost" onClick={resetReadme}>New</button>
          <button class="button ghost" onClick={() => fileInput.click()}>Import</button>
          <button class="button primary" onClick={downloadReadme}>Export README</button>
        </div>
      </header>

      <div class="studio-body">
        <aside class="toolbox" aria-label="README tools">
          <nav class="tool-tabs" aria-label="Tool categories">
            <button class={{ active: activeTool() === 'insert' }} onClick={() => setActiveTool('insert')}><span aria-hidden="true">＋</span><small>Insert</small></button>
            <button class={{ active: activeTool() === 'badge' }} onClick={() => setActiveTool('badge')}><span aria-hidden="true">◆</span><small>Badges</small></button>
            <button class={{ active: activeTool() === 'utilities' }} onClick={() => setActiveTool('utilities')}><span aria-hidden="true">⌁</span><small>Utilities</small></button>
          </nav>

          <div class="tool-content">
            <Show when={activeTool() === 'insert'}>
              <p class="eyebrow">Building blocks</p><h2>Insert</h2><p class="tool-description">Drop familiar README patterns at your cursor.</p>
              <div class="insert-grid">{insertHelpers.map((item) => <button onClick={() => applyInsertion(item.before, item.after, item.placeholder)}><span>{item.hint}</span>{item.label}</button>)}</div>
              <div class="shortcut-card"><span>Quick keys</span><p><kbd>⌘</kbd><kbd>B</kbd> bold · <kbd>⌘</kbd><kbd>K</kbd> link</p></div>
            </Show>

            <Show when={activeTool() === 'badge'}>
              <p class="eyebrow">Shields.io</p><h2>Badge builder</h2><p class="tool-description">Make a crisp status badge, then insert its Markdown.</p>
              <div class="badge-preview"><img src={buildBadgeUrl(badge())} alt="Generated badge preview" /></div>
              <label>Label<input value={badge().label} onInput={(event) => updateBadge('label', event.currentTarget.value)} /></label>
              <label>Message<input value={badge().message} onInput={(event) => updateBadge('message', event.currentTarget.value)} /></label>
              <div class="field-row">
                <label>Color<input value={badge().color} onInput={(event) => updateBadge('color', event.currentTarget.value)} /></label>
                <label>Style<select value={badge().style} onChange={(event) => updateBadge('style', event.currentTarget.value)}><option value="flat">Flat</option><option value="flat-square">Square</option><option value="for-the-badge">For the badge</option><option value="plastic">Plastic</option></select></label>
              </div>
              <label>Logo<input value={badge().logo} placeholder="github" onInput={(event) => updateBadge('logo', event.currentTarget.value)} /></label>
              <label>Link (optional)<input value={badge().link} placeholder="https://…" onInput={(event) => updateBadge('link', event.currentTarget.value)} /></label>
              <button class="wide-action" onClick={() => applyInsertion(buildBadgeMarkdown(badge()))}>Insert badge</button>
            </Show>

            <Show when={activeTool() === 'utilities'}>
              <p class="eyebrow">Document tools</p><h2>Utilities</h2><p class="tool-description">Generate the repetitive parts and stay in flow.</p>
              <section class="utility-card"><h3>Table of contents</h3><p>Build links from your H2–H6 headings.</p><button onClick={insertToc}>Generate & insert</button></section>
              <section class="utility-card"><h3>Project tree</h3><p>Paste one file path per line.</p><textarea value={treePaths()} onInput={(event) => setTreePaths(event.currentTarget.value)} aria-label="Project file paths" /><button onClick={insertTree}>Generate & insert</button></section>
              <section class="stats-card" aria-label="Editor statistics"><div><strong>{stats().words}</strong><span>Words</span></div><div><strong>{stats().lines}</strong><span>Lines</span></div><div><strong>{stats().characters}</strong><span>Chars</span></div></section>
            </Show>
          </div>
        </aside>

        <main class="workbench">
          <div class="viewbar"><div class="view-switcher" aria-label="Workspace view">{(['editor', 'preview'] as const).map((mode) => <button class={{ active: panelMode() === mode }} onClick={() => setPanelMode(mode)}>{mode}</button>)}</div><span>Markdown · {stats().words} words</span></div>
          <div class={['workspace', panelMode()]}>
            <section class={['editor-pane', { hidden: panelMode() === 'preview' }]}><div class="pane-label"><span>EDITOR</span><span>UTF-8</span></div><textarea ref={(element) => { editor = element; editor.value = STARTER_README; }} onInput={(event) => setMarkdown(event.currentTarget.value)} onKeyDown={handleKeyboard} spellcheck={false} aria-label="Markdown editor" /></section>
            <section class={['preview-pane', { hidden: panelMode() === 'editor' }]}><div class="pane-label"><span>PREVIEW</span><span>GITHUB STYLE</span></div><div class="preview-scroll"><Show when={markdown().trim()} fallback={<div class="empty-state"><span>R/</span><h2>Your README starts here</h2><p>Write Markdown in the editor or import a file to see it rendered.</p></div>}><article class="markdown-body" innerHTML={renderedMarkdown()} /></Show></div></section>
          </div>
        </main>
      </div>

      <Show when={draggingFile()}><div class="drop-overlay"><div><span>↓</span><strong>Drop your Markdown file</strong><small>.md and .markdown</small></div></div></Show>
    </div>
  );
}

export default App;
