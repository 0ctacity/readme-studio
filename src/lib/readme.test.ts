import { describe, expect, test } from 'bun:test';
import {
  buildBadgeMarkdown,
  buildShieldPresetMarkdown,
  buildShieldPresetUrl,
  generateProjectTree,
  generateTableOfContents,
  insertText,
  SHIELD_BADGE_PRESETS,
} from './readme';

describe('README helpers', () => {
  test('inserts text around the current selection', () => {
    expect(insertText('hello world', 6, 11, '**', '**')).toEqual({
      value: 'hello **world**',
      selectionStart: 8,
      selectionEnd: 13,
    });
  });

  test('generates a GitHub-compatible table of contents with duplicate slugs', () => {
    const markdown = '# Project\n\n## Install & setup\n\n## Install & setup\n\n```md\n## Ignore me\n```';

    expect(generateTableOfContents(markdown)).toBe(
      '- [Install & setup](#install--setup)\n- [Install & setup](#install--setup-1)',
    );
  });

  test('builds a project tree from file paths', () => {
    expect(generateProjectTree('src/App.tsx\nsrc/lib/readme.ts\nREADME.md')).toBe(
      '.\n├── src\n│   ├── lib\n│   │   └── readme.ts\n│   └── App.tsx\n└── README.md',
    );
  });

  test('encodes shields badge input and creates linked markdown', () => {
    expect(
      buildBadgeMarkdown({
        label: 'build status',
        message: 'passing now',
        color: '#2f855a',
        style: 'flat-square',
        logo: 'github',
        link: 'https://example.com/actions',
      }),
    ).toBe(
      '[![build status](https://img.shields.io/badge/build%20status-passing%20now-%232f855a?style=flat-square&logo=github)](https://example.com/actions)',
    );
  });

  test('offers a varied set of editable Shields.io badge presets', () => {
    const labels = SHIELD_BADGE_PRESETS.map((preset) => preset.options.label);

    expect(SHIELD_BADGE_PRESETS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(SHIELD_BADGE_PRESETS.map((preset) => preset.id)).size).toBe(SHIELD_BADGE_PRESETS.length);
    expect(labels).toContain('license');
    expect(labels).toContain('coverage');
    expect(labels).toContain('downloads');
  });

  test('builds live Shields.io URLs from service-specific inputs', () => {
    const inputs = {
      repository: 'actions/toolkit',
      workflow: 'unit-tests.yml',
      branch: 'main',
      packageName: 'vite',
      discordServerId: '308323056592486420',
      docsProject: 'pip',
    };

    expect(buildShieldPresetUrl('build', inputs, 'flat-square')).toBe(
      'https://img.shields.io/github/actions/workflow/status/actions/toolkit/unit-tests.yml?branch=main&style=flat-square&logo=github',
    );
    expect(buildShieldPresetUrl('license', inputs, 'flat-square')).toBe(
      'https://img.shields.io/github/license/actions/toolkit?style=flat-square&logo=github',
    );
    expect(buildShieldPresetUrl('downloads', inputs, 'flat-square')).toBe(
      'https://img.shields.io/npm/dm/vite?style=flat-square&logo=npm',
    );
    expect(buildShieldPresetUrl('coverage', inputs, 'flat-square')).toBe(
      'https://img.shields.io/codecov/c/github/actions/toolkit?style=flat-square&logo=codecov',
    );
    expect(buildShieldPresetUrl('docs', inputs, 'flat-square')).toBe(
      'https://img.shields.io/readthedocs/pip?style=flat-square&logo=readthedocs',
    );
  });

  test('requires valid live badge inputs and builds linked Markdown', () => {
    const inputs = {
      repository: 'actions/toolkit',
      workflow: 'unit-tests.yml',
      branch: '',
      packageName: '',
      discordServerId: '',
      docsProject: '',
    };

    expect(buildShieldPresetUrl('stars', { ...inputs, repository: 'invalid' }, 'flat-square')).toBeNull();
    expect(buildShieldPresetMarkdown('stars', inputs, 'flat-square', 'https://github.com/actions/toolkit')).toBe(
      '[![Stars](https://img.shields.io/github/stars/actions/toolkit?style=flat-square&logo=github)](https://github.com/actions/toolkit)',
    );
  });
});
