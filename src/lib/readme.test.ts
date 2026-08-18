import { describe, expect, test } from 'bun:test';
import {
  buildBadgeMarkdown,
  generateProjectTree,
  generateTableOfContents,
  insertText,
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
});
