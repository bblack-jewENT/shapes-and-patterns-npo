import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import {
  ArrowLeftRight,
  Bot,
  Flag,
  Play,
  RotateCcw,
  Undo2,
  Users,
} from 'lucide-react';
import { gameAudio } from '../../lib/gameAudio';
import {
  isRecord,
  readLocalGameProgress,
  saveLocalGameProgress,
} from '../../lib/gameProgress';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';
type OpponentMode = 'ai' | 'local';
type BotDifficulty = 'casual' | 'club' | 'tactical';

const PROGRESS_STORAGE_KEY = 'sp_npo_chess_progress_v1';

interface ChessProgress {
  version: 1;
  gameState: GameState;
  opponentMode: OpponentMode;
  difficulty: BotDifficulty;
  playerColor: Color;
  boardFlipped: boolean;
  moves: string[];
  resignedBy: Color | null;
}

function isChessProgress(value: unknown): value is ChessProgress {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    (value.gameState === 'TITLE_MENU' ||
      value.gameState === 'PLAYING' ||
      value.gameState === 'GAME_OVER') &&
    (value.opponentMode === 'ai' || value.opponentMode === 'local') &&
    (value.difficulty === 'casual' ||
      value.difficulty === 'club' ||
      value.difficulty === 'tactical') &&
    (value.playerColor === 'w' || value.playerColor === 'b') &&
    typeof value.boardFlipped === 'boolean' &&
    Array.isArray(value.moves) &&
    value.moves.length <= 2048 &&
    value.moves.every(
      (move) => typeof move === 'string' && move.length <= 32
    ) &&
    (value.resignedBy === null ||
      value.resignedBy === 'w' ||
      value.resignedBy === 'b')
  );
}

function restoreChessGame(moves: string[]): Chess | null {
  const game = new Chess();
  try {
    for (const move of moves) {
      game.move(move);
    }
    return game;
  } catch (error) {
    console.error('Unable to restore the saved chess game.', error);
    return null;
  }
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Lightweight positional tables (from White's perspective, row 0 = rank 8)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const CENTER_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 8, 12, 12, 8, 0, -10],
  [-5, 5, 12, 16, 16, 12, 5, -5],
  [0, 0, 12, 16, 16, 12, 0, 0],
  [-10, 8, 8, 12, 12, 8, 8, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return 0;
  }

  const board = chess.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const base = PIECE_VALUES[piece.type];
      const pstRow = piece.color === 'w' ? r : 7 - r;
      let bonus = 0;
      if (piece.type === 'p') bonus = PAWN_PST[pstRow][c];
      else if (piece.type === 'n') bonus = KNIGHT_PST[pstRow][c];
      else if (piece.type === 'b' || piece.type === 'q') bonus = CENTER_PST[pstRow][c];

      const total = base + bonus;
      score += piece.color === 'w' ? total : -total;
    }
  }

  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const scoreA =
      (a.captured ? PIECE_VALUES[a.captured] * 10 : 0) +
      (a.promotion ? 800 : 0) +
      (a.san.includes('+') ? 40 : 0);
    const scoreB =
      (b.captured ? PIECE_VALUES[b.captured] * 10 : 0) +
      (b.promotion ? 800 : 0) +
      (b.san.includes('+') ? 40 : 0);
    return scoreB - scoreA;
  });
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizingWhite: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  if (maximizingWhite) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const val = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (val > maxEval) maxEval = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const val = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (val < minEval) minEval = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function pickBotMove(fen: string, difficulty: BotDifficulty): Move | null {
  const chess = new Chess(fen);
  const legal = orderMoves(chess.moves({ verbose: true }));
  if (legal.length === 0) return null;

  if (difficulty === 'casual') {
    const captures = legal.filter((m) => m.captured || m.san.includes('+'));
    if (captures.length > 0 && Math.random() < 0.72) {
      return captures[Math.floor(Math.random() * Math.min(2, captures.length))];
    }
    return legal[Math.floor(Math.random() * legal.length)];
  }

  const depth = difficulty === 'tactical' ? 3 : 2;
  const maximizing = chess.turn() === 'w';
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMoves: Move[] = [];

  for (const move of legal) {
    chess.move(move);
    const val = minimax(chess, depth - 1, -Infinity, Infinity, !maximizing);
    chess.undo();

    if (maximizing) {
      if (val > bestScore) {
        bestScore = val;
        bestMoves = [move];
      } else if (val === bestScore) {
        bestMoves.push(move);
      }
    } else {
      if (val < bestScore) {
        bestScore = val;
        bestMoves = [move];
      } else if (val === bestScore) {
        bestMoves.push(move);
      }
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legal[0];
}

function ChessPieceSvg({ type, color }: { type: PieceSymbol; color: Color }) {
  const fill = color === 'w' ? '#FFFFFF' : '#1E293B';
  const stroke = color === 'w' ? '#1E293B' : '#F8FAFC';
  const detail = color === 'w' ? '#2C3A57' : '#CBD5E1';

  return (
    <svg viewBox="0 0 45 45" className="w-[82%] h-[82%] drop-shadow-xs select-none" aria-hidden="true">
      {type === 'p' && (
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === 'r' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" fill="none" stroke={detail} strokeWidth="1.2" />
        </g>
      )}
      {type === 'n' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
          <circle cx="15" cy="15.5" r="1.2" fill={detail} stroke="none" />
        </g>
      )}
      {type === 'b' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <circle cx="22.5" cy="8" r="2.3" />
          <path d="M17.5 26h10M22.5 15.5v5M20 18h5" fill="none" stroke={detail} strokeWidth="1.4" />
        </g>
      )}
      {type === 'q' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="14" cy="9" r="2.2" />
          <circle cx="22.5" cy="8" r="2.2" />
          <circle cx="31" cy="9" r="2.2" />
          <circle cx="39" cy="12" r="2.2" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        </g>
      )}
      {type === 'k' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0" fill="none" stroke={detail} strokeWidth="1.3" />
        </g>
      )}
    </svg>
  );
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessGame() {
  const [savedProgress] = useState(() =>
    readLocalGameProgress(PROGRESS_STORAGE_KEY, isChessProgress)
  );
  const [restoredGame] = useState(() =>
    savedProgress ? restoreChessGame(savedProgress.moves) : null
  );
  const initialProgress = restoredGame ? savedProgress : null;

  const [gameState, setGameState] = useState<GameState>(
    () => initialProgress?.gameState || 'TITLE_MENU'
  );
  const [opponentMode, setOpponentMode] = useState<OpponentMode>(
    () => initialProgress?.opponentMode || 'ai'
  );
  const [difficulty, setDifficulty] = useState<BotDifficulty>(
    () => initialProgress?.difficulty || 'club'
  );
  const [playerColor, setPlayerColor] = useState<Color>(
    () => initialProgress?.playerColor || 'w'
  );
  const [boardFlipped, setBoardFlipped] = useState(
    () => initialProgress?.boardFlipped || false
  );

  const [fen, setFen] = useState(
    () => restoredGame?.fen() || new Chess().fen()
  );
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    () => {
      const history = restoredGame?.history({ verbose: true }) || [];
      const last = history[history.length - 1];
      return last ? { from: last.from, to: last.to } : null;
    }
  );
  const [resignedBy, setResignedBy] = useState<Color | null>(
    () => initialProgress?.resignedBy || null
  );
  const [isBotThinking, setIsBotThinking] = useState(false);

  const chessRef = useRef<Chess>(restoredGame || new Chess());
  const botTimerRef = useRef<number | null>(null);

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearBotTimer();
  }, [clearBotTimer]);

  useEffect(() => {
    saveLocalGameProgress(PROGRESS_STORAGE_KEY, {
      version: 1,
      gameState,
      opponentMode,
      difficulty,
      playerColor,
      boardFlipped,
      moves: chessRef.current.history(),
      resignedBy,
    } satisfies ChessProgress);
  }, [
    fen,
    gameState,
    opponentMode,
    difficulty,
    playerColor,
    boardFlipped,
    resignedBy,
  ]);

  const startNewGame = useCallback(
    (overrideColor?: Color) => {
      clearBotTimer();
      const chosenColor = overrideColor ?? playerColor;
      const fresh = new Chess();
      chessRef.current = fresh;
      setFen(fresh.fen());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setLastMove(null);
      setResignedBy(null);
      setIsBotThinking(false);
      setBoardFlipped(opponentMode === 'ai' && chosenColor === 'b');
      setGameState('PLAYING');
      gameAudio.playMove();
    },
    [clearBotTimer, opponentMode, playerColor]
  );

  // Run bot move automatically whenever it is the bot's turn
  useEffect(() => {
    if (gameState !== 'PLAYING' || opponentMode !== 'ai' || resignedBy) return;
    const game = chessRef.current;
    if (game.isGameOver()) {
      setGameState('GAME_OVER');
      return;
    }

    const botColor: Color = playerColor === 'w' ? 'b' : 'w';
    if (game.turn() !== botColor) return;

    setIsBotThinking(true);
    clearBotTimer();
    const snapshotFen = game.fen();
    botTimerRef.current = window.setTimeout(() => {
      const move = pickBotMove(snapshotFen, difficulty);
      if (move) {
        const applied = chessRef.current.move(move);
        setFen(chessRef.current.fen());
        setLastMove({ from: applied.from, to: applied.to });
        if (chessRef.current.inCheck()) {
          gameAudio.playCheck();
        } else if (applied.captured) {
          gameAudio.playCapture();
        } else {
          gameAudio.playMove();
        }

        if (chessRef.current.isGameOver()) {
          setGameState('GAME_OVER');
          if (chessRef.current.isCheckmate()) {
            gameAudio.playGameOver();
          }
        }
      }
      setIsBotThinking(false);
    }, 480);

    return () => clearBotTimer();
  }, [
    fen,
    gameState,
    opponentMode,
    playerColor,
    difficulty,
    resignedBy,
    clearBotTimer,
  ]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Map<Square, Move[]>();
    const moves = chessRef.current.moves({ square: selectedSquare, verbose: true });
    const map = new Map<Square, Move[]>();
    for (const m of moves) {
      const existing = map.get(m.to) || [];
      existing.push(m);
      map.set(m.to, existing);
    }
    return map;
  }, [selectedSquare, fen]);

  const executePlayerMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      try {
        const move = chessRef.current.move({ from, to, promotion });
        setFen(chessRef.current.fen());
        setSelectedSquare(null);
        setPendingPromotion(null);
        setLastMove({ from: move.from, to: move.to });

        if (chessRef.current.isGameOver()) {
          setGameState('GAME_OVER');
          if (chessRef.current.isCheckmate()) {
            gameAudio.playVictory();
          } else {
            gameAudio.playScore();
          }
        } else if (chessRef.current.inCheck()) {
          gameAudio.playCheck();
        } else if (move.captured) {
          gameAudio.playCapture();
        } else {
          gameAudio.playMove();
        }
      } catch {
        setSelectedSquare(null);
        setPendingPromotion(null);
      }
    },
    []
  );

  function handleSquareClick(square: Square) {
    if (gameState !== 'PLAYING' || isBotThinking || pendingPromotion) return;
    const game = chessRef.current;
    if (opponentMode === 'ai' && game.turn() !== playerColor) return;

    if (selectedSquare && legalTargets.has(square)) {
      const options = legalTargets.get(square)!;
      if (options.some((m) => m.promotion)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executePlayerMove(selectedSquare, square);
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square === selectedSquare ? null : square);
    } else {
      setSelectedSquare(null);
    }
  }

  function handleUndo() {
    if (isBotThinking || gameState === 'TITLE_MENU') return;
    clearBotTimer();
    const game = chessRef.current;
    if (game.history().length === 0) return;

    if (opponentMode === 'ai') {
      // Undo both bot move and player move when possible
      game.undo();
      if (game.turn() !== playerColor && game.history().length > 0) {
        game.undo();
      }
    } else {
      game.undo();
    }

    setFen(game.fen());
    setSelectedSquare(null);
    setPendingPromotion(null);
    setResignedBy(null);
    setGameState('PLAYING');
    const hist = game.history({ verbose: true });
    const prev = hist[hist.length - 1];
    setLastMove(prev ? { from: prev.from, to: prev.to } : null);
  }

  const game = chessRef.current;
  const board = game.board();
  const history = game.history({ verbose: true });

  const capturedPieces = useMemo(() => {
    const byWhite: PieceSymbol[] = [];
    const byBlack: PieceSymbol[] = [];
    let wMat = 0;
    let bMat = 0;
    for (const m of history) {
      if (m.captured) {
        if (m.color === 'w') {
          byWhite.push(m.captured);
          wMat += PIECE_VALUES[m.captured];
        } else {
          byBlack.push(m.captured);
          bMat += PIECE_VALUES[m.captured];
        }
      }
    }
    return {
      byWhite,
      byBlack,
      whiteLead: Math.round((wMat - bMat) / 100),
      blackLead: Math.round((bMat - wMat) / 100),
    };
  }, [history]);

  const movePairs = useMemo(() => {
    const pairs: Array<{ moveNumber: number; white: string; black?: string }> = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: history[i].san,
        black: history[i + 1]?.san,
      });
    }
    return pairs;
  }, [history]);

  const statusText = useMemo(() => {
    if (resignedBy) {
      return `${resignedBy === 'w' ? 'White' : 'Black'} resigned · ${
        resignedBy === 'w' ? 'Black' : 'White'
      } wins`;
    }
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate · ${winner} wins`;
    }
    if (game.isStalemate()) return 'Draw by stalemate';
    if (game.isThreefoldRepetition()) return 'Draw by repetition';
    if (game.isInsufficientMaterial()) return 'Draw · Insufficient material';
    if (game.isDraw()) return 'Draw';
    const turnLabel = game.turn() === 'w' ? 'White' : 'Black';
    if (isBotThinking) return 'NPO Bot is thinking...';
    if (game.inCheck()) return `${turnLabel} to move · Check!`;
    return `${turnLabel} to move`;
  }, [game, fen, resignedBy, isBotThinking]);

  const displayRanks = boardFlipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = boardFlipped ? [...FILES].reverse() : FILES;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Chessboard Panel */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
              Strategy Chess
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
              {statusText}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBoardFlipped((f) => !f)}
              title="Flip board"
              className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Flip</span>
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0 || isBotThinking}
              className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            {gameState === 'PLAYING' && (
              <button
                type="button"
                onClick={() => {
                  clearBotTimer();
                  setResignedBy(game.turn());
                  setGameState('GAME_OVER');
                  gameAudio.playGameOver();
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#C44D34] dark:text-[#E87A64] bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 rounded-lg transition-colors whitespace-nowrap"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Resign</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => startNewGame()}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{gameState === 'TITLE_MENU' ? 'Start Match' : 'New Game'}</span>
            </button>
          </div>
        </div>

        {/* Captured Pieces Top Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 px-1">
          <div className="flex items-center gap-1.5 min-h-[22px]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {boardFlipped ? 'White' : 'Black'}:
            </span>
            <div className="flex items-center -space-x-1">
              {(boardFlipped ? capturedPieces.byWhite : capturedPieces.byBlack).map(
                (p, idx) => (
                  <div key={idx} className="w-5 h-5">
                    <ChessPieceSvg type={p} color={boardFlipped ? 'b' : 'w'} />
                  </div>
                )
              )}
            </div>
            {(boardFlipped ? capturedPieces.whiteLead : capturedPieces.blackLead) > 0 && (
              <span className="font-mono-tabular font-semibold text-[#4B756E] dark:text-[#8FB9B1]">
                +{boardFlipped ? capturedPieces.whiteLead : capturedPieces.blackLead}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
            {opponentMode === 'ai'
              ? `vs Bot (${difficulty})`
              : '2-Player Local'}
          </span>
        </div>

        {/* 8x8 Chessboard */}
        <div className="relative w-full max-w-[460px] mx-auto aspect-square rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 select-none">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {displayRanks.map((rank) =>
              displayFiles.map((file) => {
                const square = `${file}${rank}` as Square;
                const rIdx = RANKS.indexOf(rank);
                const fIdx = FILES.indexOf(file);
                const isLightSquare = (rIdx + fIdx) % 2 === 0;
                const piece = board[rIdx]?.[fIdx] || null;
                const isSelected = selectedSquare === square;
                const isTarget = legalTargets.has(square);
                const isCaptureTarget = isTarget && piece !== null;
                const isLastMove =
                  lastMove?.from === square || lastMove?.to === square;
                const isKingInCheck =
                  game.inCheck() &&
                  piece?.type === 'k' &&
                  piece.color === game.turn();

                return (
                  <button
                    key={square}
                    type="button"
                    onClick={() => handleSquareClick(square)}
                    aria-label={`Square ${square}${
                      piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''
                    }`}
                    className={`relative flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#2C3A57] ${
                      isKingInCheck
                        ? 'bg-[#C44D34]/80'
                        : isSelected
                          ? 'bg-[#E8A735]/65'
                          : isLastMove
                            ? isLightSquare
                              ? 'bg-[#EAE0B8] dark:bg-[#9E8A4E]'
                              : 'bg-[#86A78C] dark:bg-[#5F7B66]'
                            : isLightSquare
                              ? 'bg-[#F2EFE9] dark:bg-[#CBD5E1]'
                              : 'bg-[#68978F] dark:bg-[#476B65]'
                    }`}
                  >
                    {/* Coordinate markers */}
                    {file === displayFiles[0] && (
                      <span
                        className={`absolute top-0.5 left-1 text-[9px] font-mono-tabular font-semibold pointer-events-none ${
                          isLightSquare
                            ? 'text-[#476B65]'
                            : 'text-[#F2EFE9]'
                        }`}
                      >
                        {rank}
                      </span>
                    )}
                    {rank === displayRanks[7] && (
                      <span
                        className={`absolute bottom-0.5 right-1 text-[9px] font-mono-tabular font-semibold pointer-events-none ${
                          isLightSquare
                            ? 'text-[#476B65]'
                            : 'text-[#F2EFE9]'
                        }`}
                      >
                        {file}
                      </span>
                    )}

                    {/* Legal move indicator */}
                    {isTarget && !isCaptureTarget && (
                      <span className="w-3 h-3 rounded-full bg-[#2C3A57]/45 pointer-events-none" />
                    )}
                    {isCaptureTarget && (
                      <span className="absolute inset-1 rounded-full border-2 border-[#C44D34] pointer-events-none" />
                    )}

                    {piece && <ChessPieceSvg type={piece.type} color={piece.color} />}
                  </button>
                );
              })
            )}
          </div>

          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 bg-slate-900/78 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <h4 className="font-display text-xl font-bold">Strategy Chess</h4>
              <p className="text-xs text-slate-200 max-w-xs leading-relaxed">
                Challenge the tactical NPO bot or play locally across the board with full legal FIDE rules, castling, en passant, and promotion.
              </p>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#68978F] hover:bg-[#57827B] text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Match</span>
              </button>
            </div>
          )}

          {pendingPromotion && (
            <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center p-4 text-center text-white space-y-3">
              <p className="text-sm font-semibold">Choose Pawn Promotion</p>
              <div className="flex items-center gap-2">
                {(['q', 'r', 'b', 'n'] as const).map((promo) => (
                  <button
                    key={promo}
                    type="button"
                    onClick={() =>
                      executePlayerMove(
                        pendingPromotion.from,
                        pendingPromotion.to,
                        promo
                      )
                    }
                    aria-label={`Promote to ${promo}`}
                    className="w-12 h-12 rounded-lg bg-white/95 hover:bg-white flex items-center justify-center border border-slate-300 transition-transform hover:scale-105"
                  >
                    <ChessPieceSvg type={promo} color={game.turn()} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#E8A735] font-semibold">
                Match Complete
              </p>
              <h4 className="font-display text-xl font-bold">{statusText}</h4>
              <p className="text-xs text-slate-300 font-mono-tabular">
                {history.length} plies played
              </p>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="cursor-pointer mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#68978F] hover:bg-[#57827B] text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Captured Pieces Bottom Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 px-1">
          <div className="flex items-center gap-1.5 min-h-[22px]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {boardFlipped ? 'Black' : 'White'}:
            </span>
            <div className="flex items-center -space-x-1">
              {(boardFlipped ? capturedPieces.byBlack : capturedPieces.byWhite).map(
                (p, idx) => (
                  <div key={idx} className="w-5 h-5">
                    <ChessPieceSvg type={p} color={boardFlipped ? 'w' : 'b'} />
                  </div>
                )
              )}
            </div>
            {(boardFlipped ? capturedPieces.blackLead : capturedPieces.whiteLead) > 0 && (
              <span className="font-mono-tabular font-semibold text-[#4B756E] dark:text-[#8FB9B1]">
                +{boardFlipped ? capturedPieces.blackLead : capturedPieces.whiteLead}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Tap a piece, then tap a highlighted destination
          </span>
        </div>
      </div>

      {/* Right Settings & Move Log */}
      <aside className="lg:col-span-5 space-y-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
          <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
            Match Setup
          </h4>

          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Opponent Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setOpponentMode('ai')}
                className={`cursor-pointer inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  opponentMode === 'ai'
                    ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>vs NPO Bot</span>
              </button>
              <button
                type="button"
                onClick={() => setOpponentMode('local')}
                className={`cursor-pointer inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  opponentMode === 'local'
                    ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pass &amp; Play</span>
              </button>
            </div>
          </div>

          {opponentMode === 'ai' && (
            <>
              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Bot Strength
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(['casual', 'club', 'tactical'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`cursor-pointer py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        difficulty === lvl
                          ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Play As
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerColor('w');
                      startNewGame('w');
                    }}
                    className={`cursor-pointer py-1.5 text-xs font-medium rounded-md transition-colors ${
                      playerColor === 'w'
                        ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                    }`}
                  >
                    White (First)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerColor('b');
                      startNewGame('b');
                    }}
                    className={`cursor-pointer py-1.5 text-xs font-medium rounded-md transition-colors ${
                      playerColor === 'b'
                        ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                    }`}
                  >
                    Black (Second)
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
              Move Notation
            </h4>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              {movePairs.length} moves
            </span>
          </div>

          {movePairs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              Moves will appear here in standard algebraic notation.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono-tabular">
              {movePairs.map((pair) => (
                <div
                  key={pair.moveNumber}
                  className="grid grid-cols-12 py-1.5 px-2 text-[#2B2F36] dark:text-slate-200"
                >
                  <span className="col-span-2 text-slate-400 dark:text-slate-500">
                    {pair.moveNumber}.
                  </span>
                  <span className="col-span-5 font-medium">{pair.white}</span>
                  <span className="col-span-5 text-slate-600 dark:text-slate-300">
                    {pair.black || ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
