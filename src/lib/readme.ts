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
