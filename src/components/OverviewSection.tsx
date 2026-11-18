import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Grid3x3,
  Landmark,
  MessageSquare,
  Users,
} from 'lucide-react';
import { BrandEmblemImage } from './BrandMark';
import {
  BOARD_OFFICE_BEARERS,
  CONSTITUTIONAL_OBJECTIVES,
  ORGANIZATION_IDENTITY,
} from '../data/organizationCharter';
import { PILLAR_META } from '../lib/validation';
import type {
  Channel,
  MemberProfile,
  PatternBoard,
  Pillar,
  Project,
  ResourceItem,
  Task,
  WorkspaceSection,
} from '../types/workspace';

interface OverviewSectionProps {
  currentMember: MemberProfile | null;
  projects: Project[];
  tasks: Task[];
  patterns: PatternBoard[];
  channels: Channel[];
  resources: ResourceItem[];
  members: MemberProfile[];
  onNavigate: (section: WorkspaceSection) => void;
  onSelectProject?: (project: Project) => void;
  onSelectTask?: (task: Task) => void;
  onSeedWorkspace: () => void;
  isSeeding: boolean;
}

interface RecentActivityItem {
  id: string;
  kind: 'project' | 'task';
  title: string;
  pillar: Pillar;
  statusLabel: string;
  actionLabel: 'Updated' | 'Created';
  actorName: string;
  contextLabel: string;
  timestampMs: number;
  project?: Project;
  task?: Task;
}

function toTimestampMs(ts?: { toMillis?: () => number }): number {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}

function formatActivityTimestamp(ms: number): string {
  if (!ms) return 'Just now';
  const date = new Date(ms);
  const diffMs = Date.now() - ms;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function OverviewSection({
  currentMember,
  projects,
  tasks,
  patterns,
  channels,
  resources,
  members,
  onNavigate,
  onSelectProject,
  onSelectTask,
  onSeedWorkspace,
  isSeeding,
}: OverviewSectionProps) {
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const pillarStats = (['learn', 'create', 'empower'] as Pillar[]).map((pillar) => {
    const pillarProjects = projects.filter((p) => p.pillar === pillar);
    const pillarTasks = tasks.filter((t) => t.pillar === pillar && t.status !== 'completed');
    const pillarPatterns = patterns.filter((pat) => pat.pillar === pillar);
    return {
      pillar,
      meta: PILLAR_META[pillar],
      projectCount: pillarProjects.length,
      openTaskCount: pillarTasks.length,
      patternCount: pillarPatterns.length,
    };
  });

  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    const projectMap = new Map<string, Project>();
    for (const proj of projects) {
      projectMap.set(proj.id, proj);
    }

    const projectItems: RecentActivityItem[] = projects.map((proj) => {
      const createdMs = toTimestampMs(proj.createdAt);
      const updatedMs = toTimestampMs(proj.updatedAt) || createdMs;
      const isUpdated = updatedMs - createdMs > 2000;
      return {
        id: `project-${proj.id}`,
        kind: 'project',
        title: proj.title,
        pillar: proj.pillar,
        statusLabel: proj.status.replace('_', ' '),
        actionLabel: isUpdated ? 'Updated' : 'Created',
        actorName: proj.leadName,
        contextLabel: `Target ${proj.targetDate}`,
        timestampMs: updatedMs,
        project: proj,
      };
    });

    const taskItems: RecentActivityItem[] = tasks.map((task) => {
      const createdMs = toTimestampMs(task.createdAt);
      const updatedMs = toTimestampMs(task.updatedAt) || createdMs;
      const isUpdated = updatedMs - createdMs > 2000;
      const parent = projectMap.get(task.projectId);
      return {
        id: `task-${task.id}`,
        kind: 'task',
        title: task.title,
        pillar: task.pillar,
        statusLabel: task.status.replace('_', ' '),
        actionLabel: isUpdated ? 'Updated' : 'Created',
        actorName: task.assigneeName,
        contextLabel: parent ? parent.title : 'Initiative task',
        timestampMs: updatedMs,
        task,
      };
    });

    return [...projectItems, ...taskItems]
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 5);
  }, [projects, tasks]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome & Mission Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        <div className="lg:col-span-8 space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Shapes and Patterns NPO · Workspace Pulse
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2B2F36] dark:text-slate-100 text-balance">
            Welcome back{currentMember ? `, ${currentMember.displayName}` : ''}.
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            South African non-profit body corporate advancing{' '}
            <strong className="text-[#2B2F36] dark:text-slate-100 font-semibold">Learn</strong>{' '}
            (training, education & youth development),{' '}
            <strong className="text-[#2B2F36] dark:text-slate-100 font-semibold">Create</strong>{' '}
            (workplace programmes, sustainable livelihoods & community events), and{' '}
            <strong className="text-[#2B2F36] dark:text-slate-100 font-semibold">Empower</strong>{' '}
            (women&apos;s development, economic empowerment, healthcare, disability & elderly care).
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('initiatives')}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 shadow-xs"
            >
              Open Initiatives
            </button>
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0"
            >
              Launch Pattern Studio
            </button>
            <button
              type="button"
              onClick={() => onNavigate('organization')}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-[#2C3A57] dark:text-sky-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0"
            >
              Constitution & Charter
            </button>
            {projects.length === 0 && (
              <button
                type="button"
                onClick={onSeedWorkspace}
                disabled={isSeeding}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-[#4B756E] dark:text-[#8FB9B1] bg-white dark:bg-slate-800 border border-[#68978F]/40 hover:bg-slate-100 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {isSeeding ? 'Loading Starter Data...' : 'Populate Starter Workspace'}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex justify-center lg:justify-end">
          <div className="w-full max-w-[180px] sm:max-w-[240px] aspect-square border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white">
            <BrandEmblemImage className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Top KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('initiatives')}
          className="cursor-pointer text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-sm rounded-xl p-5 transition-all duration-150"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Initiatives</span>
            <FolderKanban className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
            {projects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            {openTasks.length} open · {completedTasks.length} completed tasks
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('studio')}
          className="cursor-pointer text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-sm rounded-xl p-5 transition-all duration-150"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Pattern Studio Boards</span>
            <Grid3x3 className="w-4 h-4 text-[#E8A735]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
            {patterns.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Shared 12×8 geometric templates
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('channels')}
          className="cursor-pointer text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-sm rounded-xl p-5 transition-all duration-150"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Team Channels</span>
            <MessageSquare className="w-4 h-4 text-[#68978F]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
            {channels.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {resources.length} shared resources indexed
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('team')}
          className="cursor-pointer text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-sm rounded-xl p-5 transition-all duration-150"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Verified Collaborators</span>
            <Users className="w-4 h-4 text-[#C44D34]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
            {members.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Educators, leads & volunteers
          </p>
        </button>
      </section>

      {/* Three Mission Pillars */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#2B2F36] dark:text-slate-100">
            Mission Pillars
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Learn · Create · Empower
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillarStats.map(({ pillar, meta, projectCount, openTaskCount, patternCount }) => (
            <div
              key={pillar}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: meta.hex }}
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                    {meta.label}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {meta.subtitle}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                <span>
                  {projectCount} initiatives · {openTaskCount} open · {patternCount} boards
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('initiatives')}
                  className="inline-flex items-center gap-1 font-sans font-medium text-[#2C3A57] dark:text-sky-300 hover:underline"
                >
                  <span>View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Organization & Constitution Snapshot */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <Landmark className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#2B2F36] dark:text-slate-100">
                Organization & Constitutional Charter
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ORGANIZATION_IDENTITY.legalNature} · {ORGANIZATION_IDENTITY.jurisdiction} ·
                Adopted {ORGANIZATION_IDENTITY.adoptedDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('organization')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap"
          >
            <span>Explore full constitution</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              10 Constitutional Objectives (Clause 3)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {CONSTITUTIONAL_OBJECTIVES.map((obj) => (
                <div
                  key={obj.clause}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-sm shrink-0"
                    style={{ backgroundColor: PILLAR_META[obj.pillar].hex }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{obj.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-2.5 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Board of Governance ({ORGANIZATION_IDENTITY.boardTermYears}-Year Term)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              {BOARD_OFFICE_BEARERS.slice(0, 4).map((bearer) => (
                <div
                  key={bearer.clause}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-slate-500 dark:text-slate-400">{bearer.role}</span>
                  <span className="font-medium text-[#2B2F36] dark:text-slate-200 truncate">
                    {bearer.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              Plus Treasurer & Vice Treasurer · Financial year-end {ORGANIZATION_IDENTITY.financialYearEnd}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Activity Feed (Last 5 Updates Across All Projects and Tasks) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
            <h2 className="font-display text-base font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
              Recent Activity
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last 5 updates across projects & tasks
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No recent project or task updates recorded yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivity.map((item) => {
              const handleOpen = () => {
                if (item.kind === 'project' && item.project && onSelectProject) {
                  onSelectProject(item.project);
                  return;
                }
                if (item.kind === 'task' && item.task && onSelectTask) {
                  onSelectTask(item.task);
                  return;
                }
                onNavigate('initiatives');
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleOpen}
                  className="w-full text-left px-4 sm:px-6 py-4 flex items-start justify-between gap-3 sm:gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {item.kind === 'project' ? (
                        <FolderKanban className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
                      ) : (
                        <ClipboardCheck className="w-4 h-4 text-[#68978F]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.actionLabel} {item.kind === 'project' ? 'initiative' : 'task'}
                        </span>
                        {' · '}
                        {PILLAR_META[item.pillar].label}
                        {' · '}
                        <span className="capitalize">{item.statusLabel}</span>
                        {' · '}
                        {item.actorName}
                        {' · '}
                        {item.contextLabel}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {formatActivityTimestamp(item.timestampMs)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Initiatives & Open Priority Tasks */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-[#2B2F36] dark:text-slate-100">
              Active Initiatives
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('initiatives')}
              className="text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap"
            >
              Manage all
            </button>
          </div>
          {projects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No initiatives created yet. Start by creating an initiative or populating starter workspace data.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3 sm:gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                      {project.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {PILLAR_META[project.pillar].label} · Lead: {project.leadName} · Target{' '}
                      <span className="font-mono-tabular">{project.targetDate}</span>
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize whitespace-nowrap shrink-0">
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-[#2B2F36] dark:text-slate-100">
              Priority Action Queue
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('initiatives')}
              className="text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap"
            >
              Open board
            </button>
          </div>
          {openTasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All tasks are completed or no tasks have been added yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {openTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2B2F36] dark:text-slate-100 truncate">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {PILLAR_META[task.pillar].label} · {task.assigneeName} · Due{' '}
                      <span className="font-mono-tabular">{task.dueDate}</span>
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium capitalize whitespace-nowrap shrink-0 ${
                      task.priority === 'high'
                        ? 'text-[#C44D34] dark:text-[#E87A64]'
                        : task.priority === 'medium'
                          ? 'text-[#B57B14] dark:text-[#E8A735]'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
