import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eraser,
  Plus,
  RotateCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { BRAND_PALETTE, PILLAR_META, sanitizeTiles } from '../lib/validation';
import { createPatternBoard, savePatternTiles } from '../lib/workspaceService';
import type {
  BrandColorHex,
  MemberProfile,
  PatternBoard,
  PatternTile,
  Pillar,
  ShapeKind,
} from '../types/workspace';

interface PatternStudioSectionProps {
  currentUid: string;
  currentMember: MemberProfile | null;
  patterns: PatternBoard[];
}

const SHAPES: Array<{ kind: ShapeKind; label: string }> = [
  { kind: 'half-circle', label: 'Half Circle' },
  { kind: 'dot-matrix', label: 'Dot Matrix' },
  { kind: 'quad-grid', label: 'Quad Grid' },
  { kind: 'wave-stack', label: 'Wave Stack' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'square', label: 'Square' },
  { kind: 'triangle', label: 'Triangle' },
];

function renderTileSvgContent(shape: ShapeKind, color: string) {
  switch (shape) {
    case 'half-circle':
      return (
        <>
          <path d="M 8 6 H 26 A 18 18 0 0 1 44 24 H 8 Z" fill={color} />
          <path d="M 8 24 H 44 A 18 18 0 0 1 26 42 H 8 Z" fill="#C44D34" opacity={color === '#C44D34' ? 0.72 : 1} />
        </>
      );
    case 'dot-matrix':
      return (
        <>
          {[0, 1, 2].map((c) =>
            [0, 1, 2].map((r) => (
              <circle key={`${c}-${r}`} cx={12 + c * 12} cy={12 + r * 12} r={4} fill={color} />
            ))
          )}
        </>
      );
    case 'quad-grid':
      return (
        <>
          <rect x="6" y="6" width="18" height="18" fill={color} />
          <rect x="24" y="6" width="18" height="18" fill="#68978F" />
          <rect x="6" y="24" width="18" height="18" fill="#E8A735" />
          <rect x="24" y="24" width="18" height="18" fill="#C44D34" />
        </>
      );
    case 'wave-stack':
      return (
        <>
          {[13, 24, 35].map((y) => (
            <path
              key={y}
              d={`M 6 ${y} Q 15 ${y - 6}, 24 ${y} T 42 ${y}`}
              fill="none"
              stroke={color}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          ))}
        </>
      );
    case 'circle':
      return <circle cx="24" cy="24" r="17" fill={color} />;
    case 'square':
      return <rect x="7" y="7" width="34" height="34" rx="2" fill={color} />;
    case 'triangle':
      return <polygon points="24,6 42,41 6,41" fill={color} />;
  }
}

export function PatternStudioSection({
  currentUid,
  currentMember,
  patterns,
}: PatternStudioSectionProps) {
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [activeShape, setActiveShape] = useState<ShapeKind>('half-circle');
  const [activeColor, setActiveColor] = useState<BrandColorHex>('#2C3A57');
  const [activeRotation, setActiveRotation] = useState<0 | 90 | 180 | 270>(0);
  const [eraserMode, setEraserMode] = useState(false);

  const [draftTiles, setDraftTiles] = useState<PatternTile[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('create');
  const [isCreating, setIsCreating] = useState(false);

  const activePattern = useMemo(() => {
    if (!patterns.length) return null;
    return patterns.find((p) => p.id === selectedPatternId) || patterns[0];
  }, [patterns, selectedPatternId]);

  useEffect(() => {
    if (activePattern && !hasUnsavedChanges) {
      setDraftTiles(activePattern.tiles || []);
    }
  }, [activePattern, hasUnsavedChanges]);

  useEffect(() => {
    if (activePattern && selectedPatternId !== activePattern.id) {
      setSelectedPatternId(activePattern.id);
      setDraftTiles(activePattern.tiles || []);
      setHasUnsavedChanges(false);
    }
  }, [activePattern, selectedPatternId]);

  const tileMap = useMemo(() => {
    const map = new Map<string, PatternTile>();
    for (const tile of draftTiles) {
      map.set(tile.key, tile);
    }
    return map;
  }, [draftTiles]);

  function handleSelectBoard(id: string) {
    const next = patterns.find((p) => p.id === id);
    if (!next) return;
    setSelectedPatternId(id);
    setDraftTiles(next.tiles || []);
    setHasUnsavedChanges(false);
  }

  function handleCellClick(col: number, row: number) {
    if (!activePattern) return;
    const key = `${col}-${row}`;
    const existing = tileMap.get(key);

    if (eraserMode) {
      if (!existing) return;
      setDraftTiles((prev) => prev.filter((t) => t.key !== key));
      setHasUnsavedChanges(true);
      return;
    }

    if (
      existing &&
      existing.shape === activeShape &&
      existing.color === activeColor
    ) {
      const nextRot = (((existing.rotation + 90) % 360) as 0 | 90 | 180 | 270);
      setDraftTiles((prev) =>
        prev.map((t) => (t.key === key ? { ...t, rotation: nextRot } : t))
      );
      setHasUnsavedChanges(true);
      return;
    }

    const updated: PatternTile = {
      key,
      shape: activeShape,
      color: activeColor,
      rotation: activeRotation,
    };

    setDraftTiles((prev) => {
      const filtered = prev.filter((t) => t.key !== key);
      return sanitizeTiles([...filtered, updated]);
    });
    setHasUnsavedChanges(true);
  }

  function handleCellRightClick(e: React.MouseEvent, col: number, row: number) {
    e.preventDefault();
    const key = `${col}-${row}`;
    if (!tileMap.has(key)) return;
    setDraftTiles((prev) => prev.filter((t) => t.key !== key));
    setHasUnsavedChanges(true);
  }

  async function handleSaveBoard() {
    if (!activePattern) return;
    setIsSaving(true);
    try {
      await savePatternTiles({
        patternId: activePattern.id,
        tiles: draftTiles,
        editorName: currentMember?.displayName || 'Studio Collaborator',
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createPatternBoard({
        userId: currentUid,
        editorName: currentMember?.displayName || 'Studio Collaborator',
        title: newTitle,
        description: newDesc,
        pillar: newPillar,
      });
      setSelectedPatternId(id);
      setDraftTiles([]);
      setHasUnsavedChanges(false);
      setNewTitle('');
      setNewDesc('');
      setShowNewModal(false);
    } finally {
      setIsCreating(false);
    }
  }

  function handleExportSvg() {
    if (!activePattern) return;
    const cols = activePattern.cols || 12;
    const rows = activePattern.rows || 8;
    const cellSize = 48;
    const width = cols * cellSize;
    const height = rows * cellSize;

    const svgNodes = draftTiles
      .map((tile) => {
        const [cStr, rStr] = tile.key.split('-');
        const c = Number(cStr);
        const r = Number(rStr);
        if (Number.isNaN(c) || Number.isNaN(r)) return '';
        const x = c * cellSize;
        const y = r * cellSize;
        let inner = '';
        if (tile.shape === 'circle') {
          inner = `<circle cx="24" cy="24" r="17" fill="${tile.color}" />`;
        } else if (tile.shape === 'square') {
          inner = `<rect x="7" y="7" width="34" height="34" rx="2" fill="${tile.color}" />`;
        } else if (tile.shape === 'triangle') {
          inner = `<polygon points="24,6 42,41 6,41" fill="${tile.color}" />`;
        } else if (tile.shape === 'half-circle') {
          inner = `<path d="M 8 6 H 26 A 18 18 0 0 1 44 24 H 8 Z" fill="${tile.color}" /><path d="M 8 24 H 44 A 18 18 0 0 1 26 42 H 8 Z" fill="#C44D34" />`;
        } else if (tile.shape === 'quad-grid') {
          inner = `<rect x="6" y="6" width="18" height="18" fill="${tile.color}" /><rect x="24" y="6" width="18" height="18" fill="#68978F" /><rect x="6" y="24" width="18" height="18" fill="#E8A735" /><rect x="24" y="24" width="18" height="18" fill="#C44D34" />`;
        } else if (tile.shape === 'wave-stack') {
          inner = [13, 24, 35]
            .map(
              (wy) =>
                `<path d="M 6 ${wy} Q 15 ${wy - 6}, 24 ${wy} T 42 ${wy}" fill="none" stroke="${tile.color}" stroke-width="4.5" stroke-linecap="round" />`
            )
            .join('');
        } else if (tile.shape === 'dot-matrix') {
          inner = [0, 1, 2]
            .flatMap((dc) =>
              [0, 1, 2].map(
                (dr) =>
                  `<circle cx="${12 + dc * 12}" cy="${12 + dr * 12}" r="4" fill="${tile.color}" />`
              )
            )
            .join('');
        }
        return `<g transform="translate(${x}, ${y}) rotate(${tile.rotation}, 24, 24)">${inner}</g>`;
      })
      .join('\n  ');

    const svgDoc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  <rect width="${width}" height="${height}" fill="#FFFFFF" />\n  ${svgNodes}\n</svg>`;

    const blob = new Blob([svgDoc], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activePattern.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto min-w-0">
          <select
            aria-label="Select Pattern Board"
            value={activePattern?.id || ''}
            onChange={(e) => handleSelectBoard(e.target.value)}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[#2B2F36] dark:text-slate-100 w-full sm:w-auto sm:min-w-[260px]"
          >
            {patterns.length === 0 ? (
              <option value="">No pattern boards yet</option>
            ) : (
              patterns.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.title} ({PILLAR_META[board.pillar].label})
                </option>
              ))
            )}
          </select>

          {activePattern && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Last saved by {activePattern.lastEditedByName} ·{' '}
              <span className="font-mono-tabular">{draftTiles.length}/96</span> tiles
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Board</span>
          </button>

          {activePattern && (
            <>
              <button
                type="button"
                onClick={handleExportSvg}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export SVG</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSaveBoard()}
                disabled={isSaving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!activePattern ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-12 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Create your team&apos;s first collaborative geometric pattern board to start designing workshop templates together.
          </p>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg"
          >
            Create Pattern Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tool Palette */}
          <aside className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-5 sm:space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Geometric Motifs
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                {SHAPES.map(({ kind, label }) => {
                  const isActive = !eraserMode && activeShape === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        setEraserMode(false);
                        setActiveShape(kind);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-[#2C3A57] dark:border-sky-400 bg-slate-50 dark:bg-slate-800 text-[#2C3A57] dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-white flex items-center justify-center p-0.5">
                        <svg viewBox="0 0 48 48" className="w-7 h-7">
                          {renderTileSvgContent(kind, activeColor)}
                        </svg>
                      </div>
                      <span className="truncate w-full text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                NPO Palette
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {BRAND_PALETTE.map((swatch) => {
                  const selected = !eraserMode && activeColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.name}
                      aria-label={`Select color ${swatch.name}`}
                      onClick={() => {
                        setEraserMode(false);
                        setActiveColor(swatch.hex);
                      }}
                      className={`w-8 h-8 rounded-lg border transition-transform ${
                        selected
                          ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-[#2C3A57] dark:ring-sky-300 border-white scale-105'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rotation</span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveRotation(
                      (((activeRotation + 90) % 360) as 0 | 90 | 180 | 270)
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tabular font-medium text-[#2B2F36] dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{activeRotation}°</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEraserMode((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    eraserMode
                      ? 'border-[#C44D34] bg-red-50 dark:bg-red-950/50 text-[#C44D34] dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Eraser</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTiles([]);
                    setHasUnsavedChanges(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Interactive 12x8 Grid Canvas */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  {activePattern.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activePattern.description || 'Tap any cell to place a motif, tap again to rotate 90°.'}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {PILLAR_META[activePattern.pillar].label} Pillar · 12×8 Matrix
              </span>
            </div>

            <p className="sm:hidden text-[11px] text-slate-500 dark:text-slate-400">
              Swipe horizontally to pan across the 12-column matrix.
            </p>

            <div className="overflow-x-auto pb-1">
              <div
                className="grid gap-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[460px] sm:min-w-[600px]"
                style={{
                  gridTemplateColumns: `repeat(${activePattern.cols || 12}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: activePattern.rows || 8 }).map((_, row) =>
                  Array.from({ length: activePattern.cols || 12 }).map((__, col) => {
                    const key = `${col}-${row}`;
                    const tile = tileMap.get(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCellClick(col, row)}
                        onContextMenu={(e) => handleCellRightClick(e, col, row)}
                        aria-label={`Grid cell column ${col + 1} row ${row + 1}`}
                        className="aspect-square bg-white dark:bg-slate-100 hover:bg-slate-50 dark:hover:bg-white rounded border border-slate-200/70 dark:border-slate-300 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#2C3A57]"
                      >
                        {tile && (
                          <svg
                            viewBox="0 0 48 48"
                            className="w-full h-full"
                            style={{
                              transform: `rotate(${tile.rotation}deg)`,
                              transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          >
                            {renderTileSvgContent(tile.shape, tile.color)}
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Pattern Board Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                New Pattern Board
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateBoard(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Board Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Grade 5 Tessellation Starter"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workshop Context
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe how educators or students will use this pattern..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pillar
                </label>
                <select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value as Pillar)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                >
                  <option value="learn">Learn</option>
                  <option value="create">Create</option>
                  <option value="empower">Empower</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-60"
                >
                  {isCreating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
