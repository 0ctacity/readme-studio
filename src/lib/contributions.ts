export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  readonly level: ContributionLevel;
  readonly count: number;
}

export type ContributionMatrix = number[][]; // 50-53 columns x 7 rows

const contributionCache = new Map<string, ContributionMatrix>();

export function mapLevelToScore(levelString: string): number {
  switch (levelString) {
    case 'FOURTH_QUARTILE':
    case '4':
      return 4;
    case 'THIRD_QUARTILE':
    case '3':
      return 3;
    case 'SECOND_QUARTILE':
    case '2':
      return 2;
    case 'FIRST_QUARTILE':
    case '1':
      return 1;
    default:
      return 0;
  }
}

export function parseWeeksToMatrix(
  weeks: readonly { readonly contributionDays: readonly { readonly contributionLevel?: string; readonly count?: number }[] }[],
): ContributionMatrix {
  const matrix: number[][] = [];
  // Take last 50 weeks for clean rendering
  const slicedWeeks = weeks.slice(-50);

  for (const week of slicedWeeks) {
    const col: number[] = [];
    for (let r = 0; r < 7; r++) {
      const day = week.contributionDays?.[r];
      if (!day) {
        col.push(0);
      } else if (day.contributionLevel) {
        col.push(mapLevelToScore(day.contributionLevel));
      } else if (typeof day.count === 'number') {
        if (day.count === 0) col.push(0);
        else if (day.count < 3) col.push(1);
        else if (day.count < 6) col.push(2);
        else if (day.count < 10) col.push(3);
        else col.push(4);
      } else {
        col.push(0);
      }
    }
    matrix.push(col);
  }

  return matrix;
}

export async function fetchRealGitHubContributions(
  username: string,
  token?: string,
): Promise<ContributionMatrix | null> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) return null;

  if (contributionCache.has(cleanUsername)) {
    return contributionCache.get(cleanUsername)!;
  }

  // Strategy 1: Fetch via GitHub GraphQL API if user has a session token
  if (token) {
    try {
      const graphqlQuery = {
        query: `
          query($login: String!) {
            user(login: $login) {
              contributionsCollection {
                contributionCalendar {
                  weeks {
                    contributionDays {
                      contributionLevel
                      contributionCount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { login: cleanUsername },
      };

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'readme-studio',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          data?: {
            user?: {
              contributionsCollection?: {
                contributionCalendar?: {
                  weeks?: { contributionDays: { contributionLevel: string; contributionCount: number }[] }[];
                };
              };
            };
          };
        };

        const weeks = result.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
        if (weeks && Array.isArray(weeks) && weeks.length > 0) {
          const matrix = parseWeeksToMatrix(weeks);
          contributionCache.set(cleanUsername, matrix);
          return matrix;
        }
      }
    } catch {
      // Fall through to public proxy strategy
    }
  }

  // Strategy 2: Fetch via public GitHub contribution aggregator API
  try {
    const publicUrl = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(cleanUsername)}?y=last`;
    const response = await fetch(publicUrl);
    if (response.ok) {
      const data = (await response.json()) as {
        contributions?: { date: string; count: number; level: number }[];
      };
      if (data.contributions && Array.isArray(data.contributions) && data.contributions.length > 0) {
        // Group into weeks of 7 days
        const weeks: { contributionDays: { count: number; contributionLevel: string }[] }[] = [];
        let currentWeek: { count: number; contributionLevel: string }[] = [];

        for (const item of data.contributions) {
          currentWeek.push({ count: item.count, contributionLevel: String(item.level) });
          if (currentWeek.length === 7) {
            weeks.push({ contributionDays: currentWeek });
            currentWeek = [];
          }
        }
        if (currentWeek.length > 0) {
          weeks.push({ contributionDays: currentWeek });
        }

        const matrix = parseWeeksToMatrix(weeks);
        contributionCache.set(cleanUsername, matrix);
        return matrix;
      }
    }
  } catch {
    // Fail silently and return null for fallback
  }

  return null;
}

export function getCachedContributions(username: string): ContributionMatrix | null {
  return contributionCache.get(username.trim().toLowerCase()) ?? null;
}

export function setCachedContributions(username: string, matrix: ContributionMatrix): void {
  contributionCache.set(username.trim().toLowerCase(), matrix);
}
