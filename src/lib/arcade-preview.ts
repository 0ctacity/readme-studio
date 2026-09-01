import type { ArcadeGame } from './profile';

export interface GamePreviewOptions {
  username?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

// Generate realistic contribution matrix (53 columns x 7 rows)
function generateMatrix(seed = 'octocat'): number[][] {
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
      const color = palette[matrix[c][r]];
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
  const matrix = generateMatrix(user);
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
  const matrix = generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
      @keyframes pacmanRun {
        0% { transform: translate(15px, 60px) scaleX(1); }
        48% { transform: translate(740px, 60px) scaleX(1); }
        50% { transform: translate(740px, 60px) scaleX(-1); }
        98% { transform: translate(15px, 60px) scaleX(-1); }
        100% { transform: translate(15px, 60px) scaleX(1); }
      }
      @keyframes ghostChase {
        0% { transform: translate(-30px, 60px) scaleX(1); }
        48% { transform: translate(690px, 60px) scaleX(1); }
        50% { transform: translate(690px, 60px) scaleX(-1); }
        98% { transform: translate(-30px, 60px) scaleX(-1); }
        100% { transform: translate(-30px, 60px) scaleX(1); }
      }
      .pacman { fill: #fde047; animation: pacmanRun 10s infinite linear; transform-origin: 10px 10px; }
      .ghost-red { fill: #ef4444; animation: ghostChase 10s infinite linear; transform-origin: 10px 10px; }
      .ghost-blue { fill: #38bdf8; animation: ghostChase 10s infinite linear; animation-delay: -0.4s; transform-origin: 10px 10px; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Pac-man -->
  <g class="pacman">
    <circle cx="8" cy="8" r="9" />
    <polygon points="8,8 18,2 18,14" fill="${bg}" />
  </g>
  <!-- Blinky Red Ghost -->
  <g class="ghost-red">
    <path d="M0,8 A8,8 0 0,1 16,8 L16,16 L12,13 L8,16 L4,13 L0,16 Z" />
    <circle cx="5" cy="6" r="1.8" fill="#fff" /><circle cx="11" cy="6" r="1.8" fill="#fff" />
    <circle cx="6" cy="6" r="0.9" fill="#000" /><circle cx="12" cy="6" r="0.9" fill="#000" />
  </g>
  <!-- Inky Blue Ghost -->
  <g class="ghost-blue">
    <path d="M0,8 A8,8 0 0,1 16,8 L16,16 L12,13 L8,16 L4,13 L0,16 Z" />
    <circle cx="5" cy="6" r="1.8" fill="#fff" /><circle cx="11" cy="6" r="1.8" fill="#fff" />
    <circle cx="6" cy="6" r="0.9" fill="#000" /><circle cx="12" cy="6" r="0.9" fill="#000" />
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
  const matrix = generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
      @keyframes paddleMove {
        0%, 100% { transform: translateX(80px); }
        50% { transform: translateX(580px); }
      }
      @keyframes ballBounce {
        0% { transform: translate(110px, 120px); }
        25% { transform: translate(260px, 25px); }
        50% { transform: translate(420px, 120px); }
        75% { transform: translate(580px, 30px); }
        100% { transform: translate(110px, 120px); }
      }
      .paddle { fill: #f97316; animation: paddleMove 6s infinite ease-in-out; }
      .ball { fill: #38bdf8; animation: ballBounce 6s infinite linear; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Breakout / Ping Pong Paddle -->
  <rect class="paddle" y="125" width="70" height="7" rx="3.5" />
  <!-- Bouncing Ball -->
  <circle class="ball" r="5" />
  <text x="20" y="152" class="label">🏓 BREAKOUT • ${user}'s contribution blocks</text>
</svg>`;
}

export function generateGalagaSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
      @keyframes shipStrafe {
        0%, 100% { transform: translateX(60px); }
        50% { transform: translateX(660px); }
      }
      @keyframes laserFire {
        0% { transform: translateY(0px); opacity: 1; }
        100% { transform: translateY(-110px); opacity: 0; }
      }
      .starship { animation: shipStrafe 7s infinite ease-in-out; }
      .laser { fill: #ec4899; animation: laserFire 0.8s infinite linear; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Galaga Ship -->
  <g class="starship" transform="translate(0, 115)">
    <polygon points="12,0 0,18 24,18" fill="#ffffff" />
    <polygon points="12,4 6,16 18,16" fill="#3b82f6" />
    <rect class="laser" x="11" y="-5" width="2" height="10" rx="1" />
  </g>
  <text x="20" y="152" class="label">🚀 GALAGA • ${user}'s contribution galaxy</text>
</svg>`;
}

export function generatePuzzleBobbleSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
      @keyframes canonAim {
        0%, 100% { transform: rotate(-35deg); }
        50% { transform: rotate(35deg); }
      }
      @keyframes bubbleFly {
        0% { transform: translate(385px, 120px) scale(0.6); opacity: 1; }
        100% { transform: translate(460px, 30px) scale(1); opacity: 0.9; }
      }
      .cannon { transform-origin: 385px 130px; animation: canonAim 5s infinite ease-in-out; }
      .flying-bubble { fill: #a855f7; animation: bubbleFly 1.6s infinite ease-out; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Cannon Shooter -->
  <g class="cannon">
    <rect x="381" y="105" width="8" height="25" rx="3" fill="#eab308" />
  </g>
  <circle class="flying-bubble" r="6" />
  <text x="20" y="152" class="label">🫧 PUZZLE BOBBLE • ${user}'s contribution shooter</text>
</svg>`;
}

export function generateBombermanSvg(options: GamePreviewOptions = {}): string {
  const isDark = options.theme !== 'light';
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#24292f';
  const user = options.username?.trim() || 'developer';
  const matrix = generateMatrix(user);
  const gridCells = renderGridCells(matrix, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790 170" width="100%" height="100%">
  <defs>
    <style>
      .bg { fill: ${bg}; }
      .label { fill: ${text}; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
      @keyframes bomberWalk {
        0% { transform: translate(40px, 45px); }
        45% { transform: translate(520px, 45px); }
        50% { transform: translate(520px, 85px); }
        95% { transform: translate(40px, 85px); }
        100% { transform: translate(40px, 45px); }
      }
      @keyframes bombPulse {
        0%, 100% { r: 5.5px; fill: #111; }
        50% { r: 7.5px; fill: #ef4444; }
      }
      .bomberman { animation: bomberWalk 8s infinite linear; }
      .bomb { animation: bombPulse 1s infinite; }
    </style>
  </defs>
  <rect width="100%" height="100%" rx="6" class="bg"/>
  <g>${gridCells}</g>
  <!-- Bomb -->
  <circle class="bomb" cx="300" cy="55" />
  <!-- Bomberman Sprite -->
  <g class="bomberman">
    <circle cx="8" cy="8" r="8" fill="#ffffff" />
    <rect x="4" y="5" width="8" height="4" rx="2" fill="#3b82f6" />
    <circle cx="8" cy="18" r="5" fill="#3b82f6" />
  </g>
  <text x="20" y="152" class="label">💣 BOMBERMAN • ${user}'s contribution arena</text>
</svg>`;
}

export function getGameSvg(game: ArcadeGame | 'snake', options: GamePreviewOptions = {}): string {
  switch (game) {
    case 'snake': return generateSnakeSvg(options);
    case 'pacman': return generatePacmanSvg(options);
    case 'breakout': return generateBreakoutSvg(options);
    case 'galaga': return generateGalagaSvg(options);
    case 'puzzle-bobble': return generatePuzzleBobbleSvg(options);
    case 'bomberman': return generateBombermanSvg(options);
  }
}

export function getGameDataUri(game: ArcadeGame | 'snake', options: GamePreviewOptions = {}): string {
  const svg = getGameSvg(game, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
