export type Alignment = 'left' | 'center' | 'right';
export type TechProvider = 'skill-icons' | 'devicons' | 'simple-icons' | 'shields';
export type StatsCard = 'stats' | 'languages' | 'streak' | 'trophy' | 'activity';
export type ProfileViewProvider = 'laobi' | 'getloli';
export type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

export const TECH_PROVIDERS = ['skill-icons', 'devicons', 'simple-icons', 'shields'] as const;

export const ARCADE_GAMES = [
  { id: 'pacman', label: 'Pac-Man' },
  { id: 'breakout', label: 'Breakout' },
  { id: 'galaga', label: 'Galaga' },
  { id: 'puzzle-bobble', label: 'Puzzle Bobble' },
  { id: 'bomberman', label: 'Bomberman' },
] as const;

export type ArcadeGame = (typeof ARCADE_GAMES)[number]['id'];

export const CAPSULE_SHAPES = [
  'wave',
  'egg',
  'shark',
  'slice',
  'rect',
  'soft',
  'rounded',
  'cylinder',
  'waving',
  'venom',
  'speech',
  'transparent',
  'blur',
] as const;

export type CapsuleShape = (typeof CAPSULE_SHAPES)[number];

export const SOCIAL_PLATFORMS = [
  { id: 'behance', label: 'Behance' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'codesandbox', label: 'CodeSandbox' },
  { id: 'codepen', label: 'CodePen' },
  { id: 'devdotto', label: 'Dev.to' },
  { id: 'discord', label: 'Discord' },
  { id: 'dribbble', label: 'Dribbble' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'hackerrank', label: 'HackerRank' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'itchdotio', label: 'Itch.io' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'linktree', label: 'Linktree' },
  { id: 'medium', label: 'Medium' },
  { id: 'microsoftoutlook', label: 'Outlook' },
  { id: 'patreon', label: 'Patreon' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'stackoverflow', label: 'Stack Overflow' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'x', label: 'X' },
  { id: 'unsplash', label: 'Unsplash' },
  { id: 'visualstudio', label: 'Visual Studio' },
  { id: 'wechat', label: 'WeChat' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tutanota', label: 'Tuta' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'kofi', label: 'Ko-fi' },
  { id: 'signal', label: 'Signal' },
  { id: 'slack', label: 'Slack' },
  { id: 'tryhackme', label: 'TryHackMe' },
  { id: 'github', label: 'GitHub' },
  { id: 'mastodon', label: 'Mastodon' },
  { id: 'hashnode', label: 'Hashnode' },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]['id'];

export interface GeneratedProfileFile {
  readonly path: string;
  readonly content: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').replace(/[^\w-]/g, '');
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9+#.-]/g, '');
}

function aligned(content: string, align: Alignment): string {
  return `<div align="${align}">\n${content}\n</div>`;
}

export function buildImageMarkdown(options: {
  readonly url: string;
  readonly alt: string;
  readonly height: number;
  readonly align: Alignment;
}): string {
  const url = escapeHtml(options.url.trim());
  if (!url) return '';
  const height = Math.max(1, Math.round(options.height));
  return aligned(`<img src="${url}" alt="${escapeHtml(options.alt.trim())}" height="${height}" />`, options.align);
}

export function buildTextMarkdown(options: {
  readonly text: string;
  readonly tag: TextTag;
  readonly align: Alignment;
}): string {
  return `<${options.tag} align="${options.align}">${escapeHtml(options.text)}</${options.tag}>`;
}

export function buildTechStackMarkdown(options: {
  readonly technologies: readonly string[];
  readonly provider: TechProvider;
  readonly align: Alignment;
}): string {
  const technologies = options.technologies
    .map((technology) => ({ label: technology.trim(), slug: normalizeSlug(technology) }))
    .filter(({ slug }) => Boolean(slug));
  if (technologies.length === 0) return '';

  if (options.provider === 'skill-icons') {
    const icons = encodeURIComponent(technologies.map(({ slug }) => slug).join(','));
    return aligned(`<img src="https://skillicons.dev/icons?i=${icons}" alt="Technology stack" />`, options.align);
  }

  const images = technologies.map(({ label, slug }) => {
    if (options.provider === 'devicons') {
      return `<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg" height="40" alt="${escapeHtml(label)} logo" />`;
    }
    if (options.provider === 'simple-icons') {
      return `<img src="https://cdn.simpleicons.org/${encodeURIComponent(slug)}" height="40" alt="${escapeHtml(label)} logo" />`;
    }
    return `<img src="https://img.shields.io/badge/${encodeURIComponent(label)}-202722?style=for-the-badge&logo=${encodeURIComponent(slug)}&logoColor=white" alt="${escapeHtml(label)} badge" />`;
  });

  return aligned(images.join('\n'), options.align);
}

export function buildSocialLinksMarkdown(options: {
  readonly links: Readonly<Partial<Record<SocialPlatformId, string>>>;
  readonly align: Alignment;
  readonly style: 'icons' | 'badges';
}): string {
  const links = SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = options.links[platform.id]?.trim();
    if (!url) return [];
    const icon = options.style === 'badges'
      ? `https://img.shields.io/badge/${encodeURIComponent(platform.label)}-202722?style=for-the-badge&logo=${encodeURIComponent(platform.id)}&logoColor=white`
      : `https://cdn.simpleicons.org/${encodeURIComponent(platform.id)}`;
    const size = options.style === 'badges' ? '' : ' height="34"';
    return [`<a href="${escapeHtml(url)}" target="_blank"><img src="${icon}"${size} alt="${escapeHtml(platform.label)}" /></a>`];
  });
  return links.length ? aligned(links.join('\n'), options.align) : '';
}

export function buildGitHubStatsMarkdown(options: {
  readonly username: string;
  readonly cards: readonly StatsCard[];
  readonly theme: string;
  readonly locale: string;
  readonly hideBorder: boolean;
  readonly hideTitle: boolean;
  readonly languagesCount: number;
  readonly align: Alignment;
}): string {
  const username = normalizeUsername(options.username);
  if (!username || options.cards.length === 0) return '';
  const common = new URLSearchParams({
    username,
    theme: options.theme || 'default',
    locale: options.locale || 'en',
    hide_border: String(options.hideBorder),
    hide_title: String(options.hideTitle),
  });
  const urls: Record<StatsCard, string> = {
    stats: `https://github-readme-stats.vercel.app/api?${common.toString()}&show_icons=true`,
    languages: `https://github-readme-stats.vercel.app/api/top-langs?${common.toString()}&layout=compact&langs_count=${Math.max(1, Math.round(options.languagesCount))}`,
    streak: `https://github-readme-streak-stats.herokuapp.com/?${common.toString()}`,
    trophy: `https://github-profile-trophy.vercel.app/?username=${encodeURIComponent(username)}&theme=${encodeURIComponent(options.theme || 'flat')}&no-frame=${String(options.hideBorder)}`,
    activity: `https://github-readme-activity-graph.vercel.app/graph?username=${encodeURIComponent(username)}&theme=${encodeURIComponent(options.theme || 'github-compact')}&hide_border=${String(options.hideBorder)}`,
  };
  const cards = [...new Set(options.cards)].map((card) => `<img src="${urls[card]}" alt="GitHub ${card}" />`);
  return `<!-- readme-studio:github-stats username=${username} -->\n${aligned(cards.join('\n'), options.align)}`;
}

export function buildProfileViewsMarkdown(options: {
  readonly username: string;
  readonly provider: ProfileViewProvider;
  readonly label: string;
  readonly leftColor: string;
  readonly rightColor: string;
  readonly align: Alignment;
}): string {
  const username = normalizeUsername(options.username);
  if (!username) return '';
  const url = options.provider === 'getloli'
    ? `https://count.getloli.com/get/@${encodeURIComponent(username)}?theme=rule34`
    : `https://visitor-badge.laobi.icu/badge?page_id=${encodeURIComponent(username)}.${encodeURIComponent(username)}&left_text=${encodeURIComponent(options.label || 'Profile views')}&left_color=${encodeURIComponent(options.leftColor || '555555')}&right_color=${encodeURIComponent(options.rightColor || 'ed6338')}`;
  return aligned(`<img src="${url}" alt="Profile views" />`, options.align);
}

export function buildMediumMarkdown(options: {
  readonly username: string;
  readonly count: number;
  readonly theme: string;
  readonly align: Alignment;
}): string {
  const username = options.username.trim().replace(/^@/, '');
  if (!username) return '';
  const count = Math.min(10, Math.max(1, Math.round(options.count)));
  const articles = Array.from({ length: count }, (_, index) => {
    const url = `https://github-readme-medium-recent-article.vercel.app/medium/@${encodeURIComponent(username)}/${index}?theme=${encodeURIComponent(options.theme || 'default')}`;
    return `<a href="${url}" target="_blank"><img src="${url}" alt="Medium article ${index + 1}" /></a>`;
  });
  return aligned(articles.join('\n'), options.align);
}

export function buildCapsuleMarkdown(options: {
  readonly type: CapsuleShape;
  readonly section: 'header' | 'footer';
  readonly height: number;
  readonly theme: string;
  readonly color: string;
  readonly text: string;
  readonly description: string;
  readonly animation: string;
  readonly fontColor: string;
  readonly fontSize: number;
  readonly reverse: boolean;
}): string {
  const query = new URLSearchParams({
    type: options.type,
    height: String(Math.max(40, Math.round(options.height))),
    section: options.section,
    reversal: String(options.reverse),
    text: options.text,
    desc: options.description,
    animation: options.animation,
    fontColor: options.fontColor.replace(/^#/, '') || 'ffffff',
    fontSize: String(Math.max(8, Math.round(options.fontSize))),
  });
  if (options.color.trim()) query.set('color', options.color.trim().replace(/^#/, ''));
  else query.set('theme', options.theme || 'cobalt');
  return `<img width="100%" src="https://capsule-render.vercel.app/api?${query.toString()}" alt="${escapeHtml(options.text || 'Profile banner')}" />`;
}

export function buildSnakeMarkdown(usernameValue: string): string {
  const username = normalizeUsername(usernameValue);
  if (!username) return '';
  return `<!-- readme-studio:snake username=${username} -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/snake-dark.svg">\n  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/snake.svg">\n  <img alt="Contribution snake" src="https://raw.githubusercontent.com/${username}/${username}/output/snake.svg">\n</picture>`;
}

export function buildArcadeMarkdown(usernameValue: string, game: ArcadeGame): string {
  const username = normalizeUsername(usernameValue);
  if (!username) return '';
  return `<!-- readme-studio:arcade username=${username} game=${game} -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/${game}-contribution-graph-dark.svg">\n  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/${game}-contribution-graph.svg">\n  <img alt="${game} contribution graph" src="https://raw.githubusercontent.com/${username}/${username}/output/${game}-contribution-graph.svg">\n</picture>`;
}

function snakeWorkflow(): string {
  return `name: generate contribution snake

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: Platane/snk/svg-only@v3
        with:
          github_user_name: \${{ github.repository_owner }}
          outputs: |
            dist/snake.svg
            dist/snake-dark.svg?palette=github-dark
      - uses: crazy-max/ghaction-github-pages@v4
        with:
          build_dir: dist
          branch: output
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

function arcadeWorkflow(games: readonly ArcadeGame[]): string {
  return `name: generate arcade contribution graphs

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: generate contribution graph SVGs
        uses: abozanona/pacman-contribution-graph@main
        with:
          github_user_name: \${{ github.repository_owner }}
          games: '${games.join(',')}'
      - name: push SVGs to the output branch
        uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

export function getRequiredProfileFiles(markdown: string): readonly GeneratedProfileFile[] {
  const files: GeneratedProfileFile[] = [];
  if (/<!--\s*readme-studio:snake\b/.test(markdown)) {
    files.push({ path: '.github/workflows/snake.yml', content: snakeWorkflow() });
  }
  const games = [...markdown.matchAll(/<!--\s*readme-studio:arcade\s+username=[\w-]+\s+game=([\w-]+)\s*-->/g)]
    .map((match) => match[1])
    .filter((game): game is ArcadeGame => ARCADE_GAMES.some(({ id }) => id === game));
  const uniqueGames = [...new Set(games)];
  if (uniqueGames.length) {
    files.push({ path: '.github/workflows/arcade.yml', content: arcadeWorkflow(uniqueGames) });
  }
  return files;
}

export const PROFILE_TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal developer',
    description: 'Introduction, stack, links, and core GitHub stats.',
    build: (username: string) => `# Hi, I'm ${normalizeUsername(username) || 'your-name'} 👋\n\nI build useful things for the web.\n\n## Tech stack\n\n${buildTechStackMarkdown({ technologies: ['typescript', 'javascript', 'html', 'css'], provider: 'skill-icons', align: 'left' })}\n\n## GitHub\n\n${buildGitHubStatsMarkdown({ username, cards: ['stats', 'languages'], theme: 'github_dark', locale: 'en', hideBorder: true, hideTitle: false, languagesCount: 6, align: 'left' })}`,
  },
  {
    id: 'visual',
    name: 'Visual profile',
    description: 'Capsule banner, icons, trophies, and contribution graph.',
    build: (username: string) => `${buildCapsuleMarkdown({ type: 'waving', section: 'header', height: 170, theme: 'cobalt', color: '', text: 'Welcome', description: 'Developer profile', animation: 'fadeIn', fontColor: 'ffffff', fontSize: 54, reverse: false })}\n\n${buildGitHubStatsMarkdown({ username, cards: ['trophy', 'activity'], theme: 'dracula', locale: 'en', hideBorder: true, hideTitle: false, languagesCount: 6, align: 'center' })}`,
  },
  {
    id: 'open-source',
    name: 'Open source',
    description: 'Project-focused profile with streak and activity.',
    build: (username: string) => `# Open-source work\n\nI enjoy building in public and collaborating on useful software.\n\n## Current activity\n\n${buildGitHubStatsMarkdown({ username, cards: ['stats', 'streak', 'activity'], theme: 'transparent', locale: 'en', hideBorder: true, hideTitle: false, languagesCount: 6, align: 'center' })}`,
  },
  {
    id: 'playful',
    name: 'Playful arcade',
    description: 'Animated contribution snake and arcade graph.',
    build: (username: string) => `# Welcome to my profile\n\n${buildSnakeMarkdown(username)}\n\n## Contribution arcade\n\n${buildArcadeMarkdown(username, 'pacman')}`,
  },
] as const;

export type ProfileTemplateId = (typeof PROFILE_TEMPLATES)[number]['id'];

export const PROFILE_TOOL_CATALOG = [
  { id: 'profile-template', label: 'Templates', hint: '▦' },
  { id: 'profile-image', label: 'Image / GIF', hint: '▧' },
  { id: 'profile-text', label: 'Profile text', hint: 'Aa' },
  { id: 'tech-stack', label: 'Tech stack', hint: '</>' },
  { id: 'social-links', label: 'Social links', hint: '@' },
  { id: 'github-stats', label: 'GitHub stats', hint: '↗' },
  { id: 'profile-views', label: 'Profile views', hint: '◉' },
  { id: 'snake', label: 'Contribution snake', hint: '〰' },
  { id: 'arcade', label: 'Arcade games', hint: '◆' },
  { id: 'medium', label: 'Medium articles', hint: 'M' },
  { id: 'capsule', label: 'Header / footer', hint: '◒' },
] as const;

export type ProfileToolId = (typeof PROFILE_TOOL_CATALOG)[number]['id'];
