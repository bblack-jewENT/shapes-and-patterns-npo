import type { MemberProfile, PatternTile } from '../types/workspace';

export const ORG_ID = 'shapes-and-patterns-npo' as const;
export const ADMIN_EMAIL = 'mosesrametsi16@gmail.com';
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const LIMITS = {
  idMax: 128,
  displayNameMax: 80,
  titleMax: 120,
  taskTitleMax: 140,
  descriptionMax: 1000,
  patternDescMax: 400,
  commentMax: 600,
  channelNameMax: 60,
  channelTopicMax: 200,
  messageBodyMax: 1000,
  resourceTitleMax: 120,
  resourceSummaryMax: 500,
  urlMax: 500,
  bioMax: 280,
  phoneMax: 32,
  notificationTitleMax: 140,
  notificationMessageMax: 300,
  maxPatternTiles: 96,
} as const;

export function extractMentionedMemberIds(
  body: string,
  members: MemberProfile[]
): string[] {
  const lower = body.toLowerCase();
  if (!lower.includes('@')) return [];

  const matched = new Set<string>();
  for (const member of members) {
    const full = member.displayName.trim().toLowerCase();
    if (!full) continue;
    const first = full.split(/\s+/)[0];
    const compact = full.replace(/\s+/g, '');
    const tokens = [full, compact, first].filter((t) => t.length >= 2);

    const hasMention = tokens.some((token) => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escaped}(?![a-z0-9_])`, 'i');
      return regex.test(lower);
    });

    if (hasMention) {
      matched.add(member.uid);
    }
  }
  return Array.from(matched);
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, LIMITS.idMax);
  return cleaned.length > 0 ? cleaned : `item_${Date.now()}`;
}

export function createDocumentId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return sanitizeId(`${prefix}_${Date.now()}_${random}`);
}

export function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function formatIsoDate(value: string): string {
  const trimmed = value.trim();
  if (DATE_REGEX.test(trimmed)) {
    return trimmed;
  }
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function sanitizeTiles(tiles: PatternTile[]): PatternTile[] {
  return tiles.slice(0, LIMITS.maxPatternTiles).map((tile) => ({
    key: tile.key.slice(0, 16),
    shape: tile.shape,
    color: tile.color,
    rotation: tile.rotation,
  }));
}

export const PILLAR_META = {
  learn: {
    label: 'Learn',
    subtitle: 'STEM & geometric literacy workshops',
    hex: '#68978F',
    textClass: 'text-[#4B756E]',
    dotBg: 'bg-[#68978F]',
    borderClass: 'border-[#68978F]/30',
  },
  create: {
    label: 'Create',
    subtitle: 'Studio kits, patterns & curriculum design',
    hex: '#E8A735',
    textClass: 'text-[#B57B14]',
    dotBg: 'bg-[#E8A735]',
    borderClass: 'border-[#E8A735]/35',
  },
  empower: {
    label: 'Empower',
    subtitle: 'Community outreach & educator mentorship',
    hex: '#C44D34',
    textClass: 'text-[#A83C25]',
    dotBg: 'bg-[#C44D34]',
    borderClass: 'border-[#C44D34]/30',
  },
} as const;

export const BRAND_PALETTE = [
  { name: 'Deep Navy', hex: '#2C3A57' as const },
  { name: 'Sage Teal', hex: '#68978F' as const },
  { name: 'Ochre Amber', hex: '#E8A735' as const },
  { name: 'Terracotta', hex: '#C44D34' as const },
  { name: 'Charcoal', hex: '#2B2F36' as const },
] as const;
