import { describe, expect, test } from 'bun:test';
import {
  ARCADE_GAMES,
  CAPSULE_SHAPES,
  PROFILE_TOOL_CATALOG,
  PROFILE_TEMPLATES,
  SOCIAL_PLATFORMS,
  TECH_PROVIDERS,
  buildArcadeMarkdown,
  buildCapsuleMarkdown,
  buildGitHubStatsMarkdown,
  buildImageMarkdown,
  buildMediumMarkdown,
  buildProfileViewsMarkdown,
  buildSnakeMarkdown,
  buildSocialLinksMarkdown,
  buildTechStackMarkdown,
  buildTextMarkdown,
  getRequiredProfileFiles,
} from './profile';

describe('profile README generators', () => {
  test('exposes the complete profile builder catalog without Spotify', () => {
    expect(PROFILE_TOOL_CATALOG.map(({ id }) => id)).toEqual([
      'profile-template',
      'profile-image',
      'profile-text',
      'tech-stack',
      'social-links',
      'github-stats',
      'profile-views',
      'snake',
      'arcade',
      'medium',
      'capsule',
    ]);
    expect(ARCADE_GAMES.map(({ id }) => id)).toEqual([
      'pacman',
      'breakout',
      'galaga',
      'puzzle-bobble',
      'bomberman',
    ]);
    expect(CAPSULE_SHAPES).toContain('waving');
    expect(CAPSULE_SHAPES).toContain('transparent');
    expect(TECH_PROVIDERS).toEqual(['skill-icons', 'devicons', 'simple-icons', 'shields']);
    expect(SOCIAL_PLATFORMS.length).toBeGreaterThanOrEqual(35);
    expect(PROFILE_TEMPLATES).toHaveLength(4);
    expect(JSON.stringify({ ARCADE_GAMES, PROFILE_TEMPLATES, SOCIAL_PLATFORMS })).not.toMatch(/spotify/i);
  });

  test('builds configurable image and semantic text blocks', () => {
    expect(buildImageMarkdown({
      url: 'https://example.com/demo.gif',
      alt: 'Demo animation',
      height: 180,
      align: 'center',
    })).toContain('<img src="https://example.com/demo.gif" alt="Demo animation" height="180" />');

    expect(buildTextMarkdown({ text: 'Hello world', tag: 'h2', align: 'right' })).toBe(
      '<h2 align="right">Hello world</h2>',
    );
  });

  test('builds technology stacks for icon and badge providers', () => {
    expect(buildTechStackMarkdown({
      technologies: ['typescript', 'solidjs', 'bun'],
      provider: 'skill-icons',
      align: 'center',
    })).toContain('skillicons.dev/icons?i=typescript%2Csolidjs%2Cbun');

    const shields = buildTechStackMarkdown({
      technologies: ['TypeScript', 'Bun'],
      provider: 'shields',
      align: 'left',
    });
    expect(shields).toContain('img.shields.io/badge/TypeScript');
    expect(shields).toContain('img.shields.io/badge/Bun');
  });

  test('builds linked social icons from supplied profile URLs', () => {
    const markdown = buildSocialLinksMarkdown({
      links: {
        github: 'https://github.com/octocat',
        linkedin: 'https://linkedin.com/in/octocat',
      },
      align: 'center',
      style: 'icons',
    });

    expect(markdown).toContain('https://github.com/octocat');
    expect(markdown).toContain('cdn.simpleicons.org/github');
    expect(markdown).toContain('cdn.simpleicons.org/linkedin');
  });

  test('builds all dynamic GitHub statistics cards', () => {
    const markdown = buildGitHubStatsMarkdown({
      username: 'octocat',
      cards: ['stats', 'languages', 'streak', 'trophy', 'activity'],
      theme: 'dracula',
      locale: 'en',
      hideBorder: true,
      hideTitle: false,
      languagesCount: 7,
      align: 'center',
    });

    expect(markdown).toContain('github-readme-stats.vercel.app/api?username=octocat');
    expect(markdown).toContain('github-readme-streak-stats.herokuapp.com');
    expect(markdown).toContain('github-profile-trophy.vercel.app');
    expect(markdown).toContain('github-readme-activity-graph.vercel.app');
    expect(markdown).toContain('langs_count=7');
  });

  test('builds profile views, Medium articles, and capsule banners', () => {
    expect(buildProfileViewsMarkdown({
      username: 'octocat',
      provider: 'laobi',
      label: 'Profile views',
      leftColor: '555555',
      rightColor: 'ed6338',
      align: 'center',
    })).toContain('visitor-badge.laobi.icu/badge?page_id=octocat.octocat');

    expect(buildMediumMarkdown({ username: 'octocat', count: 3, theme: 'dark', align: 'center' }))
      .toContain('medium/@octocat/2');

    const capsule = buildCapsuleMarkdown({
      type: 'waving',
      section: 'header',
      height: 140,
      theme: 'cobalt',
      color: '',
      text: 'Hello',
      description: 'Readme Studio',
      animation: 'fadeIn',
      fontColor: 'ffffff',
      fontSize: 52,
      reverse: false,
    });
    expect(capsule).toContain('capsule-render.vercel.app/api?');
    expect(capsule).toContain('text=Hello');
    expect(capsule).toContain('desc=Readme+Studio');
  });

  test('builds contribution animations and derives required workflow files from Markdown', () => {
    const markdown = [
      buildSnakeMarkdown('octocat'),
      buildArcadeMarkdown('octocat', 'galaga'),
    ].join('\n\n');
    const files = getRequiredProfileFiles(markdown);

    expect(markdown).toContain('readme-studio:snake username=octocat');
    expect(markdown).toContain('readme-studio:arcade username=octocat game=galaga');
    expect(files.map(({ path }) => path)).toEqual([
      '.github/workflows/snake.yml',
      '.github/workflows/arcade.yml',
    ]);
    expect(files[0].content).toContain('Platane/snk/svg-only@v3');
    expect(files[1].content).toContain("games: 'galaga'");
  });
});
