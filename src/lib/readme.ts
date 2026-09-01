export interface InsertResult {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export interface BadgeOptions {
  readonly label: string;
  readonly message: string;
  readonly color: string;
  readonly style: string;
  readonly logo?: string;
  readonly link?: string;
}

export interface ShieldBadgePreset {
  readonly id: ShieldBadgePresetId;
  readonly name: string;
  readonly kind: 'static' | 'dynamic';
  readonly description: string;
  readonly fields: readonly ShieldBadgeInputKey[];
  readonly options: BadgeOptions;
}

export type ShieldBadgePresetId = 'build' | 'license' | 'version' | 'downloads' | 'coverage' | 'typescript' | 'bun' | 'docs' | 'discord' | 'stars';

export interface ShieldBadgeInputs {
  readonly repository: string;
  readonly workflow: string;
  readonly branch: string;
  readonly packageName: string;
  readonly discordServerId: string;
  readonly docsProject: string;
}

export type ShieldBadgeInputKey = keyof ShieldBadgeInputs;

export const DEFAULT_SHIELD_BADGE_INPUTS: ShieldBadgeInputs = {
  repository: '',
  workflow: '',
  branch: 'main',
  packageName: '',
  discordServerId: '',
  docsProject: '',
};

export const SHIELD_BADGE_PRESETS = [
  { id: 'build', name: 'Build', kind: 'dynamic', description: 'Live GitHub Actions workflow status.', fields: ['repository', 'workflow', 'branch'], options: { label: 'build', message: 'live', color: '2f855a', style: 'flat-square', logo: 'github' } },
  { id: 'license', name: 'License', kind: 'dynamic', description: 'License detected from a public GitHub repository.', fields: ['repository'], options: { label: 'license', message: 'live', color: '3b82f6', style: 'flat-square', logo: 'github' } },
  { id: 'version', name: 'Version', kind: 'dynamic', description: 'Latest GitHub release for a repository.', fields: ['repository'], options: { label: 'release', message: 'latest', color: 'e06c3b', style: 'flat-square', logo: 'github' } },
  { id: 'downloads', name: 'Downloads', kind: 'dynamic', description: 'Monthly downloads for an npm package.', fields: ['packageName'], options: { label: 'downloads', message: 'monthly', color: '7c3aed', style: 'flat-square', logo: 'npm' } },
  { id: 'coverage', name: 'Coverage', kind: 'dynamic', description: 'Live Codecov result for a public GitHub repository.', fields: ['repository'], options: { label: 'coverage', message: 'live', color: '2f855a', style: 'flat-square', logo: 'codecov' } },
  { id: 'typescript', name: 'TypeScript', kind: 'static', description: 'Static technology badge.', fields: [], options: { label: 'types', message: 'TypeScript', color: '3178c6', style: 'flat-square', logo: 'typescript' } },
  { id: 'bun', name: 'Bun', kind: 'static', description: 'Static runtime badge.', fields: [], options: { label: 'runtime', message: 'Bun', color: '14151a', style: 'flat-square', logo: 'bun' } },
  { id: 'docs', name: 'Docs', kind: 'dynamic', description: 'Current Read the Docs build status.', fields: ['docsProject'], options: { label: 'docs', message: 'live', color: '2563eb', style: 'flat-square', logo: 'readthedocs' } },
  { id: 'discord', name: 'Discord', kind: 'dynamic', description: 'Live Discord server member status.', fields: ['discordServerId'], options: { label: 'discord', message: 'live', color: '5865f2', style: 'flat-square', logo: 'discord' } },
  { id: 'stars', name: 'Stars', kind: 'dynamic', description: 'Current GitHub repository star count.', fields: ['repository'], options: { label: 'stars', message: 'live', color: 'd99a20', style: 'flat-square', logo: 'github' } },
] as const satisfies readonly ShieldBadgePreset[];

interface TreeNode {
  readonly children: Map<string, TreeNode>;
  isFile: boolean;
}

export function insertText(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after = '',
  placeholder = '',
): InsertResult {
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const inserted = `${before}${selected}${after}`;
  const contentStart = selectionStart + before.length;

  return {
    value: `${value.slice(0, selectionStart)}${inserted}${value.slice(selectionEnd)}`,
    selectionStart: contentStart,
    selectionEnd: contentStart + selected.length,
  };
}

function githubSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

export function generateTableOfContents(markdown: string): string {
  const headings: Array<{ depth: number; label: string; slug: string }> = [];
  const slugCounts = new Map<string, number>();
  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }

    if (fenced) continue;

    const match = /^(#{2,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const label = match[2].replace(/\[([^\]]+)]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
    const baseSlug = githubSlug(label);
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    headings.push({
      depth: match[1].length,
      label,
      slug: count === 0 ? baseSlug : `${baseSlug}-${count}`,
    });
  }

  if (headings.length === 0) return '';
  const minimumDepth = Math.min(...headings.map(({ depth }) => depth));

  return headings
    .map(({ depth, label, slug }) => `${'  '.repeat(depth - minimumDepth)}- [${label}](#${slug})`)
    .join('\n');
}

function createTreeNode(): TreeNode {
  return { children: new Map(), isFile: false };
}

export function generateProjectTree(paths: string): string {
  const root = createTreeNode();

  for (const rawPath of paths.split(/\r?\n/)) {
    const parts = rawPath.trim().replace(/^\.\//, '').split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      let child = current.children.get(part);
      if (!child) {
        child = createTreeNode();
        current.children.set(part, child);
      }
      current = child;
      current.isFile = index === parts.length - 1;
    });
  }

  const lines = ['.'];

  function visit(node: TreeNode, prefix: string): void {
    const entries = [...node.children.entries()].sort(([, left], [, right]) => {
      if (left.isFile !== right.isFile) return left.isFile ? 1 : -1;
      return 0;
    });

    entries.forEach(([name, child], index) => {
      const last = index === entries.length - 1;
      lines.push(`${prefix}${last ? '└──' : '├──'} ${name}`);
      visit(child, `${prefix}${last ? '    ' : '│   '}`);
    });
  }

  visit(root, '');
  return lines.join('\n');
}

export function buildBadgeUrl(options: BadgeOptions): string {
  const color = options.color.trim() || '4c7dff';
  const base = `https://img.shields.io/badge/${encodeURIComponent(options.label)}-${encodeURIComponent(options.message)}-${encodeURIComponent(color)}`;
  const query = new URLSearchParams({ style: options.style });
  if (options.logo?.trim()) query.set('logo', options.logo.trim());
  return `${base}?${query.toString()}`;
}

export function buildBadgeMarkdown(options: BadgeOptions): string {
  const image = `![${options.label}](${buildBadgeUrl(options)})`;
  return options.link?.trim() ? `[${image}](${options.link.trim()})` : image;
}

function parseRepository(value: string): readonly [string, string] | null {
  const normalized = value.trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '');
  const parts = normalized.split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) return null;
  return [encodeURIComponent(parts[0]), encodeURIComponent(parts[1])];
}

function withBadgeQuery(path: string, style: string, logo: string, extra?: Readonly<Record<string, string>>): string {
  const query = new URLSearchParams();
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value.trim()) query.set(key, value.trim());
  });
  query.set('style', style);
  query.set('logo', logo);
  return `https://img.shields.io/${path}?${query.toString()}`;
}

export function buildShieldPresetUrl(
  presetId: ShieldBadgePresetId,
  inputs: ShieldBadgeInputs,
  style: string,
): string | null {
  const repository = parseRepository(inputs.repository);
  const repositoryPath = repository?.join('/');

  switch (presetId) {
    case 'build':
      if (!repositoryPath || !inputs.workflow.trim()) return null;
      return withBadgeQuery(
        `github/actions/workflow/status/${repositoryPath}/${encodeURIComponent(inputs.workflow.trim())}`,
        style,
        'github',
        { branch: inputs.branch },
      );
    case 'license':
      return repositoryPath ? withBadgeQuery(`github/license/${repositoryPath}`, style, 'github') : null;
    case 'version':
      return repositoryPath ? withBadgeQuery(`github/v/release/${repositoryPath}`, style, 'github') : null;
    case 'downloads':
      return inputs.packageName.trim()
        ? withBadgeQuery(`npm/dm/${encodeURIComponent(inputs.packageName.trim())}`, style, 'npm')
        : null;
    case 'coverage':
      return repositoryPath ? withBadgeQuery(`codecov/c/github/${repositoryPath}`, style, 'codecov') : null;
    case 'docs':
      return inputs.docsProject.trim()
        ? withBadgeQuery(`readthedocs/${encodeURIComponent(inputs.docsProject.trim())}`, style, 'readthedocs')
        : null;
    case 'discord':
      return /^\d+$/.test(inputs.discordServerId.trim())
        ? withBadgeQuery(`discord/${inputs.discordServerId.trim()}`, style, 'discord')
        : null;
    case 'stars':
      return repositoryPath ? withBadgeQuery(`github/stars/${repositoryPath}`, style, 'github') : null;
    case 'typescript':
    case 'bun': {
      const preset = SHIELD_BADGE_PRESETS.find(({ id }) => id === presetId);
      return preset ? buildBadgeUrl({ ...preset.options, style }) : null;
    }
  }
}

export function buildShieldPresetMarkdown(
  presetId: ShieldBadgePresetId,
  inputs: ShieldBadgeInputs,
  style: string,
  link = '',
): string | null {
  const preset = SHIELD_BADGE_PRESETS.find(({ id }) => id === presetId);
  const url = buildShieldPresetUrl(presetId, inputs, style);
  if (!preset || !url) return null;
  const image = `![${preset.name}](${url})`;
  return link.trim() ? `[${image}](${link.trim()})` : image;
}
