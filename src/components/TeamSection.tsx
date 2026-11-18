import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Crown,
  Grid3x3,
  Landmark,
  Layers,
  Lock,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BOARD_OFFICE_BEARERS,
  ORGANIZATION_IDENTITY,
} from '../data/organizationCharter';
import {
  adminUpdateMemberRole,
  updateOwnMemberProfile,
  updateUserPrivatePrefs,
} from '../lib/workspaceService';
import { ThemeSwitcher } from './ThemeSwitcher';
import type {
  MemberProfile,
  MemberRole,
  NotificationDigest,
  PatternBoard,
  PillarFocus,
  Task,
  ThemeMode,
  UserPrivate,
  WorkspaceSection,
} from '../types/workspace';

interface TeamSectionProps {
  currentUid: string;
  currentMember: MemberProfile | null;
  userPrivate: UserPrivate | null;
  members: MemberProfile[];
  tasks: Task[];
  patterns: PatternBoard[];
  isAdmin: boolean;
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onChangeThemeMode: (mode: ThemeMode) => void;
  onNavigate?: (section: WorkspaceSection) => void;
}

type ContributionChartFilter = 'all' | 'tasks' | 'patterns';
type BadgeFilter = 'all' | 'unlocked' | 'in_progress';

interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Patterns' | 'Tasks' | 'All-Rounder';
  tier: 'Starter' | 'Silver' | 'Gold' | 'Platinum';
  accentHex: string;
  icon: React.ComponentType<{ className?: string }>;
  evaluate: (tasksCompleted: number, patternsCreated: number) => {
    unlocked: boolean;
    current: number;
    target: number;
    progressLabel: string;
    remainingText: string;
    pct: number;
  };
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'pattern-spark',
    title: 'Pattern Spark',
    description: 'Create 1 geometric board in Pattern Studio.',
    category: 'Patterns',
    tier: 'Starter',
    accentHex: '#68978F',
    icon: Sparkles,
    evaluate: (_tasks, patterns) => {
      const target = 1;
      const current = Math.min(patterns, target);
      return {
        unlocked: patterns >= target,
        current: patterns,
        target,
        progressLabel: `${patterns} / ${target} pattern`,
        remainingText:
          patterns >= target ? 'Milestone reached' : `${target - current} pattern to go`,
        pct: Math.min(100, Math.round((patterns / target) * 100)),
      };
    },
  },
  {
    id: 'atelier-builder',
    title: 'Atelier Builder',
    description: 'Create 5 collaborative pattern boards.',
    category: 'Patterns',
    tier: 'Silver',
    accentHex: '#2C3A57',
    icon: Grid3x3,
    evaluate: (_tasks, patterns) => {
      const target = 5;
      return {
        unlocked: patterns >= target,
        current: patterns,
        target,
        progressLabel: `${patterns} / ${target} patterns`,
        remainingText:
          patterns >= target
            ? 'Milestone reached'
            : `${target - patterns} pattern${target - patterns === 1 ? '' : 's'} to go`,
        pct: Math.min(100, Math.round((patterns / target) * 100)),
      };
    },
  },
  {
    id: 'master-patternmaker',
    title: 'Master Patternmaker',
    description: 'Create 10 workshop boards in Pattern Studio.',
    category: 'Patterns',
    tier: 'Gold',
    accentHex: '#E8A735',
    icon: Crown,
    evaluate: (_tasks, patterns) => {
      const target = 10;
      return {
        unlocked: patterns >= target,
        current: patterns,
        target,
        progressLabel: `${patterns} / ${target} patterns`,
        remainingText:
          patterns >= target
            ? 'Milestone reached'
            : `${target - patterns} pattern${target - patterns === 1 ? '' : 's'} to go`,
        pct: Math.min(100, Math.round((patterns / target) * 100)),
      };
    },
  },
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete 1 assigned initiative task.',
    category: 'Tasks',
    tier: 'Starter',
    accentHex: '#68978F',
    icon: CheckCircle2,
    evaluate: (tasks) => {
      const target = 1;
      return {
        unlocked: tasks >= target,
        current: tasks,
        target,
        progressLabel: `${tasks} / ${target} task`,
        remainingText: tasks >= target ? 'Milestone reached' : '1 task to go',
        pct: Math.min(100, Math.round((tasks / target) * 100)),
      };
    },
  },
  {
    id: 'steady-contributor',
    title: 'Steady Contributor',
    description: 'Complete 10 team tasks across initiatives.',
    category: 'Tasks',
    tier: 'Silver',
    accentHex: '#2C3A57',
    icon: ClipboardCheck,
    evaluate: (tasks) => {
      const target = 10;
      return {
        unlocked: tasks >= target,
        current: tasks,
        target,
        progressLabel: `${tasks} / ${target} tasks`,
        remainingText:
          tasks >= target
            ? 'Milestone reached'
            : `${target - tasks} task${target - tasks === 1 ? '' : 's'} to go`,
        pct: Math.min(100, Math.round((tasks / target) * 100)),
      };
    },
  },
  {
    id: 'initiative-pillar',
    title: 'Initiative Pillar',
    description: 'Complete 25 community initiative tasks.',
    category: 'Tasks',
    tier: 'Gold',
    accentHex: '#E8A735',
    icon: Layers,
    evaluate: (tasks) => {
      const target = 25;
      return {
        unlocked: tasks >= target,
        current: tasks,
        target,
        progressLabel: `${tasks} / ${target} tasks`,
        remainingText:
          tasks >= target
            ? 'Milestone reached'
            : `${target - tasks} task${target - tasks === 1 ? '' : 's'} to go`,
        pct: Math.min(100, Math.round((tasks / target) * 100)),
      };
    },
  },
  {
    id: 'half-century-champion',
    title: 'Half-Century Champion',
    description: 'Complete 50 tasks to power NPO programmes.',
    category: 'Tasks',
    tier: 'Platinum',
    accentHex: '#C44D34',
    icon: Trophy,
    evaluate: (tasks) => {
      const target = 50;
      return {
        unlocked: tasks >= target,
        current: tasks,
        target,
        progressLabel: `${tasks} / ${target} tasks`,
        remainingText:
          tasks >= target
            ? 'Milestone reached'
            : `${target - tasks} task${target - tasks === 1 ? '' : 's'} to go`,
        pct: Math.min(100, Math.round((tasks / target) * 100)),
      };
    },
  },
  {
    id: 'npo-all-rounder',
    title: 'Learn · Create · Empower',
    description: 'Complete 5 tasks and create 3 pattern boards.',
    category: 'All-Rounder',
    tier: 'Gold',
    accentHex: '#4B756E',
    icon: Compass,
    evaluate: (tasks, patterns) => {
      const taskRatio = Math.min(1, tasks / 5);
      const patternRatio = Math.min(1, patterns / 3);
      const pct = Math.round(((taskRatio + patternRatio) / 2) * 100);
      const unlocked = tasks >= 5 && patterns >= 3;
      const tasksLeft = Math.max(0, 5 - tasks);
      const patternsLeft = Math.max(0, 3 - patterns);
      const parts: string[] = [];
      if (tasksLeft > 0) parts.push(`${tasksLeft} task${tasksLeft === 1 ? '' : 's'}`);
      if (patternsLeft > 0) parts.push(`${patternsLeft} pattern${patternsLeft === 1 ? '' : 's'}`);
      return {
        unlocked,
        current: Math.min(tasks, 5) + Math.min(patterns, 3),
        target: 8,
        progressLabel: `${Math.min(tasks, 5)}/5 tasks · ${Math.min(patterns, 3)}/3 patterns`,
        remainingText: unlocked ? 'Milestone reached' : `${parts.join(' & ')} to go`,
        pct,
      };
    },
  },
];

interface MemberContributionDatum {
  uid: string;
  shortName: string;
  fullName: string;
  role: string;
  tasksCompleted: number;
  openTasks: number;
  patternsCreated: number;
  totalScore: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: MemberContributionDatum;
  }>;
}

function ContributionTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-md text-xs space-y-1.5 min-w-[190px]">
      <div>
        <p className="font-display font-bold text-[#2B2F36] dark:text-slate-100">
          {datum.fullName}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
          {datum.role}
        </p>
      </div>
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-sm bg-[#68978F]" />
            Tasks Completed
          </span>
          <span className="font-mono-tabular font-semibold text-[#2B2F36] dark:text-slate-100">
            {datum.tasksCompleted}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-sm bg-[#E8A735]" />
            Patterns Created
          </span>
          <span className="font-mono-tabular font-semibold text-[#2B2F36] dark:text-slate-100">
            {datum.patternsCreated}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Open Tasks Assigned</span>
          <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
            {datum.openTasks}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TeamSection({
  currentUid,
  currentMember,
  userPrivate,
  members,
  tasks,
  patterns,
  isAdmin,
  themeMode,
  resolvedTheme,
  onChangeThemeMode,
  onNavigate,
}: TeamSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chartFilter, setChartFilter] = useState<ContributionChartFilter>('all');
  const [badgeMemberUid, setBadgeMemberUid] = useState(currentUid);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [pillarFocus, setPillarFocus] = useState<PillarFocus>('learn');
  const [bio, setBio] = useState('');

  const [phone, setPhone] = useState('');
  const [digest, setDigest] = useState<NotificationDigest>('weekly');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (currentMember) {
      setDisplayName(currentMember.displayName || '');
      setTitle(currentMember.title || '');
      setPillarFocus(currentMember.pillarFocus || 'learn');
      setBio(currentMember.bio || '');
    }
  }, [currentMember]);

  useEffect(() => {
    if (userPrivate) {
      setPhone(userPrivate.phone || '');
      setDigest(userPrivate.notificationDigest || 'weekly');
    }
  }, [userPrivate]);

  const contributionData = useMemo<MemberContributionDatum[]>(() => {
    return members
      .map((member) => {
        const tasksCompleted = tasks.filter(
          (t) => t.assigneeId === member.uid && t.status === 'completed'
        ).length;
        const openTasks = tasks.filter(
          (t) => t.assigneeId === member.uid && t.status !== 'completed'
        ).length;
        const patternsCreated = patterns.filter(
          (p) => p.createdBy === member.uid
        ).length;
        const firstName = member.displayName.trim().split(/\s+/)[0] || member.displayName;
        const shortName =
          firstName.length > 14 ? `${firstName.slice(0, 12)}…` : firstName;
        return {
          uid: member.uid,
          shortName,
          fullName: member.displayName,
          role: member.role,
          tasksCompleted,
          openTasks,
          patternsCreated,
          totalScore: tasksCompleted + patternsCreated,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.openTasks - a.openTasks);
  }, [members, tasks, patterns]);

  const totals = useMemo(() => {
    const completed = contributionData.reduce((acc, m) => acc + m.tasksCompleted, 0);
    const createdPatterns = contributionData.reduce(
      (acc, m) => acc + m.patternsCreated,
      0
    );
    const activeContributors = contributionData.filter(
      (m) => m.totalScore > 0 || m.openTasks > 0
    ).length;
    return { completed, createdPatterns, activeContributors };
  }, [contributionData]);

  const badgeCountByUid = useMemo(() => {
    const map = new Map<string, number>();
    for (const datum of contributionData) {
      const count = BADGE_DEFINITIONS.filter(
        (badge) =>
          badge.evaluate(datum.tasksCompleted, datum.patternsCreated).unlocked
      ).length;
      map.set(datum.uid, count);
    }
    return map;
  }, [contributionData]);

  const activeBadgeMember = useMemo(() => {
    return (
      members.find((m) => m.uid === badgeMemberUid) ||
      currentMember ||
      members[0] ||
      null
    );
  }, [members, badgeMemberUid, currentMember]);

  const activeBadgeDatum = useMemo(() => {
    if (!activeBadgeMember) {
      return { tasksCompleted: 0, patternsCreated: 0 };
    }
    return (
      contributionData.find((item) => item.uid === activeBadgeMember.uid) || {
        tasksCompleted: 0,
        patternsCreated: 0,
      }
    );
  }, [activeBadgeMember, contributionData]);

  const evaluatedBadges = useMemo(() => {
    return BADGE_DEFINITIONS.map((def) => ({
      def,
      progress: def.evaluate(
        activeBadgeDatum.tasksCompleted,
        activeBadgeDatum.patternsCreated
      ),
    }));
  }, [activeBadgeDatum]);

  const unlockedBadgeCount = useMemo(
    () => evaluatedBadges.filter((item) => item.progress.unlocked).length,
    [evaluatedBadges]
  );

  const visibleBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') {
      return evaluatedBadges.filter((item) => item.progress.unlocked);
    }
    if (badgeFilter === 'in_progress') {
      return evaluatedBadges.filter((item) => !item.progress.unlocked);
    }
    return evaluatedBadges;
  }, [evaluatedBadges, badgeFilter]);

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      (m.title || '').toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  async function handleSaveMyProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!currentMember) return;
    setIsSavingProfile(true);
    setSavedNotice(false);
    try {
      await updateOwnMemberProfile({
        uid: currentUid,
        displayName,
        pillarFocus,
        title,
        bio,
      });
      if (userPrivate) {
        await updateUserPrivatePrefs({
          uid: currentUid,
          email: userPrivate.email,
          phone,
          notificationDigest: digest,
        });
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setIsSavingProfile(false);
    }
  }

  const isDark = resolvedTheme === 'dark';
  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="space-y-6">
      {/* Recharts Contribution Analytics Panel */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                Individual Contribution Statistics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Completed tasks and Pattern Studio boards authored across each team member
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter contribution chart series"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full"
          >
            {(
              [
                { id: 'all', label: 'All Metrics' },
                { id: 'tasks', label: 'Tasks Completed' },
                { id: 'patterns', label: 'Patterns Created' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartFilter(tab.id)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap shrink-0 ${
                  chartFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <ClipboardCheck className="w-4 h-4 text-[#68978F]" />
              Total Tasks Completed
            </span>
            <span className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {totals.completed}
            </span>
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Grid3x3 className="w-4 h-4 text-[#E8A735]" />
              Total Patterns Created
            </span>
            <span className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {totals.createdPatterns}
            </span>
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
              Active Contributors
            </span>
            <span className="text-lg font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {totals.activeContributors} / {members.length}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {contributionData.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No collaborator profiles loaded yet.
            </div>
          ) : (
            <div className="w-full h-[230px] sm:h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contributionData}
                  margin={{ top: 10, right: 8, left: -18, bottom: 4 }}
                  barGap={6}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridStroke}
                  />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: tickColor, fontSize: 12 }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: tickColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ContributionTooltip />}
                    cursor={{
                      fill: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.5)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  {(chartFilter === 'all' || chartFilter === 'tasks') && (
                    <Bar
                      dataKey="tasksCompleted"
                      name="Tasks Completed"
                      fill="#68978F"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  )}
                  {(chartFilter === 'all' || chartFilter === 'patterns') && (
                    <Bar
                      dataKey="patternsCreated"
                      name="Patterns Created"
                      fill="#E8A735"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Badges & Achievements Milestone System */}
      <section
        id="badges-achievements-panel"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Award className="w-4 h-4 text-[#E8A735] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                Badges &amp; Achievements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Earn milestone badges for Pattern Studio creations and completed initiative tasks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {members.length > 0 && (
              <select
                aria-label="Select team member for badges"
                value={activeBadgeMember?.uid || currentUid}
                onChange={(e) => setBadgeMemberUid(e.target.value)}
                className="cursor-pointer text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[#2B2F36] dark:text-slate-100"
              >
                {members.map((member) => {
                  const count = badgeCountByUid.get(member.uid) ?? 0;
                  return (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName}
                      {member.uid === currentUid ? ' (You)' : ''} · {count}/
                      {BADGE_DEFINITIONS.length}
                    </option>
                  );
                })}
              </select>
            )}

            <div
              role="group"
              aria-label="Filter badges"
              className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full"
            >
              {(
                [
                  { id: 'all', label: `All (${BADGE_DEFINITIONS.length})` },
                  { id: 'unlocked', label: `Unlocked (${unlockedBadgeCount})` },
                  {
                    id: 'in_progress',
                    label: `In Progress (${BADGE_DEFINITIONS.length - unlockedBadgeCount})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBadgeFilter(tab.id)}
                  className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    badgeFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Collaborator Milestone Summary */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
            <span>
              Viewing:{' '}
              <strong className="text-[#2B2F36] dark:text-slate-100">
                {activeBadgeMember?.displayName || 'Your Profile'}
              </strong>
            </span>
            <span className="font-mono-tabular">
              {unlockedBadgeCount}/{BADGE_DEFINITIONS.length} badges unlocked
            </span>
            <span className="font-mono-tabular">
              {activeBadgeDatum.tasksCompleted} tasks completed ·{' '}
              {activeBadgeDatum.patternsCreated} patterns created
            </span>
          </div>

          {onNavigate && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="cursor-pointer font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap"
              >
                Create Pattern →
              </button>
              <button
                type="button"
                onClick={() => onNavigate('initiatives')}
                className="cursor-pointer font-medium text-[#4B756E] dark:text-[#8FB9B1] hover:underline whitespace-nowrap"
              >
                Complete Tasks →
              </button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {visibleBadges.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {badgeFilter === 'unlocked'
                ? 'No badges unlocked yet for this collaborator. Complete tasks or publish Pattern Studio boards to earn your first milestone.'
                : 'Every available milestone badge has been unlocked.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {visibleBadges.map(({ def, progress }) => {
                const Icon = def.icon;
                return (
                  <article
                    key={def.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                      progress.unlocked
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: progress.unlocked
                              ? `${def.accentHex}1F`
                              : 'rgba(148, 163, 184, 0.14)',
                            color: progress.unlocked ? def.accentHex : '#64748B',
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            progress.unlocked
                              ? 'text-[#4B756E] dark:text-[#8FB9B1]'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {progress.unlocked ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unlocked</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {def.tier} · {def.category}
                        </p>
                        <h3
                          className={`font-display text-sm font-bold mt-0.5 ${
                            progress.unlocked
                              ? 'text-[#2B2F36] dark:text-slate-100'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {def.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {def.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                        <span className="text-slate-600 dark:text-slate-300">
                          {progress.progressLabel}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {progress.pct}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={progress.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${def.title} milestone progress`}
                        className="h-1.5 w-full rounded bg-slate-200/80 dark:bg-slate-800 overflow-hidden"
                      >
                        <div
                          className="h-full rounded transition-[width] duration-300"
                          style={{
                            width: `${progress.pct}%`,
                            backgroundColor: progress.unlocked
                              ? def.accentHex
                              : '#94A3B8',
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {progress.remainingText}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Team Roster */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                Verified Team Directory ({filteredMembers.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Public collaborator directory · Contact details remain isolated to account owners
              </p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find collaborator..."
                className="pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500 w-full sm:w-56"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMembers.map((member) => {
              const memberStats = contributionData.find(
                (item) => item.uid === member.uid
              );
              return (
                <div
                  key={member.uid}
                  className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#2C3A57] dark:bg-[#3B4E73] text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                          {member.displayName}
                        </p>
                        {member.role === 'admin' && (
                          <Shield className="w-3.5 h-3.5 text-[#2C3A57] dark:text-sky-300 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {member.title || 'Team Collaborator'} · Focus:{' '}
                        <span className="capitalize">{member.pillarFocus}</span>
                        {memberStats && (
                          <>
                            {' · '}
                            <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                              {memberStats.tasksCompleted} done · {memberStats.patternsCreated} patterns ·{' '}
                              {badgeCountByUid.get(member.uid) ?? 0}/{BADGE_DEFINITIONS.length} badges
                            </span>
                          </>
                        )}
                      </p>
                      {member.bio && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setBadgeMemberUid(member.uid);
                        document
                          .getElementById('badges-achievements-panel')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                    >
                      <Award className="w-3.5 h-3.5 text-[#E8A735]" />
                      <span className="font-mono-tabular">
                        {badgeCountByUid.get(member.uid) ?? 0}/{BADGE_DEFINITIONS.length}
                      </span>
                    </button>
                    {isAdmin && member.uid !== currentUid ? (
                      <select
                        aria-label={`Role for ${member.displayName}`}
                        value={member.role}
                        onChange={(e) =>
                          void adminUpdateMemberRole(
                            member.uid,
                            e.target.value as MemberRole
                          )
                        }
                        className="cursor-pointer text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 capitalize transition-colors"
                      >
                        <option value="admin">Admin</option>
                        <option value="lead">Lead</option>
                        <option value="educator">Educator</option>
                        <option value="volunteer">Volunteer</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Constitutional Board of Governance Reference */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
                <div>
                  <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                    Board of Governance (Constitutional Office Bearers)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ORGANIZATION_IDENTITY.boardTermYears}-year term · Management Committee meets monthly with simple majority quorum
                  </p>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('organization')}
                  className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                >
                  <span>Full charter & duties</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BOARD_OFFICE_BEARERS.map((bearer) => (
                <div
                  key={bearer.clause}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5"
                >
                  <p className="text-[11px] font-medium text-[#4B756E] dark:text-[#8FB9B1]">
                    {bearer.role}
                  </p>
                  <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100 mt-0.5 truncate">
                    {bearer.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {bearer.duties[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* My Profile & Private Preferences */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6">
          <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100 mb-1">
            My Collaborator Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Update your team card, appearance mode, and private preferences.
          </p>

          <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Appearance Mode
            </span>
            <ThemeSwitcher themeMode={themeMode} onChange={onChangeThemeMode} />
          </div>

          <form onSubmit={(e) => void handleSaveMyProfile(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role Title
              </label>
              <input
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Curriculum Facilitator"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Pillar Focus
              </label>
              <select
                value={pillarFocus}
                onChange={(e) => setPillarFocus(e.target.value as PillarFocus)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
              >
                <option value="learn">Learn</option>
                <option value="create">Create</option>
                <option value="empower">Empower</option>
                <option value="operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Short Bio
              </label>
              <textarea
                rows={2}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Private Account Settings
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Verified Email (Private)
                </label>
                <input
                  type="text"
                  disabled
                  value={userPrivate?.email || ''}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone (Private, Optional)
                </label>
                <input
                  type="tel"
                  maxLength={32}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 ..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Activity Digest
                </label>
                <select
                  value={digest}
                  onChange={(e) => setDigest(e.target.value as NotificationDigest)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                >
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {savedNotice ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4B756E] dark:text-[#8FB9B1]">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 rounded-lg disabled:opacity-60 transition-all duration-150 whitespace-nowrap shrink-0"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
