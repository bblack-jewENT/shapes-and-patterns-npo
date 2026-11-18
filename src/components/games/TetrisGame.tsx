import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  Pause,
  Play,
  Repeat,
  RotateCw,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { gameAudio } from '../../lib/gameAudio';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const COLS = 10;
const ROWS = 20;
const STORAGE_KEY = 'sp_npo_tetris_best_v1';

const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS: Record<TetrominoType, string> = {
  I: '#0EA5E9',
  O: '#E8A735',
  T: '#8B5CF6',
  S: '#68978F',
  Z: '#C44D34',
  J: '#2C3A57',
  L: '#EA580C',
};

const ALL_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

interface ActivePiece {
  type: TetrominoType;
  matrix: number[][];
  x: number;
  y: number;
}

function createEmptyGrid(): (TetrominoType | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function createBag(): TetrominoType[] {
  const bag = [...ALL_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function spawnPiece(type: TetrominoType): ActivePiece {
  const matrix = SHAPES[type].map((row) => [...row]);
  const x = Math.floor((COLS - matrix[0].length) / 2);
  const y = type === 'I' ? -1 : 0;
  return { type, matrix, x, y };
}

function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  return matrix.map((_, r) => matrix.map((__, c) => matrix[n - 1 - c][r]));
}

function collides(
  grid: (TetrominoType | null)[][],
  piece: ActivePiece,
  offsetX = 0,
  offsetY = 0,
  testMatrix = piece.matrix
): boolean {
  for (let r = 0; r < testMatrix.length; r++) {
    for (let c = 0; c < testMatrix[r].length; c++) {
      if (!testMatrix[r][c]) continue;
      const nx = piece.x + c + offsetX;
      const ny = piece.y + r + offsetY;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx] !== null) return true;
    }
  }
  return false;
}

function drawMiniPiece(
  canvas: HTMLCanvasElement | null,
  type: TetrominoType | null
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const isDark = document.documentElement.classList.contains('dark');
  const size = 84;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
  ctx.fillRect(0, 0, size, size);

  if (type) {
    const matrix = SHAPES[type];
    const cell = 16;
    const width = matrix[0].length * cell;
    const height = matrix.length * cell;
    const ox = Math.floor((size - width) / 2);
    const oy = Math.floor((size - height) / 2);
    ctx.fillStyle = COLORS[type];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        ctx.beginPath();
        ctx.roundRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2, 3);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

export function TetrisGame() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const gridRef = useRef<(TetrominoType | null)[][]>(createEmptyGrid());
  const bagRef = useRef<TetrominoType[]>(createBag());
  const currentRef = useRef<ActivePiece | null>(null);
  const nextTypeRef = useRef<TetrominoType>('T');
  const holdTypeRef = useRef<TetrominoType | null>(null);
  const canHoldRef = useRef(true);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);

  const pullFromBag = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      bagRef.current = createBag();
    }
    return bagRef.current.pop()!;
  }, []);

  const renderAll = useCallback(() => {
    const canvas = boardCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const isDark = document.documentElement.classList.contains('dark');
        const cell = 24;
        const w = COLS * cell;
        const h = ROWS * cell;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
        ctx.fillRect(0, 0, w, h);

        // Subtle grid lines
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(100, 116, 139, 0.12)';
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * cell, 0);
          ctx.lineTo(c * cell, h);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * cell);
          ctx.lineTo(w, r * cell);
          ctx.stroke();
        }

        // Settled blocks
        const grid = gridRef.current;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cellType = grid[r][c];
            if (!cellType) continue;
            ctx.fillStyle = COLORS[cellType];
            ctx.beginPath();
            ctx.roundRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2, 3.5);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(c * cell + 3, r * cell + 2.5, cell - 6, 3);
          }
        }

        // Active piece + ghost
        const active = currentRef.current;
        if (active) {
          let ghostY = active.y;
          while (!collides(grid, active, 0, ghostY - active.y + 1)) {
            ghostY += 1;
          }

          // Ghost preview
          ctx.strokeStyle = COLORS[active.type];
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.5;
          for (let r = 0; r < active.matrix.length; r++) {
            for (let c = 0; c < active.matrix[r].length; c++) {
              if (!active.matrix[r][c]) continue;
              const gx = active.x + c;
              const gy = ghostY + r;
              if (gy >= 0) {
                ctx.beginPath();
                ctx.roundRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4, 3);
                ctx.stroke();
              }
            }
          }
          ctx.globalAlpha = 1;

          // Active piece
          for (let r = 0; r < active.matrix.length; r++) {
            for (let c = 0; c < active.matrix[r].length; c++) {
              if (!active.matrix[r][c]) continue;
              const ax = active.x + c;
              const ay = active.y + r;
              if (ay >= 0) {
                ctx.fillStyle = COLORS[active.type];
                ctx.beginPath();
                ctx.roundRect(ax * cell + 1, ay * cell + 1, cell - 2, cell - 2, 3.5);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(ax * cell + 3, ay * cell + 2.5, cell - 6, 3);
              }
            }
          }
        }

        ctx.restore();
      }
    }

    drawMiniPiece(nextCanvasRef.current, nextTypeRef.current);
    drawMiniPiece(holdCanvasRef.current, holdTypeRef.current);
  }, []);

  const updateBest = useCallback((candidate: number) => {
    setBestScore((prev) => {
      const next = Math.max(prev, candidate);
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  const spawnNextPiece = useCallback(() => {
    const incoming = spawnPiece(nextTypeRef.current);
    nextTypeRef.current = pullFromBag();
    canHoldRef.current = true;

    if (collides(gridRef.current, incoming, 0, 0)) {
      currentRef.current = null;
      gameAudio.playGameOver();
      setGameState('GAME_OVER');
      renderAll();
      return;
    }

    currentRef.current = incoming;
    renderAll();
  }, [pullFromBag, renderAll]);

  const lockPiece = useCallback(() => {
    const active = currentRef.current;
    if (!active) return;
    const nextGrid = gridRef.current.map((row) => [...row]);

    let toppedOut = false;
    for (let r = 0; r < active.matrix.length; r++) {
      for (let c = 0; c < active.matrix[r].length; c++) {
        if (!active.matrix[r][c]) continue;
        const gx = active.x + c;
        const gy = active.y + r;
        if (gy < 0) {
          toppedOut = true;
        } else {
          nextGrid[gy][gx] = active.type;
        }
      }
    }

    if (toppedOut) {
      currentRef.current = null;
      gameAudio.playGameOver();
      setGameState('GAME_OVER');
      renderAll();
      return;
    }

    // Clear full lines
    let cleared = 0;
    const remaining: (TetrominoType | null)[][] = [];
    for (let r = 0; r < ROWS; r++) {
      if (nextGrid[r].every((cell) => cell !== null)) {
        cleared += 1;
      } else {
        remaining.push(nextGrid[r]);
      }
    }
    while (remaining.length < ROWS) {
      remaining.unshift(Array(COLS).fill(null));
    }

    gridRef.current = remaining;

    if (cleared > 0) {
      const linePoints = [0, 100, 300, 500, 800][cleared] || 800;
      const newScore = scoreRef.current + linePoints * levelRef.current;
      const newLines = linesRef.current + cleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      scoreRef.current = newScore;
      linesRef.current = newLines;
      levelRef.current = newLevel;
      setScore(newScore);
      setLines(newLines);
      setLevel(newLevel);
      updateBest(newScore);
      gameAudio.playLineClear(cleared);
    } else {
      gameAudio.playMove();
    }

    spawnNextPiece();
  }, [spawnNextPiece, renderAll, updateBest]);

  const moveHorizontal = useCallback(
    (dx: number) => {
      const active = currentRef.current;
      if (!active || gameState !== 'PLAYING') return;
      if (!collides(gridRef.current, active, dx, 0)) {
        active.x += dx;
        renderAll();
      }
    },
    [gameState, renderAll]
  );

  const rotatePiece = useCallback(() => {
    const active = currentRef.current;
    if (!active || gameState !== 'PLAYING' || active.type === 'O') return;
    const rotated = rotateMatrixCW(active.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const kickX of kicks) {
      if (!collides(gridRef.current, active, kickX, 0, rotated)) {
        active.matrix = rotated;
        active.x += kickX;
        gameAudio.playMove();
        renderAll();
        return;
      }
    }
  }, [gameState, renderAll]);

  const softDrop = useCallback(() => {
    const active = currentRef.current;
    if (!active || gameState !== 'PLAYING') return;
    if (!collides(gridRef.current, active, 0, 1)) {
      active.y += 1;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      updateBest(scoreRef.current);
      renderAll();
    } else {
      lockPiece();
    }
  }, [gameState, lockPiece, renderAll, updateBest]);

  const hardDrop = useCallback(() => {
    const active = currentRef.current;
    if (!active || gameState !== 'PLAYING') return;
    let dropped = 0;
    while (!collides(gridRef.current, active, 0, 1)) {
      active.y += 1;
      dropped += 1;
    }
    if (dropped > 0) {
      scoreRef.current += dropped * 2;
      setScore(scoreRef.current);
      updateBest(scoreRef.current);
    }
    lockPiece();
  }, [gameState, lockPiece, updateBest]);

  const holdPiece = useCallback(() => {
    const active = currentRef.current;
    if (!active || gameState !== 'PLAYING' || !canHoldRef.current) return;
    const held = holdTypeRef.current;
    holdTypeRef.current = active.type;
    canHoldRef.current = false;

    if (held) {
      currentRef.current = spawnPiece(held);
      renderAll();
    } else {
      spawnNextPiece();
    }
    gameAudio.playMove();
  }, [gameState, renderAll, spawnNextPiece]);

  const startGame = useCallback(() => {
    gridRef.current = createEmptyGrid();
    bagRef.current = createBag();
    holdTypeRef.current = null;
    canHoldRef.current = true;
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    setScore(0);
    setLines(0);
    setLevel(1);
    const first = pullFromBag();
    nextTypeRef.current = pullFromBag();
    currentRef.current = spawnPiece(first);
    setGameState('PLAYING');
    gameAudio.playMove();
    requestAnimationFrame(renderAll);
  }, [pullFromBag, renderAll]);

  useEffect(() => {
    renderAll();
  }, [renderAll, gameState]);

  // Gravity loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const dropIntervalMs = Math.max(115, 760 - (level - 1) * 65);
    const timer = window.setInterval(() => {
      const active = currentRef.current;
      if (!active) return;
      if (!collides(gridRef.current, active, 0, 1)) {
        active.y += 1;
        renderAll();
      } else {
        lockPiece();
      }
    }, dropIntervalMs);
    return () => window.clearInterval(timer);
  }, [gameState, level, lockPiece, renderAll]);

  // Keyboard bindings
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT'
      ) {
        return;
      }

      if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
        return;
      }

      if (gameState !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveHorizontal(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          holdPiece();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, moveHorizontal, softDrop, rotatePiece, hardDrop, holdPiece]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Playfield Card */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
              Pattern Blocks (Tetris)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear horizontal lines with geometric tetrominoes · Space to hard drop
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
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2.5 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Score</p>
            <p className="text-base sm:text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {score}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2.5 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#E8A735]" />
              Best
            </p>
            <p className="text-base sm:text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {bestScore}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2.5 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Lines</p>
            <p className="text-base sm:text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {lines}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2.5 py-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Level</p>
            <p className="text-base sm:text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {level}
            </p>
          </div>
        </div>

        {/* Board + Next/Hold Side Strip */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-4">
          <div className="relative w-full max-w-[260px] aspect-[1/2] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 shrink-0">
            <canvas ref={boardCanvasRef} className="w-full h-full block" />

            {gameState === 'TITLE_MENU' && (
              <div className="absolute inset-0 bg-slate-900/78 flex flex-col items-center justify-center p-5 text-center text-white space-y-4">
                <h4 className="font-display text-xl font-bold">Pattern Blocks</h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Stack falling geometric tetrominoes to complete horizontal rows. Use Hold to save a piece for tight spots.
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
              <div className="absolute inset-0 bg-slate-900/72 flex flex-col items-center justify-center p-5 text-center text-white space-y-3">
                <h4 className="font-display text-xl font-bold">Paused</h4>
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
              <div className="absolute inset-0 bg-slate-900/82 flex flex-col items-center justify-center p-5 text-center text-white space-y-3">
                <p className="text-xs uppercase tracking-wider text-[#E8A735] font-semibold">
                  Stack Full
                </p>
                <h4 className="font-display text-2xl font-bold font-mono-tabular">
                  {score} pts
                </h4>
                <p className="text-xs text-slate-300 font-mono-tabular">
                  {lines} lines · Level {level}
                </p>
                <button
                  type="button"
                  onClick={startGame}
                  className="cursor-pointer mt-1 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#68978F] hover:bg-[#57827B] text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
              </div>
            )}
          </div>

          {/* Next & Hold Previews */}
          <div className="flex sm:flex-col gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Next
              </p>
              <canvas
                ref={nextCanvasRef}
                className="w-[84px] h-[84px] rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Hold
              </p>
              <canvas
                ref={holdCanvasRef}
                className="w-[84px] h-[84px] rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
              />
            </div>
          </div>
        </div>

        {/* Ergonomic Touch Controls (Mobile & Tablet) */}
        <div className="pt-2 space-y-2 select-none">
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => moveHorizontal(-1)}
              aria-label="Move Left"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 text-xs font-medium active:bg-slate-200 dark:active:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Left</span>
            </button>
            <button
              type="button"
              onClick={rotatePiece}
              aria-label="Rotate"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-[#2C3A57] dark:bg-[#3B4E73] text-white text-xs font-medium active:opacity-90"
            >
              <RotateCw className="w-4 h-4" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={() => moveHorizontal(1)}
              aria-label="Move Right"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 text-xs font-medium active:bg-slate-200 dark:active:bg-slate-700"
            >
              <span>Right</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={holdPiece}
              aria-label="Hold Piece"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 text-xs font-medium active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Repeat className="w-4 h-4" />
              <span>Hold</span>
            </button>
            <button
              type="button"
              onClick={softDrop}
              aria-label="Soft Drop"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 text-xs font-medium active:bg-slate-200 dark:active:bg-slate-700"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Drop</span>
            </button>
            <button
              type="button"
              onClick={hardDrop}
              aria-label="Hard Drop"
              className="h-11 flex items-center justify-center gap-1 rounded-lg bg-[#68978F] text-white text-xs font-medium active:opacity-90"
            >
              <ChevronsDown className="w-4 h-4" />
              <span>Snap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Controls & Scoring Reference */}
      <aside className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100 mb-2">
            Keyboard Controls
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {[
              ['Move Left / Right', '← / → or A / D'],
              ['Rotate Clockwise', '↑ or W / X'],
              ['Soft Drop', '↓ or S'],
              ['Hard Drop (Snap)', 'Space'],
              ['Hold / Swap Piece', 'C or Shift'],
              ['Pause / Resume', 'P'],
            ].map(([action, keys]) => (
              <div key={action} className="py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">{action}</span>
                <span className="font-mono-tabular font-medium text-[#2B2F36] dark:text-slate-100">
                  {keys}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
            Line Scoring
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
            <span>Single: 100 × Lv</span>
            <span>Double: 300 × Lv</span>
            <span>Triple: 500 × Lv</span>
            <span>Tetris (4): 800 × Lv</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            Level increases automatically every 10 cleared lines.
          </p>
        </div>
      </aside>
    </div>
  );
}
