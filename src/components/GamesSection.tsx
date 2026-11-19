import React, { useState } from 'react';
import { Crown, Gamepad2, Grid2x2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from '../lib/gameAudio';
import {
  readLocalGameProgress,
  saveLocalGameProgress,
} from '../lib/gameProgress';
import { ChessGame } from './games/ChessGame';
import { SnakeGame } from './games/SnakeGame';
import { TetrisGame } from './games/TetrisGame';

type GameTab = 'snake' | 'chess' | 'tetris';
const ACTIVE_GAME_STORAGE_KEY = 'sp_npo_active_game_v1';

function isGameTab(value: unknown): value is GameTab {
  return value === 'snake' || value === 'chess' || value === 'tetris';
}

const GAME_OPTIONS: Array<{
  id: GameTab;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'snake',
    label: 'Snake',
    tagline: 'Spatial pathing & reflexes',
    icon: Sparkles,
  },
  {
    id: 'chess',
    label: 'Chess',
    tagline: 'FIDE strategy vs AI or local',
    icon: Crown,
  },
  {
    id: 'tetris',
    label: 'Tetris',
    tagline: 'Geometric pattern stacking',
    icon: Grid2x2,
  },
];

export function GamesSection() {
  const [activeGame, setActiveGame] = useState<GameTab>(
    () => readLocalGameProgress(ACTIVE_GAME_STORAGE_KEY, isGameTab) || 'snake'
  );
  const [isMuted, setIsMuted] = useState(() => gameAudio.muted);

  function handleSelectGame(game: GameTab) {
    setActiveGame(game);
    saveLocalGameProgress(ACTIVE_GAME_STORAGE_KEY, game);
  }

  function handleToggleMute() {
    const next = !isMuted;
    gameAudio.muted = next;
    setIsMuted(next);
  }

  const currentMeta =
    GAME_OPTIONS.find((item) => item.id === activeGame) || GAME_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Arcade Header & Game Selector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B756E] dark:text-[#8FB9B1]">
              <Gamepad2 className="w-4 h-4 shrink-0" />
              <span>Shapes and Patterns NPO · Youth &amp; Team Arcade</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#2B2F36] dark:text-slate-100">
              Logic &amp; Pattern Games
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Interactive spatial, geometric, and strategic games for after-school
              youth clubs, workshop warm-ups, and team breaks. Scores and
              in-progress games are saved on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-pressed={isMuted}
            className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#68978F]" />
            )}
            <span>{isMuted ? 'Sound Off' : 'Sound On'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div
            role="tablist"
            aria-label="Select game"
            className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full"
          >
            {GAME_OPTIONS.map((game) => {
              const Icon = game.icon;
              const isSelected = activeGame === game.id;
              return (
                <button
                  key={game.id}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => handleSelectGame(game.id)}
                  className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#2B2F36] dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{game.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Active Mode: <strong className="text-[#2B2F36] dark:text-slate-200">{currentMeta.label}</strong> · {currentMeta.tagline}
          </span>
        </div>
      </section>

      {/* Active Game Viewport */}
      <div>
        {activeGame === 'snake' && <SnakeGame />}
        {activeGame === 'chess' && <ChessGame />}
        {activeGame === 'tetris' && <TetrisGame />}
      </div>
    </div>
  );
}
