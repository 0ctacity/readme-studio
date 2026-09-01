import { describe, expect, test } from 'bun:test';
import {
  mapLevelToScore,
  parseWeeksToMatrix,
  setCachedContributions,
  getCachedContributions,
} from './contributions';

describe('Contributions helper', () => {
  test('maps level strings and numbers to 0-4 scale', () => {
    expect(mapLevelToScore('NONE')).toBe(0);
    expect(mapLevelToScore('FIRST_QUARTILE')).toBe(1);
    expect(mapLevelToScore('SECOND_QUARTILE')).toBe(2);
    expect(mapLevelToScore('THIRD_QUARTILE')).toBe(3);
    expect(mapLevelToScore('FOURTH_QUARTILE')).toBe(4);
    expect(mapLevelToScore('4')).toBe(4);
  });

  test('parses weeks data into 50x7 contribution matrix', () => {
    const mockWeeks = Array.from({ length: 52 }, (_, weekIndex) => ({
      contributionDays: Array.from({ length: 7 }, (_, dayIndex) => ({
        contributionLevel: weekIndex % 2 === 0 ? 'SECOND_QUARTILE' : 'FOURTH_QUARTILE',
        count: dayIndex * 2,
      })),
    }));

    const matrix = parseWeeksToMatrix(mockWeeks);
    expect(matrix.length).toBe(50);
    expect(matrix[0].length).toBe(7);
    expect(matrix[0][0]).toBe(2);
    expect(matrix[1][0]).toBe(4);
  });

  test('caches and retrieves contribution matrix', () => {
    const sampleMatrix = [[1, 2, 3, 4, 0, 1, 2]];
    setCachedContributions('testuser', sampleMatrix);
    expect(getCachedContributions('testuser')).toEqual(sampleMatrix);
    expect(getCachedContributions('TESTUSER')).toEqual(sampleMatrix);
  });
});
