import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { createEffect, createMemo, createSignal, onSettled, Show } from 'solid-js';
import './App.css';
import { ProfileInspector } from './components/ProfileInspector';
import {
  PROFILE_TOOL_CATALOG,
  getRequiredProfileFiles,
  type ProfileToolId,
} from './lib/profile';
import {
  buildBadgeMarkdown,
  buildBadgeUrl,
  buildShieldPresetMarkdown,
  buildShieldPresetUrl,
  DEFAULT_SHIELD_BADGE_INPUTS,
  generateProjectTree,
  generateTableOfContents,
  insertText,
  SHIELD_BADGE_PRESETS,
  type BadgeOptions,
  type ShieldBadgeInputKey,
  type ShieldBadgeInputs,
  type ShieldBadgePresetId,
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
type InsertTool = 'heading' | 'link' | 'image' | 'code' | 'table' | 'details' | 'centered';
type ToolPanel = InsertTool | ProfileToolId | 'badge' | 'toc' | 'tree';
type InspectorTab = 'tool' | 'document' | 'checks' | 'export';

const insertHelpers = [
  { id: 'heading', label: 'Heading', hint: 'H2', description: 'Start a clear README section.', before: '## ', after: '', placeholder: 'Section title' },
  { id: 'link', label: 'Link', hint: '↗', description: 'Add linked text with a URL.', before: '[', after: '](https://example.com)', placeholder: 'link text' },
  { id: 'image', label: 'Image / GIF', hint: '▧', description: 'Insert an accessible image or animation.', before: '![', after: '](https://example.com/image.png)', placeholder: 'alt text' },
  { id: 'code', label: 'Code block', hint: '</>', description: 'Add a fenced TypeScript example.', before: '\n```ts\n', after: '\n```\n', placeholder: '// your code' },
  { id: 'table', label: 'Table', hint: '⌗', description: 'Create a two-column GFM table.', before: '\n| Column | Column |\n| :-- | :-- |\n| Value | Value |\n', after: '', placeholder: '' },
  { id: 'details', label: 'Details', hint: '⌄', description: 'Hide optional content in a disclosure.', before: '\n<details>\n<summary>More details</summary>\n\n', after: '\n</details>\n', placeholder: 'Hidden content' },
  { id: 'centered', label: 'Centered block', hint: '↔', description: 'Center badges, logos, or short copy.', before: '\n<div align="center">\n\n', after: '\n\n</div>\n', placeholder: 'Centered content' },
] as const;

const profileToolIds = new Set<ProfileToolId>(PROFILE_TOOL_CATALOG.map(({ id }) => id));

function isProfileTool(tool: ToolPanel): tool is ProfileToolId {
  return profileToolIds.has(tool as ProfileToolId);
}

const shieldFieldMeta: Record<ShieldBadgeInputKey, { readonly label: string; readonly placeholder: string }> = {
  repository: { label: 'GitHub repository', placeholder: 'owner/repository' },
  workflow: { label: 'Workflow file', placeholder: 'ci.yml' },
  branch: { label: 'Branch (optional)', placeholder: 'main' },
  packageName: { label: 'npm package', placeholder: '@scope/package' },
  discordServerId: { label: 'Discord server ID', placeholder: '308323056592486420' },
  docsProject: { label: 'Read the Docs project', placeholder: 'project-slug' },
};

function App() {
  const [markdown, setMarkdown] = createSignal(STARTER_README);
  const [fileName, setFileName] = createSignal('README.md');
  const [panelMode, setPanelMode] = createSignal<PanelMode>('editor');
  const [activeTool, setActiveTool] = createSignal<ToolPanel>('heading');
  const [inspectorTab, setInspectorTab] = createSignal<InspectorTab>('tool');
  const [toolboxCollapsed, setToolboxCollapsed] = createSignal(false);
  const [inspectorCollapsed, setInspectorCollapsed] = createSignal(false);
  const [saved, setSaved] = createSignal(true);
  const [draggingFile, setDraggingFile] = createSignal(false);
  const [treePaths, setTreePaths] = createSignal('src/App.tsx\nsrc/lib/readme.ts\npublic/favicon.ico\nREADME.md');
  const [badge, setBadge] = createSignal<BadgeOptions>({
    label: 'build', message: 'passing', color: '2f855a', style: 'flat-square', logo: 'github', link: '',
  });
  const [selectedBadgePreset, setSelectedBadgePreset] = createSignal<ShieldBadgePresetId | null>('build');
  const [shieldInputs, setShieldInputs] = createSignal<ShieldBadgeInputs>(DEFAULT_SHIELD_BADGE_INPUTS);
  let editor!: HTMLTextAreaElement;
  let fileInput!: HTMLInputElement;

  marked.setOptions({ gfm: true, breaks: false });

  onSettled(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft !== null) {
      editor.value = draft;
      setMarkdown(draft);
    }
    if (window.innerWidth <= 900) {
      setToolboxCollapsed(true);
      setInspectorCollapsed(true);
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

  const activeInsertTool = createMemo(() => insertHelpers.find((tool) => tool.id === activeTool()));
  const activeToolTitle = createMemo(() => activeInsertTool()?.label
    ?? PROFILE_TOOL_CATALOG.find(({ id }) => id === activeTool())?.label
    ?? ({ badge: 'Shields.io badge', toc: 'Table of contents', tree: 'Project tree' } as const)[activeTool() as 'badge' | 'toc' | 'tree']);
  const selectedShieldPreset = createMemo(() => SHIELD_BADGE_PRESETS.find(({ id }) => id === selectedBadgePreset()));
  const generatedBadgeUrl = createMemo(() => {
    const preset = selectedShieldPreset();
    return preset?.kind === 'dynamic'
      ? buildShieldPresetUrl(preset.id, shieldInputs(), badge().style)
      : buildBadgeUrl(badge());
  });
  const generatedBadgeMarkdown = createMemo(() => {
    const preset = selectedShieldPreset();
    return preset?.kind === 'dynamic'
      ? buildShieldPresetMarkdown(preset.id, shieldInputs(), badge().style, badge().link)
      : buildBadgeMarkdown(badge());
  });
  const requiredProfileFiles = createMemo(() => getRequiredProfileFiles(markdown()));

  const outline = createMemo(() => markdown().split('\n').flatMap((line) => {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    return match ? [{ depth: match[1].length, label: match[2].replace(/[*_`]/g, '') }] : [];
  }));

  const documentChecks = createMemo(() => {
    const headings = outline().map((heading) => heading.label.toLowerCase());
    const duplicateHeadings = headings.filter((heading, index) => headings.indexOf(heading) !== index).length;
    const missingAltText = (markdown().match(/!\[\s*\]\(/g) ?? []).length;
    return [
      { label: 'Document title', passed: outline().some((heading) => heading.depth === 1), detail: 'Include one H1 project title.' },
      { label: 'Image alt text', passed: missingAltText === 0, detail: missingAltText ? `${missingAltText} image${missingAltText === 1 ? '' : 's'} need alt text.` : 'Every Markdown image has alt text.' },
      { label: 'Unique headings', passed: duplicateHeadings === 0, detail: duplicateHeadings ? `${duplicateHeadings} duplicate heading${duplicateHeadings === 1 ? '' : 's'} found.` : 'No duplicate headings found.' },
    ];
  });

  function selectTool(tool: ToolPanel): void {
    setActiveTool(tool);
    setInspectorTab('tool');
    setInspectorCollapsed(false);
    if (window.innerWidth <= 900) setToolboxCollapsed(true);
  }

  function updateBadge<K extends keyof BadgeOptions>(key: K, value: BadgeOptions[K], keepPreset = false): void {
    if (!keepPreset) setSelectedBadgePreset(null);
    setBadge((current) => ({ ...current, [key]: value }));
  }

  function applyBadgePreset(preset: (typeof SHIELD_BADGE_PRESETS)[number]): void {
    setBadge({ ...preset.options, link: '' });
    setSelectedBadgePreset(preset.id);
  }

  function updateShieldInput(key: ShieldBadgeInputKey, value: string): void {
    setShieldInputs((current) => ({ ...current, [key]: value }));
  }

  function insertGeneratedBadge(): void {
    const badgeMarkdown = generatedBadgeMarkdown();
    if (badgeMarkdown) applyInsertion(badgeMarkdown);
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

  function downloadFile(name: string, content: string, type = 'text/plain;charset=utf-8'): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadReadme(): void {
    downloadFile('README.md', markdown(), 'text/markdown;charset=utf-8');
  }

  function insertProfileMarkdown(value: string): void {
    applyInsertion(`\n\n${value}\n\n`);
  }

  function replaceWithProfileTemplate(value: string): void {
    if (markdown().trim() && !window.confirm('Use this profile template? Your current README will be replaced.')) return;
    replaceEditorDocument(`${value.trim()}\n`);
    setFileName('README.md');
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
        <div class="document-status"><span class="file-dot" aria-hidden="true" /><span class="file-name">{fileName()}</span><span class="metadata-separator" aria-hidden="true">·</span><span class="save-status">{saved() ? 'Saved locally' : 'Saving…'}</span></div>
        <div class="top-actions">
          <input ref={fileInput} class="visually-hidden" type="file" accept=".md,.markdown,text/markdown" onChange={(event) => importFile(event.currentTarget.files?.[0])} />
          <button class="button ghost" onClick={resetReadme}>New</button>
          <button class="button ghost" onClick={() => fileInput.click()}>Import</button>
          <button class="button primary" onClick={downloadReadme}>Export README</button>
        </div>
      </header>

      <div class={['studio-body', { 'toolbox-collapsed': toolboxCollapsed(), 'inspector-collapsed': inspectorCollapsed() }]}>
        <button class="edge-toggle toolbox-toggle" aria-label={toolboxCollapsed() ? 'Expand toolbox' : 'Collapse toolbox'} aria-expanded={toolboxCollapsed() ? 'false' : 'true'} onClick={() => setToolboxCollapsed((collapsed) => !collapsed)}><span aria-hidden="true">{toolboxCollapsed() ? '›' : '‹'}</span></button>

        <aside class="toolbox-panel" aria-label="README toolbox">
          <div class="panel-heading"><p class="eyebrow">Readme kit</p><h2>Toolbox</h2><p>Choose a building block, then configure it in the inspector.</p></div>
          <div class="tool-groups">
            <section class="tool-group">
              <h3>Insert</h3>
              <div class="tool-list">{insertHelpers.map((tool) => <button class={{ active: activeTool() === tool.id }} onClick={() => selectTool(tool.id)}><span>{tool.hint}</span><strong>{tool.label}</strong></button>)}</div>
            </section>
            <section class="tool-group">
              <h3>Badges</h3>
              <div class="tool-list"><button class={{ active: activeTool() === 'badge' }} onClick={() => selectTool('badge')}><span>◆</span><strong>Shields.io</strong></button></div>
            </section>
            <section class="tool-group profile-tools">
              <h3>Profile README</h3>
              <div class="tool-list">{PROFILE_TOOL_CATALOG.map((tool) => <button class={{ active: activeTool() === tool.id }} onClick={() => selectTool(tool.id)}><span>{tool.hint}</span><strong>{tool.label}</strong></button>)}</div>
            </section>
            <section class="tool-group">
              <h3>Utilities</h3>
              <div class="tool-list">
                <button class={{ active: activeTool() === 'toc' }} onClick={() => selectTool('toc')}><span>≡</span><strong>Table of contents</strong></button>
                <button class={{ active: activeTool() === 'tree' }} onClick={() => selectTool('tree')}><span>⌘</span><strong>Project tree</strong></button>
              </div>
            </section>
          </div>
          <div class="shortcut-card"><span>Quick keys</span><p><kbd>⌘</kbd><kbd>B</kbd> bold · <kbd>⌘</kbd><kbd>K</kbd> link</p></div>
        </aside>

        <main class="workbench">
          <div class="view-switcher workspace-switcher" aria-label="Workspace view">{(['editor', 'preview'] as const).map((mode) => <button class={{ active: panelMode() === mode }} onClick={() => setPanelMode(mode)}>{mode}</button>)}</div>
          <div class={['workspace', panelMode()]}>
            <section class={['editor-pane', { hidden: panelMode() === 'preview' }]}><textarea ref={(element) => { editor = element; editor.value = STARTER_README; }} onInput={(event) => setMarkdown(event.currentTarget.value)} onKeyDown={handleKeyboard} spellcheck={false} aria-label="Markdown editor" /></section>
            <section class={['preview-pane', { hidden: panelMode() === 'editor' }]}><div class="preview-scroll"><Show when={markdown().trim()} fallback={<div class="empty-state"><span>R/</span><h2>Your README starts here</h2><p>Write Markdown in the editor or import a file to see it rendered.</p></div>}><article class="markdown-body" innerHTML={renderedMarkdown()} /></Show></div></section>
          </div>
        </main>

        <aside class="inspector" aria-label="Document inspector">
          <div class="inspector-heading"><div><p class="eyebrow">Context</p><h2>Inspector</h2></div><span>{stats().words} words</span></div>
          <nav class="inspector-tabs" aria-label="Inspector sections">{(['tool', 'document', 'checks', 'export'] as const).map((tab) => <button class={{ active: inspectorTab() === tab }} onClick={() => setInspectorTab(tab)}>{tab}</button>)}</nav>
          <div class="inspector-content">
            <Show when={inspectorTab() === 'tool'}>
              <div aria-label="Tool options">
                <p class="eyebrow">Selected tool</p><h2>{activeToolTitle()}</h2>
                <Show when={activeInsertTool()} fallback={
                  <>
                    <Show when={isProfileTool(activeTool())}>
                      <ProfileInspector tool={activeTool() as ProfileToolId} onInsert={insertProfileMarkdown} onReplace={replaceWithProfileTemplate} />
                    </Show>
                    <Show when={activeTool() === 'badge'}>
                      <p class="inspector-description">Build a Shields.io badge and insert generated Markdown.</p>
                      <div class="preset-heading"><span>Badge sources</span><small>{SHIELD_BADGE_PRESETS.length} badges</small></div>
                      <div class="badge-preset-grid" aria-label="Badge presets">
                        {SHIELD_BADGE_PRESETS.map((preset) => <button class={['badge-preset', { active: selectedBadgePreset() === preset.id }]} aria-label={`${preset.name} badge preset`} aria-pressed={selectedBadgePreset() === preset.id ? 'true' : 'false'} onClick={() => applyBadgePreset(preset)}><img src={buildBadgeUrl(preset.options)} alt="" /><div><span>{preset.name}</span><small class={['badge-kind', preset.kind]}>{preset.kind === 'dynamic' ? 'Live' : 'Static'}</small></div></button>)}
                      </div>
                      <Show when={selectedShieldPreset()}>{(preset) => <p class="selected-preset-description"><strong>{preset().name}</strong>{preset().description}</p>}</Show>
                      <Show when={selectedShieldPreset()?.kind === 'dynamic'}>
                        <div class="badge-source-fields" aria-label="Badge source fields">
                          {selectedShieldPreset()?.fields.map((field) => <label>{shieldFieldMeta[field].label}<input value={shieldInputs()[field]} placeholder={shieldFieldMeta[field].placeholder} onInput={(event) => updateShieldInput(field, event.currentTarget.value)} /></label>)}
                        </div>
                      </Show>
                      <div class="badge-preview"><Show when={generatedBadgeUrl()} fallback={<div class="badge-preview-empty"><span>LIVE</span><p>Enter the source details to preview this badge.</p></div>}>{(url) => <img src={url()} alt="Generated badge preview" />}</Show></div>
                      <Show when={selectedShieldPreset()?.kind !== 'dynamic'}>
                        <label>Label<input value={badge().label} onInput={(event) => updateBadge('label', event.currentTarget.value)} /></label>
                        <label>Message<input value={badge().message} onInput={(event) => updateBadge('message', event.currentTarget.value)} /></label>
                        <label>Color<input value={badge().color} onInput={(event) => updateBadge('color', event.currentTarget.value)} /></label>
                        <label>Logo<input value={badge().logo} placeholder="github" onInput={(event) => updateBadge('logo', event.currentTarget.value)} /></label>
                      </Show>
                      <label>Style<select value={badge().style} onChange={(event) => updateBadge('style', event.currentTarget.value, selectedShieldPreset()?.kind === 'dynamic')}><option value="flat">Flat</option><option value="flat-square">Square</option><option value="for-the-badge">For the badge</option><option value="plastic">Plastic</option></select></label>
                      <label>Link (optional)<input value={badge().link} placeholder="https://…" onInput={(event) => updateBadge('link', event.currentTarget.value, selectedShieldPreset()?.kind === 'dynamic')} /></label>
                      <button class="wide-action" disabled={!generatedBadgeMarkdown()} onClick={insertGeneratedBadge}>Insert badge</button>
                    </Show>
                    <Show when={activeTool() === 'toc'}>
                      <p class="inspector-description">Generate linked navigation from the document’s H2–H6 headings.</p>
                      <pre class="snippet-preview">{generateTableOfContents(markdown()) || 'Add section headings to generate a TOC.'}</pre>
                      <button class="wide-action" onClick={insertToc}>Generate & insert</button>
                    </Show>
                    <Show when={activeTool() === 'tree'}>
                      <p class="inspector-description">Paste one project path per line.</p>
                      <label>Project paths<textarea class="path-editor" value={treePaths()} onInput={(event) => setTreePaths(event.currentTarget.value)} aria-label="Project file paths" /></label>
                      <button class="wide-action" onClick={insertTree}>Generate & insert</button>
                    </Show>
                  </>
                }>
                  {(tool) => <><p class="inspector-description">{tool().description}</p><pre class="snippet-preview">{tool().before}{tool().placeholder}{tool().after}</pre><button class="wide-action" onClick={() => applyInsertion(tool().before, tool().after, tool().placeholder)}>Insert at cursor</button></>}
                </Show>
              </div>
            </Show>

            <Show when={inspectorTab() === 'document'}>
              <p class="eyebrow">Structure</p><h2>Document</h2>
              <section class="stats-card" aria-label="Editor statistics"><div><strong>{stats().words}</strong><span>Words</span></div><div><strong>{stats().lines}</strong><span>Lines</span></div><div><strong>{stats().characters}</strong><span>Chars</span></div></section>
              <div class="outline"><h3>Outline</h3><Show when={outline().length} fallback={<p>No headings yet.</p>}>{outline().map((heading) => <div style={{ '--depth': heading.depth }}><span>H{heading.depth}</span>{heading.label}</div>)}</Show></div>
            </Show>

            <Show when={inspectorTab() === 'checks'}>
              <p class="eyebrow">README health</p><h2>Checks</h2><p class="inspector-description">Fast checks for common GitHub README issues.</p>
              <div class="check-list">{documentChecks().map((check) => <div class={{ passed: check.passed }}><span aria-hidden="true">{check.passed ? '✓' : '!'}</span><p><strong>{check.label}</strong><small>{check.detail}</small></p></div>)}</div>
            </Show>

            <Show when={inspectorTab() === 'export'}>
              <p class="eyebrow">Ready to ship</p><h2>Export</h2><p class="inspector-description">Download the README and any workflow files required by dynamic profile blocks.</p>
              <div class="export-file"><span>MD</span><div><strong>README.md</strong><small>UTF-8 · {stats().characters} characters</small></div></div>
              <button class="wide-action" onClick={downloadReadme}>Export README</button>
              <Show when={requiredProfileFiles().length}>
                <div class="workflow-files"><h3>Required workflows</h3>{requiredProfileFiles().map((file) => <button onClick={() => downloadFile(file.path.split('/').at(-1) ?? 'workflow.yml', file.content)}><span>YML</span><div><strong>{file.path}</strong><small>Download and keep this path in your repository.</small></div></button>)}</div>
              </Show>
              <div class="compatibility"><h3>GitHub compatible</h3><p>GFM tables, task lists, inline HTML, details blocks, images, and fenced code are supported.</p></div>
            </Show>
          </div>
        </aside>

        <button class="edge-toggle inspector-toggle" aria-label={inspectorCollapsed() ? 'Expand inspector' : 'Collapse inspector'} aria-expanded={inspectorCollapsed() ? 'false' : 'true'} onClick={() => setInspectorCollapsed((collapsed) => !collapsed)}><span aria-hidden="true">{inspectorCollapsed() ? '‹' : '›'}</span></button>
      </div>

      <Show when={draggingFile()}><div class="drop-overlay"><div><span>↓</span><strong>Drop your Markdown file</strong><small>.md and .markdown</small></div></div></Show>
    </div>
  );
}

export default App;
