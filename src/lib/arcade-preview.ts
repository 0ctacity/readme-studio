import type { ArcadeGame } from './profile';

export interface GamePreviewOptions {
  username?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
  matrix?: number[][];
}

// Generate realistic pseudo-matrix fallback when real data is unavailable
export function generateMatrix(seed = 'octocat'): number[][] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const matrix: number[][] = [];
  for (let c = 0; c < 50; c++) {
    const col: number[] = [];
    for (let r = 0; r < 7; r++) {
      const pseudo = Math.abs(Math.sin((hash + c * 7 + r * 13) * 0.123));
      if (pseudo < 0.35) col.push(0);
      else if (pseudo < 0.65) col.push(1);
      else if (pseudo < 0.85) col.push(2);
      else if (pseudo < 0.95) col.push(3);
      else col.push(4);
    }
    matrix.push(col);
  }
  return matrix;
}

const PALETTE_DARK = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const PALETTE_LIGHT = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function renderGridCells(matrix: number[][], palette: string[], cellSize = 12, cellGap = 3): string {
  let cells = '';
  for (let c = 0; c < matrix.length; c++) {
    for (let r = 0; r < 7; r++) {
      const x = 20 + c * (cellSize + cellGap);
      const y = 20 + r * (cellSize + cellGap);
      const level = Math.min(4, Math.max(0, matrix[c]?.[r] ?? 0));
      const color = palette[level];
      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${color}" />`;
    }
  }
  return cells;
}

export function generateSnakeSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes snakeWalk {
        0% { transform: translate(30px, 20px); }
        20% { transform: translate(250px, 20px); }
        35% { transform: translate(250px, 65px); }
        55% { transform: translate(500px, 65px); }
        70% { transform: translate(500px, 95px); }
        85% { transform: translate(720px, 95px); }
        95% { transform: translate(720px, 20px); }
        100% { transform: translate(30px, 20px); }
      }
      .snake-head { fill: #70d7ff; animation: snakeWalk 12s infinite linear; }
      .snake-body1 { fill: #40c463; animation: snakeWalk 12s infinite linear; animation-delay: -0.15s; }
      .snake-body2 { fill: #30a14e; animation: snakeWalk 12s infinite linear; animation-delay: -0.3s; }
      .snake-body3 { fill: #216e39; animation: snakeWalk 12s infinite linear; animation-delay: -0.45s; }
      .snake-body4 { fill: #0e4429; animation: snakeWalk 12s infinite linear; animation-delay: -0.6s; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Animated Snake Body -->
  <rect class="snake-body4" width="12" height="12" rx="3" />
  <rect class="snake-body3" width="12" height="12" rx="3" />
  <rect class="snake-body2" width="12" height="12" rx="3" />
  <rect class="snake-body1" width="12" height="12" rx="3" />
  <rect class="snake-head" width="12" height="12" rx="3" />
  <text x="20" y="152" class="label">🐍 ${user}'s contribution snake</text>
</svg>`;
}

export function generatePacmanSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes pacmanMove {
        0% { transform: translate(20px, 65px); }
        48% { transform: translate(740px, 65px) scaleX(1); }
        50% { transform: translate(740px, 65px) scaleX(-1); }
        98% { transform: translate(20px, 65px) scaleX(-1); }
        100% { transform: translate(20px, 65px) scaleX(1); }
      }
      .pacman { animation: pacmanMove 10s infinite linear; fill: #ffd700; transform-origin: center; }
      .ghost-red { animation: pacmanMove 10s infinite linear; animation-delay: -0.35s; fill: #ff4d4d; }
      .ghost-blue { animation: pacmanMove 10s infinite linear; animation-delay: -0.7s; fill: #4deeea; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Ghosts & Pac-Man -->
  <g class="ghost-blue">
    <path d="M 0,0 C 0,-7 14,-7 14,0 L 14,8 L 10,6 L 7,8 L 4,6 L 0,8 Z" />
    <circle cx="4" cy="0" r="2" fill="#ffffff"/><circle cx="4" cy="0" r="1" fill="#0000ff"/>
    <circle cx="10" cy="0" r="2" fill="#ffffff"/><circle cx="10" cy="0" r="1" fill="#0000ff"/>
  </g>
  <g class="ghost-red">
    <path d="M 0,0 C 0,-7 14,-7 14,0 L 14,8 L 10,6 L 7,8 L 4,6 L 0,8 Z" />
    <circle cx="4" cy="0" r="2" fill="#ffffff"/><circle cx="4" cy="0" r="1" fill="#0000ff"/>
    <circle cx="10" cy="0" r="2" fill="#ffffff"/><circle cx="10" cy="0" r="1" fill="#0000ff"/>
  </g>
  <g class="pacman">
    <circle cx="7" cy="3" r="8" />
  </g>
  <text x="20" y="152" class="label">🕹️ PAC-MAN • ${user}'s contribution arena</text>
</svg>`;
}

export function generateBreakoutSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes paddleMove {
        0% { transform: translateX(200px); }
        50% { transform: translateX(550px); }
        100% { transform: translateX(200px); }
      }
      @keyframes ballBounce {
        0% { transform: translate(220px, 125px); }
        25% { transform: translate(380px, 25px); }
        50% { transform: translate(570px, 125px); }
        75% { transform: translate(410px, 25px); }
        100% { transform: translate(220px, 125px); }
      }
      .paddle { fill: #ff7b72; animation: paddleMove 6s infinite ease-in-out; }
      .ball { fill: #ffffff; animation: ballBounce 6s infinite linear; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <rect class="paddle" y="128" width="50" height="6" rx="3" />
  <circle class="ball" r="4" />
  <text x="20" y="152" class="label">🏓 BREAKOUT • ${user}'s contribution arena</text>
</svg>`;
}

export function generateGalagaSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes shipSweep {
        0% { transform: translateX(80px); }
        50% { transform: translateX(680px); }
        100% { transform: translateX(80px); }
      }
      @keyframes laserFire {
        0% { transform: translate(0, 0); opacity: 1; }
        100% { transform: translate(0, -110px); opacity: 0; }
      }
      .ship { fill: #58a6ff; animation: shipSweep 7s infinite ease-in-out; }
      .laser { fill: #f0883e; animation: laserFire 0.8s infinite linear; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <g class="ship">
    <polygon points="0,135 7,120 14,135 7,130" />
    <rect class="laser" x="6" y="118" width="2" height="6" rx="1"/>
  </g>
  <text x="20" y="152" class="label">🚀 GALAGA • ${user}'s contribution arena</text>
</svg>`;
}

export function generatePuzzleBobbleSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes bubbleShoot {
        0% { transform: translate(395px, 135px); }
        50% { transform: translate(320px, 30px); }
        100% { transform: translate(395px, 135px); }
      }
      .bubble { fill: #bc8cff; animation: bubbleShoot 4s infinite ease-in-out; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <circle class="bubble" r="6" />
  <text x="20" y="152" class="label">🫧 PUZZLE BOBBLE • ${user}'s contribution arena</text>
</svg>`;
}

export function generateBombermanSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = options.matrix ?? generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; font-weight: 600; }
      @keyframes bomberWalk {
        0% { transform: translate(40px, 30px); }
        25% { transform: translate(40px, 95px); }
        50% { transform: translate(700px, 95px); }
        75% { transform: translate(700px, 30px); }
        100% { transform: translate(40px, 30px); }
      }
      @keyframes bombPulse {
        0%, 100% { transform: scale(1); fill: #1f2328; }
        50% { transform: scale(1.3); fill: #ff4444; }
      }
      .bomber { animation: bomberWalk 12s infinite linear; fill: #ffffff; }
      .bomb { transform-origin: 200px 95px; animation: bombPulse 1.5s infinite; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <circle class="bomb" cx="200" cy="95" r="7" />
  <g class="bomber">
    <circle cx="0" cy="0" r="6" />
    <rect x="-4" y="6" width="8" height="9" rx="2" fill="#3fb950" />
  </g>
  <text x="20" y="152" class="label">💣 BOMBERMAN • ${user}'s contribution arena</text>
</svg>`;
}

export function getGameSvg(game: ArcadeGame | 'snake', options: GamePreviewOptions = {}): string {
  switch (game) {
    case 'snake':
      return generateSnakeSvg(options);
    case 'pacman':
      return generatePacmanSvg(options);
    case 'breakout':
      return generateBreakoutSvg(options);
    case 'galaga':
      return generateGalagaSvg(options);
    case 'puzzle-bobble':
      return generatePuzzleBobbleSvg(options);
    case 'bomberman':
      return generateBombermanSvg(options);
    default:
      return generateSnakeSvg(options);
  }
}

export function getGameDataUri(game: ArcadeGame | 'snake', options: GamePreviewOptions = {}): string {
  const svg = getGameSvg(game, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
