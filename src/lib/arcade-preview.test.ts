import { describe, expect, test } from 'bun:test';
import {
  generateBreakoutSvg,
  generateGalagaSvg,
  generatePacmanSvg,
  generateSnakeSvg,
  getGameDataUri,
  getGameSvg,
} from './arcade-preview';

describe('arcade preview SVG generators', () => {
  test('generates animated SVGs for all games and snake', () => {
    const snake = generateSnakeSvg({ username: 'octocat', theme: 'dark' });
    expect(snake).toContain('<svg');
    expect(snake).toContain('snake-head');
    expect(snake).toContain('octocat');

    const pacman = generatePacmanSvg({ username: 'octocat', theme: 'dark' });
    expect(pacman).toContain('<svg');
    expect(pacman).toContain('pacman');

    const breakout = generateBreakoutSvg({ username: 'octocat', theme: 'light' });
    expect(breakout).toContain('<svg');
    expect(breakout).toContain('paddle');

    const galaga = generateGalagaSvg({ username: 'octocat', theme: 'dark' });
    expect(galaga).toContain('<svg');
    expect(galaga).toContain('ship');
  });

  test('supports custom contribution matrix for real activity', () => {
    const customMatrix = Array.from({ length: 50 }, () => [4, 4, 4, 4, 4, 4, 4]);
    const svg = generateSnakeSvg({ username: 'realuser', matrix: customMatrix });
    expect(svg).toContain('fill="#39d353"');
    expect(svg).toContain('realuser');
  });

  test('getGameSvg and getGameDataUri return expected format', () => {
    const svg = getGameSvg('bomberman', { username: 'testuser' });
    expect(svg).toContain('BOMBERMAN');

    const dataUri = getGameDataUri('pacman', { username: 'testuser' });
    expect(dataUri).toStartWith('data:image/svg+xml;utf8,');
    expect(dataUri).toContain('%3Csvg');
  });
});
