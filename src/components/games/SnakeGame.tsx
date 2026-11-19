import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { gameAudio } from '../../lib/gameAudio';
import { roundedRectPath } from '../../lib/gameCanvas';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type SnakeSpeed = 'relaxed' | 'standard' | 'fast';
type Point = { x: number; y: number };

const GRID_SIZE = 20;
const STORAGE_KEY = 'sp_npo_snake_best_v1';

const SPEED_MS: Record<SnakeSpeed, number> = {
  relaxed: 155,
  standard: 112,
  fast: 76,
};

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
}

export function SnakeGame() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [speedMode, setSpeedMode] = useState<SnakeSpeed>('standard');
  const [wrapWalls, setWrapWalls] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [snakeLength, setSnakeLength] = useState(INITIAL_SNAKE.length);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>([...INITIAL_SNAKE]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const size = 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    const cell = size / GRID_SIZE;

    // Background arena
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.fillRect(0, 0, size, size);

    // Subtle geometric dot-matrix grid
    ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.14)';
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Food orb (Gold + Terracotta inner core matching NPO palette)
    const food = foodRef.current;
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    ctx.fillStyle = '#E8A735';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C44D34';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // Snake body segments
    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const pad = i === 0 ? 1.5 : 2.5;
      const sx = seg.x * cell + pad;
      const sy = seg.y * cell + pad;
      const sw = cell - pad * 2;
      const sh = cell - pad * 2;

      if (i === 0) {
        ctx.fillStyle = isDark ? '#68978F' : '#2C3A57';
      } else {
        ctx.fillStyle =
          i % 2 === 0
            ? '#68978F'
            : isDark
              ? '#4B756E'
              : '#7CA8A0';
      }

      roundedRectPath(ctx, sx, sy, sw, sh, i === 0 ? 5 : 4);
      ctx.fill();

      // Eyes on head
      if (i === 0) {
        const d = dirRef.current;
        ctx.fillStyle = '#FFFFFF';
        const cx = seg.x * cell + cell / 2;
        const cy = seg.y * cell + cell / 2;
        const eyeOffsetForward = 3.2;
        const eyeSpread = 3.5;
        const ex1 = cx + d.x * eyeOffsetForward - d.y * eyeSpread;
        const ey1 = cy + d.y * eyeOffsetForward + d.x * eyeSpread;
        const ex2 = cx + d.x * eyeOffsetForward + d.y * eyeSpread;
        const ey2 = cy + d.y * eyeOffsetForward - d.x * eyeSpread;
        ctx.beginPath();
        ctx.arc(ex1, ey1, 1.8, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, []);

  const startGame = useCallback(() => {
    const startSnake = [...INITIAL_SNAKE];
    snakeRef.current = startSnake;
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = spawnFood(startSnake);
    scoreRef.current = 0;
    setScore(0);
    setSnakeLength(startSnake.length);
    setGameState('PLAYING');
    gameAudio.playMove();
    requestAnimationFrame(drawBoard);
  }, [drawBoard]);

  const queueDirection = useCallback((dx: number, dy: number) => {
    const cur = dirRef.current;
    // Prevent 180-degree reversal
    if (cur.x === -dx && cur.y === -dy) return;
    nextDirRef.current = { x: dx, y: dy };
  }, []);

  useEffect(() => {
    drawBoard();
  }, [drawBoard, gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const tickMs = Math.max(
      54,
      SPEED_MS[speedMode] - Math.floor(scoreRef.current / 50) * 4
    );

    const timer = window.setInterval(() => {
      const snake = [...snakeRef.current];
      const nextDir = nextDirRef.current;
      dirRef.current = nextDir;

      let nx = snake[0].x + nextDir.x;
      let ny = snake[0].y + nextDir.y;

      if (wrapWalls) {
        nx = (nx + GRID_SIZE) % GRID_SIZE;
        ny = (ny + GRID_SIZE) % GRID_SIZE;
      } else if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
        gameAudio.playGameOver();
        setGameState('GAME_OVER');
        return;
      }

      const willEat = nx === foodRef.current.x && ny === foodRef.current.y;
      const bodyToCheck = willEat ? snake : snake.slice(0, -1);
      if (bodyToCheck.some((seg) => seg.x === nx && seg.y === ny)) {
        gameAudio.playGameOver();
        setGameState('GAME_OVER');
        return;
      }

      const nextSnake = [{ x: nx, y: ny }, ...snake];
      if (!willEat) {
        nextSnake.pop();
      } else {
        const nextScore = scoreRef.current + 10;
        scoreRef.current = nextScore;
        setScore(nextScore);
        setSnakeLength(nextSnake.length);
        foodRef.current = spawnFood(nextSnake);
        gameAudio.playScore();

        setBestScore((prev) => {
          const updated = Math.max(prev, nextScore);
          try {
            localStorage.setItem(STORAGE_KEY, String(updated));
          } catch {
            // ignore storage errors
          }
          return updated;
        });
      }

      snakeRef.current = nextSnake;
      drawBoard();
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [gameState, speedMode, wrapWalls, drawBoard]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT'
      ) {
        return;
      }

      if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;

      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
        return;
      }

      if (gameState !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          queueDirection(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          queueDirection(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          queueDirection(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          queueDirection(1, 0);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, queueDirection]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left/Main Playfield */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
              Geometric Snake
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arrow keys, WASD, swipe, or touch pad to collect golden orbs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <button
                type="button"
                onClick={() =>
                  setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'))
                }
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                {gameState === 'PAUSED' ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={startGame}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{gameState === 'TITLE_MENU' ? 'Start Game' : 'Restart'}</span>
            </button>
          </div>
        </div>

        {/* HUD Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Score</p>
            <p className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {score}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#E8A735]" />
              Best
            </p>
            <p className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {bestScore}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Length</p>
            <p className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {snakeLength}
            </p>
          </div>
        </div>

        {/* Canvas Arena */}
        <div className="relative w-full max-w-[420px] mx-auto aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 touch-none">
          <canvas
            ref={canvasRef}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              if (!touchStartRef.current || gameState !== 'PLAYING') return;
              const t = e.changedTouches[0];
              if (!t) return;
              const dx = t.clientX - touchStartRef.current.x;
              const dy = t.clientY - touchStartRef.current.y;
              touchStartRef.current = null;
              if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
              if (Math.abs(dx) > Math.abs(dy)) {
                queueDirection(dx > 0 ? 1 : -1, 0);
              } else {
                queueDirection(0, dy > 0 ? 1 : -1);
              }
            }}
            className="w-full h-full block"
          />

          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <h4 className="font-display text-xl font-bold">Ready to Play Snake</h4>
              <p className="text-xs text-slate-200 max-w-xs leading-relaxed">
                Guide the geometric serpent to collect golden orbs. Each orb increases your score by 10 and gently accelerates pace.
              </p>
              <button
                type="button"
                onClick={startGame}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#68978F] hover:bg-[#57827B] text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Game</span>
              </button>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <h4 className="font-display text-xl font-bold">Game Paused</h4>
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#2C3A57] hover:bg-[#3B4E73] text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#E8A735] font-semibold">
                Round Complete
              </p>
              <h4 className="font-display text-2xl font-bold font-mono-tabular">
                Score: {score}
              </h4>
              <p className="text-xs text-slate-300 font-mono-tabular">
                Best Score: {bestScore} · Final Length: {snakeLength}
              </p>
              <button
                type="button"
                onClick={startGame}
                className="cursor-pointer mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#68978F] hover:bg-[#57827B] text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Touch D-Pad for Mobile & Tablet */}
        <div className="pt-1 flex flex-col items-center gap-1.5 select-none">
          <button
            type="button"
            aria-label="Move Up"
            onClick={() => {
              if (gameState === 'PLAYING') queueDirection(0, -1);
            }}
            className="w-12 h-11 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Move Left"
              onClick={() => {
                if (gameState === 'PLAYING') queueDirection(-1, 0);
              }}
              className="w-12 h-11 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Move Down"
              onClick={() => {
                if (gameState === 'PLAYING') queueDirection(0, 1);
              }}
              className="w-12 h-11 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Move Right"
              onClick={() => {
                if (gameState === 'PLAYING') queueDirection(1, 0);
              }}
              className="w-12 h-11 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Settings & Rules Panel */}
      <aside className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100 mb-2">
            Pace & Arena Rules
          </h4>
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Starting Speed
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['relaxed', 'standard', 'fast'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSpeedMode(mode)}
                    className={`cursor-pointer py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      speedMode === mode
                        ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100">
                  Wrap-Around Borders
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pass cleanly through edges instead of crashing into walls
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={wrapWalls}
                onClick={() => setWrapWalls((w) => !w)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  wrapWalls
                    ? 'bg-[#2C3A57] dark:bg-[#3B4E73] text-white border-transparent'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {wrapWalls ? 'Wrap On' : 'Solid Walls'}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
            How to Play
          </h4>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
            <li>• Desktop: Use Arrow keys or W/A/S/D to steer, Space or P to pause.</li>
            <li>• Mobile: Swipe across the board or tap the directional arrows below.</li>
            <li>• Avoid colliding with your own growing tail to set a new high score.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
