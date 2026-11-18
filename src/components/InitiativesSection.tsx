import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FolderKanban,
  ListChecks,
  MessageCircle,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
  extractMentionedMemberIds,
  ORG_ID,
  PILLAR_META,
} from '../lib/validation';
import {
  addProjectComment,
  addTaskComment,
  createProject,
  createTask,
  createWorkspaceNotification,
  deleteTask,
  updateProjectStatus,
  updateTaskStatusAndAssignee,
} from '../lib/workspaceService';
import type {
  MemberProfile,
  Pillar,
  Project,
  ProjectComment,
  ProjectStatus,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '../types/workspace';

interface InitiativesSectionProps {
  currentUid: string;
  currentMember: MemberProfile | null;
  projects: Project[];
  tasks: Task[];
  members: MemberProfile[];
  isAdmin: boolean;
  focusedProjectId?: string | null;
  focusedTaskId?: string | null;
  openProjectDrawerId?: string | null;
  onClearFocus?: () => void;
}

const TASK_STATUS_COLUMNS: Array<{ key: TaskStatus; label: string }> = [
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'In Review' },
  { key: 'completed', label: 'Completed' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseIsoDateLocal(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function toIsoDateLocal(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDeadlineStatus(dateStr: string, todayIso: string, isDone: boolean) {
  if (isDone) {
    return { label: 'Completed', tone: 'done' as const };
  }
  const target = parseIsoDateLocal(dateStr);
  const today = parseIsoDateLocal(todayIso);
  if (!target || !today) {
    return { label: dateStr, tone: 'normal' as const };
  }
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return {
      label: `Overdue · ${Math.abs(diffDays)}d`,
      tone: 'overdue' as const,
    };
  }
  if (diffDays === 0) {
    return { label: 'Due today', tone: 'soon' as const };
  }
  if (diffDays <= 7) {
    return { label: `In ${diffDays}d`, tone: 'soon' as const };
  }
  return { label: `In ${diffDays}d`, tone: 'normal' as const };
}

export function InitiativesSection({
  currentUid,
  currentMember,
  projects,
  tasks,
  members,
  isAdmin,
  focusedProjectId,
  focusedTaskId,
  openProjectDrawerId,
  onClearFocus,
}: InitiativesSectionProps) {
  const [pillarFilter, setPillarFilter] = useState<'all' | Pillar>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'table' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');

  const todayIso = useMemo(() => toIsoDateLocal(new Date()), []);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() =>
    toIsoDateLocal(new Date())
  );

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Project form state
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projPillar, setProjPillar] = useState<Pillar>('learn');
  const [projTargetDate, setProjTargetDate] = useState('2026-12-30');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Task form state
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState(currentUid);
  const [taskDueDate, setTaskDueDate] = useState('2026-12-10');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Comments drawer state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Project comments drawer state
  const [projectComments, setProjectComments] = useState<ProjectComment[]>([]);
  const [projectCommentBody, setProjectCommentBody] = useState('');
  const [isSendingProjectComment, setIsSendingProjectComment] = useState(false);

  useEffect(() => {
    if (!taskProjectId && projects.length > 0) {
      setTaskProjectId(projects[0].id);
    }
  }, [projects, taskProjectId]);

  useEffect(() => {
    if (focusedProjectId) {
      setSelectedProjectId(focusedProjectId);
      setPillarFilter('all');
      onClearFocus?.();
    }
  }, [focusedProjectId, onClearFocus]);

  useEffect(() => {
    if (openProjectDrawerId) {
      const target = projects.find((p) => p.id === openProjectDrawerId);
      if (target) {
        setActiveProject(target);
        setSelectedProjectId(target.id);
        setPillarFilter('all');
      }
      onClearFocus?.();
    }
  }, [openProjectDrawerId, projects, onClearFocus]);

  useEffect(() => {
    if (focusedTaskId) {
      const target = tasks.find((t) => t.id === focusedTaskId);
      if (target) {
        setActiveTask(target);
        setPillarFilter('all');
      }
      onClearFocus?.();
    }
  }, [focusedTaskId, tasks, onClearFocus]);

  useEffect(() => {
    if (!activeTask) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'tasks', activeTask.id, 'comments'),
      where('orgId', '==', ORG_ID),
      where('taskId', '==', activeTask.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as TaskComment);
        list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? Date.now()) -
            (b.createdAt?.toMillis?.() ?? Date.now())
        );
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `tasks/${activeTask.id}/comments`);
      }
    );

    return () => unsubscribe();
  }, [activeTask]);

  useEffect(() => {
    if (!activeProject) {
      setProjectComments([]);
      return;
    }

    const q = query(
      collection(db, 'projects', activeProject.id, 'comments'),
      where('orgId', '==', ORG_ID),
      where('projectId', '==', activeProject.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as ProjectComment);
        list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? Date.now()) -
            (b.createdAt?.toMillis?.() ?? Date.now())
        );
        setProjectComments(list);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `projects/${activeProject.id}/comments`
        );
      }
    );

    return () => unsubscribe();
  }, [activeProject]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (pillarFilter !== 'all' && p.pillar !== pillarFilter) return false;
      if (
        searchQuery.trim() &&
        !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [projects, pillarFilter, searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (pillarFilter !== 'all' && t.pillar !== pillarFilter) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (
        searchQuery.trim() &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, pillarFilter, selectedProjectId, searchQuery]);

  const projectLookup = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const calendarProjects = useMemo(() => {
    if (selectedProjectId === 'all') return filteredProjects;
    return filteredProjects.filter((p) => p.id === selectedProjectId);
  }, [filteredProjects, selectedProjectId]);

  const calendarDayMap = useMemo(() => {
    const map = new Map<string, { projects: Project[]; tasks: Task[] }>();
    const ensure = (dateKey: string) => {
      let bucket = map.get(dateKey);
      if (!bucket) {
        bucket = { projects: [], tasks: [] };
        map.set(dateKey, bucket);
      }
      return bucket;
    };

    for (const project of calendarProjects) {
      if (parseIsoDateLocal(project.targetDate)) {
        ensure(project.targetDate).projects.push(project);
      }
    }
    for (const task of filteredTasks) {
      if (parseIsoDateLocal(task.dueDate)) {
        ensure(task.dueDate).tasks.push(task);
      }
    }
    return map;
  }, [calendarProjects, filteredTasks]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: Array<{
      iso: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(year, month, 1 - startOffset + i);
      cells.push({
        iso: toIsoDateLocal(cellDate),
        dayNumber: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === month,
      });
    }
    return cells;
  }, [calendarMonth]);

  const currentMonthStats = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

    let projectCount = 0;
    let taskCount = 0;
    let overdueCount = 0;

    for (const project of calendarProjects) {
      if (project.targetDate.startsWith(monthPrefix)) {
        projectCount += 1;
      }
      if (project.status !== 'completed' && project.targetDate < todayIso) {
        overdueCount += 1;
      }
    }

    for (const task of filteredTasks) {
      if (task.dueDate.startsWith(monthPrefix)) {
        taskCount += 1;
      }
      if (task.status !== 'completed' && task.dueDate < todayIso) {
        overdueCount += 1;
      }
    }

    return { projectCount, taskCount, overdueCount };
  }, [calendarMonth, calendarProjects, filteredTasks, todayIso]);

  const upcomingTimeline = useMemo(() => {
    type TimelineItem =
      | {
          kind: 'project';
          id: string;
          date: string;
          title: string;
          pillar: Pillar;
          ownerName: string;
          isDone: boolean;
          project: Project;
        }
      | {
          kind: 'task';
          id: string;
          date: string;
          title: string;
          pillar: Pillar;
          ownerName: string;
          isDone: boolean;
          task: Task;
          parentTitle: string;
        };

    const items: TimelineItem[] = [];
    for (const project of calendarProjects) {
      if (!parseIsoDateLocal(project.targetDate)) continue;
      items.push({
        kind: 'project',
        id: `p-${project.id}`,
        date: project.targetDate,
        title: project.title,
        pillar: project.pillar,
        ownerName: project.leadName,
        isDone: project.status === 'completed',
        project,
      });
    }
    for (const task of filteredTasks) {
      if (!parseIsoDateLocal(task.dueDate)) continue;
      items.push({
        kind: 'task',
        id: `t-${task.id}`,
        date: task.dueDate,
        title: task.title,
        pillar: task.pillar,
        ownerName: task.assigneeName,
        isDone: task.status === 'completed',
        task,
        parentTitle: projectLookup.get(task.projectId)?.title || 'Initiative',
      });
    }

    items.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return a.date.localeCompare(b.date);
    });

    return items;
  }, [calendarProjects, filteredTasks, projectLookup]);

  const nextUpcomingDeadlineDate = useMemo(() => {
    const nextOpen =
      upcomingTimeline.find((item) => !item.isDone && item.date >= todayIso) ||
      upcomingTimeline.find((item) => !item.isDone) ||
      upcomingTimeline[0];
    return nextOpen ? parseIsoDateLocal(nextOpen.date) : null;
  }, [upcomingTimeline, todayIso]);

  const selectedDayItems = useMemo(() => {
    return (
      calendarDayMap.get(selectedCalendarDate) || {
        projects: [],
        tasks: [],
      }
    );
  }, [calendarDayMap, selectedCalendarDate]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projTitle.trim()) return;
    setIsSubmittingProject(true);
    try {
      await createProject({
        userId: currentUid,
        leadId: currentUid,
        leadName: currentMember?.displayName || 'Program Lead',
        title: projTitle,
        description: projDesc,
        pillar: projPillar,
        status: 'active',
        targetDate: projTargetDate,
      });
      setProjTitle('');
      setProjDesc('');
      setShowProjectModal(false);
    } finally {
      setIsSubmittingProject(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const targetProject = projects.find((p) => p.id === taskProjectId) || projects[0];
    if (!targetProject || !taskTitle.trim()) return;

    const assignee = members.find((m) => m.uid === taskAssigneeId);
    const assignedUid = assignee?.uid || currentUid;
    const senderName = currentMember?.displayName || 'Team Member';
    setIsSubmittingTask(true);
    try {
      const createdTaskId = await createTask({
        userId: currentUid,
        projectId: targetProject.id,
        title: taskTitle,
        description: taskDesc,
        pillar: targetProject.pillar,
        status: 'planned',
        priority: taskPriority,
        assigneeId: assignedUid,
        assigneeName: assignee?.displayName || senderName,
        dueDate: taskDueDate,
      });

      if (assignedUid) {
        await createWorkspaceNotification({
          recipientId: assignedUid,
          senderId: currentUid,
          senderName,
          type: 'task_assigned',
          title: `Task assigned: ${taskTitle}`,
          message: `You were assigned to "${taskTitle}" under ${targetProject.title}.`,
          projectId: targetProject.id,
          taskId: createdTaskId,
        });
      }

      setTaskTitle('');
      setTaskDesc('');
      setShowTaskModal(false);
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleTaskStatusChange(task: Task, nextStatus: TaskStatus) {
    if (task.status === 'completed' && !isAdmin) {
      return;
    }
    await updateTaskStatusAndAssignee(task.id, {
      status: nextStatus,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
    });
    if (activeTask?.id === task.id) {
      setActiveTask({ ...task, status: nextStatus });
    }
  }

  async function handleTaskAssigneeChange(task: Task, nextAssigneeId: string) {
    if (task.status === 'completed' && !isAdmin) {
      return;
    }
    const assignee = members.find((m) => m.uid === nextAssigneeId);
    const nextName = assignee?.displayName || 'Unassigned';
    await updateTaskStatusAndAssignee(task.id, {
      status: task.status,
      assigneeId: nextAssigneeId,
      assigneeName: nextName,
    });
    if (nextAssigneeId && nextAssigneeId !== task.assigneeId) {
      await createWorkspaceNotification({
        recipientId: nextAssigneeId,
        senderId: currentUid,
        senderName: currentMember?.displayName || 'Team Member',
        type: 'task_assigned',
        title: `Task assigned: ${task.title}`,
        message: `You were assigned to "${task.title}".`,
        projectId: task.projectId,
        taskId: task.id,
      });
    }
    if (activeTask?.id === task.id) {
      setActiveTask({ ...task, assigneeId: nextAssigneeId, assigneeName: nextName });
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTask || !commentBody.trim()) return;
    const senderName = currentMember?.displayName || 'Team Member';
    const bodyText = commentBody;
    setIsSendingComment(true);
    try {
      await addTaskComment({
        taskId: activeTask.id,
        authorId: currentUid,
        authorName: senderName,
        body: bodyText,
      });

      const mentionedIds = extractMentionedMemberIds(bodyText, members);
      await Promise.all(
        mentionedIds.map((recipientId) =>
          createWorkspaceNotification({
            recipientId,
            senderId: currentUid,
            senderName,
            type: 'comment_mention',
            title: `Mentioned in "${activeTask.title}"`,
            message: bodyText,
            projectId: activeTask.projectId,
            taskId: activeTask.id,
          })
        )
      );

      setCommentBody('');
    } finally {
      setIsSendingComment(false);
    }
  }

  async function handleSendProjectComment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !projectCommentBody.trim()) return;
    const senderName = currentMember?.displayName || 'Team Member';
    const bodyText = projectCommentBody;
    setIsSendingProjectComment(true);
    try {
      await addProjectComment({
        projectId: activeProject.id,
        authorId: currentUid,
        authorName: senderName,
        body: bodyText,
      });

      const mentionedIds = extractMentionedMemberIds(bodyText, members);
      await Promise.all(
        mentionedIds.map((recipientId) =>
          createWorkspaceNotification({
            recipientId,
            senderId: currentUid,
            senderName,
            type: 'comment_mention',
            title: `Mentioned in project "${activeProject.title}"`,
            message: bodyText,
            projectId: activeProject.id,
            taskId: '',
          })
        )
      );

      setProjectCommentBody('');
    } finally {
      setIsSendingProjectComment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto min-w-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full">
            {(['all', 'learn', 'create', 'empower'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPillarFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  pillarFilter === tab
                    ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                {tab === 'all' ? 'All Pillars' : PILLAR_META[tab].label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search initiatives or tasks..."
              className="pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500 w-full sm:w-60"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Task Calendar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowProjectModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Initiative</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTaskModal(true)}
            disabled={projects.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Initiatives Horizontal Selector */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
            Initiatives ({filteredProjects.length})
          </h2>
          {selectedProjectId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedProjectId('all')}
              className="text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline"
            >
              Show tasks from all initiatives
            </button>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No initiatives match this filter. Create a new initiative to begin coordinating tasks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const projTaskCount = tasks.filter((t) => t.projectId === project.id).length;
              const projDoneCount = tasks.filter(
                (t) => t.projectId === project.id && t.status === 'completed'
              ).length;
              const completionPct =
                projTaskCount > 0
                  ? Math.round((projDoneCount / projTaskCount) * 100)
                  : 0;
              const canEditStatus =
                project.status !== 'completed' || isAdmin;

              return (
                <div
                  key={project.id}
                  onClick={() =>
                    setSelectedProjectId(isSelected ? 'all' : project.id)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedProjectId(isSelected ? 'all' : project.id);
                    }
                  }}
                  className={`cursor-pointer bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border transition-colors ${
                    isSelected
                      ? 'border-[#2C3A57] dark:border-sky-400 ring-1 ring-[#2C3A57] dark:ring-sky-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {PILLAR_META[project.pillar].label} · Target{' '}
                        <span className="font-mono-tabular">{project.targetDate}</span>
                      </p>
                      <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100 truncate">
                        {project.title}
                      </h3>
                    </div>
                    <select
                      aria-label={`Status for ${project.title}`}
                      value={project.status}
                      disabled={!canEditStatus}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        void updateProjectStatus(project.id, e.target.value as ProjectStatus)
                      }
                      className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Visual Task Completion Progress Bar */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {projTaskCount === 0
                          ? 'No tasks linked yet'
                          : completionPct === 100
                            ? 'All tasks completed'
                            : 'Completion progress'}
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#2B2F36] dark:text-slate-200">
                        {completionPct}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={completionPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${project.title} completion progress`}
                      className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    >
                      <div
                        className="h-full rounded transition-[width] duration-300"
                        style={{
                          width: `${completionPct}%`,
                          backgroundColor:
                            completionPct === 100
                              ? '#4B756E'
                              : PILLAR_META[project.pillar].hex,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Lead: {project.leadName}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveProject(project);
                        }}
                        className="inline-flex items-center gap-1 font-medium text-[#2C3A57] dark:text-sky-300 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Comments</span>
                      </button>
                      <span className="font-mono-tabular">
                        {projDoneCount}/{projTaskCount} done
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tasks Board, Table, or Calendar */}
      {viewMode === 'board' && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {TASK_STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3"
              >
                <div className="px-1 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                {colTasks.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No tasks in {col.label.toLowerCase()}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {colTasks.map((task) => {
                      const parent = projectLookup.get(task.projectId);
                      const isLocked = task.status === 'completed' && !isAdmin;
                      return (
                        <div
                          key={task.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTask(task)}
                              className="text-left text-sm font-semibold text-[#2B2F36] dark:text-slate-100 hover:text-[#2C3A57] dark:hover:text-sky-300 leading-snug"
                            >
                              {task.title}
                            </button>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {PILLAR_META[task.pillar].label} ·{' '}
                            {parent ? parent.title : 'Initiative'}
                          </p>

                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span
                              className={`font-medium capitalize ${
                                task.priority === 'high'
                                  ? 'text-[#C44D34] dark:text-[#E87A64]'
                                  : task.priority === 'medium'
                                    ? 'text-[#B57B14] dark:text-[#E8A735]'
                                    : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {task.priority} priority
                            </span>
                            <span className="font-mono-tabular">{task.dueDate}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                              {task.assigneeName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label={`Move ${task.title}`}
                                value={task.status}
                                disabled={isLocked}
                                onChange={(e) =>
                                  void handleTaskStatusChange(
                                    task,
                                    e.target.value as TaskStatus
                                  )
                                }
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                              >
                                <option value="planned">Planned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">In Review</option>
                                <option value="completed">Completed</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setActiveTask(task)}
                                aria-label="Open task details"
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-[#2C3A57] dark:hover:text-sky-300 rounded"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {viewMode === 'table' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/60">
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Initiative &amp; Pillar</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No tasks found for the current filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const parent = projectLookup.get(task.projectId);
                  const isLocked = task.status === 'completed' && !isAdmin;
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-medium text-[#2B2F36] dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => setActiveTask(task)}
                          className="hover:text-[#2C3A57] dark:hover:text-sky-300 hover:underline text-left"
                        >
                          {task.title}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {PILLAR_META[task.pillar].label} · {parent?.title || 'Initiative'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                        {task.assigneeName}
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize">
                        <span
                          className={
                            task.priority === 'high'
                              ? 'text-[#C44D34] dark:text-[#E87A64] font-medium'
                              : task.priority === 'medium'
                                ? 'text-[#B57B14] dark:text-[#E8A735] font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={task.status}
                          disabled={isLocked}
                          onChange={(e) =>
                            void handleTaskStatusChange(task, e.target.value as TaskStatus)
                          }
                          className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
                        {task.dueDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {viewMode === 'calendar' && (
        <section aria-label="Task Calendar" className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Calendar Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                  {calendarMonth.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {currentMonthStats.projectCount} initiative target
                  {currentMonthStats.projectCount === 1 ? '' : 's'} ·{' '}
                  {currentMonthStats.taskCount} task due date
                  {currentMonthStats.taskCount === 1 ? '' : 's'}
                  {currentMonthStats.overdueCount > 0 && (
                    <span className="text-[#C44D34] dark:text-[#E87A64] font-semibold">
                      {' '}
                      · {currentMonthStats.overdueCount} overdue overall
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentMonthStats.projectCount + currentMonthStats.taskCount === 0 &&
                  nextUpcomingDeadlineDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarMonth(
                          new Date(
                            nextUpcomingDeadlineDate.getFullYear(),
                            nextUpcomingDeadlineDate.getMonth(),
                            1
                          )
                        );
                        setSelectedCalendarDate(
                          toIsoDateLocal(nextUpcomingDeadlineDate)
                        );
                      }}
                      className="cursor-pointer px-3 py-1.5 text-xs font-medium text-[#2C3A57] dark:text-sky-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Jump to Next Deadline
                    </button>
                  )}

                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="cursor-pointer p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedCalendarDate(toIsoDateLocal(now));
                    }}
                    className="cursor-pointer px-3 py-1.5 text-xs font-medium text-[#2B2F36] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 border-x border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="cursor-pointer p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Legend */}
            <div className="px-4 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#2C3A57] dark:text-sky-300" />
                <span>Initiative Target</span>
              </span>
              {(['learn', 'create', 'empower'] as const).map((pillar) => (
                <span key={pillar} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: PILLAR_META[pillar].hex }}
                    aria-hidden="true"
                  />
                  <span>{PILLAR_META[pillar].label} Task</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[#C44D34] dark:text-[#E87A64]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue</span>
              </span>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
              {calendarCells.map((cell) => {
                const dayData = calendarDayMap.get(cell.iso);
                const dayProjects = dayData?.projects || [];
                const dayTasks = dayData?.tasks || [];
                const totalCount = dayProjects.length + dayTasks.length;
                const isToday = cell.iso === todayIso;
                const isSelected = cell.iso === selectedCalendarDate;
                const hasOverdue =
                  dayProjects.some(
                    (p) => p.status !== 'completed' && p.targetDate < todayIso
                  ) ||
                  dayTasks.some(
                    (t) => t.status !== 'completed' && t.dueDate < todayIso
                  );

                const previewItems: Array<
                  | { kind: 'project'; project: Project }
                  | { kind: 'task'; task: Task }
                > = [
                  ...dayProjects.map((project) => ({
                    kind: 'project' as const,
                    project,
                  })),
                  ...dayTasks.map((task) => ({ kind: 'task' as const, task })),
                ];
                const visibleDesktop = previewItems.slice(0, 3);
                const extraCount = Math.max(0, previewItems.length - 3);

                return (
                  <div
                    key={cell.iso}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCalendarDate(cell.iso)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCalendarDate(cell.iso);
                      }
                    }}
                    aria-label={`${cell.iso}, ${totalCount} deadline${
                      totalCount === 1 ? '' : 's'
                    }`}
                    className={`cursor-pointer min-h-[60px] md:min-h-[112px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors text-left focus-visible:outline-2 focus-visible:outline-[#2C3A57] ${
                      !cell.inCurrentMonth
                        ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    } ${
                      isSelected
                        ? 'ring-2 ring-inset ring-[#2C3A57] dark:ring-sky-400 bg-slate-50/90 dark:bg-slate-800/60'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono-tabular text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-md ${
                          isToday
                            ? 'bg-[#2C3A57] dark:bg-sky-500 text-white'
                            : cell.inCurrentMonth
                              ? 'text-[#2B2F36] dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {hasOverdue && (
                        <AlertCircle
                          className="w-3.5 h-3.5 text-[#C44D34] dark:text-[#E87A64] shrink-0"
                          aria-label="Contains overdue items"
                        />
                      )}
                    </div>

                    {/* Mobile Compact Indicators (< md) */}
                    {totalCount > 0 && (
                      <div className="md:hidden mt-1.5 flex flex-wrap items-center gap-1">
                        {dayProjects.length > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-mono-tabular font-semibold text-[#2C3A57] dark:text-sky-300"
                            title={`${dayProjects.length} initiative target(s)`}
                          >
                            <span className="w-2 h-2 rounded-xs bg-[#2C3A57] dark:bg-sky-400" />
                            {dayProjects.length}
                          </span>
                        )}
                        {dayTasks.length > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-mono-tabular font-semibold text-[#4B756E] dark:text-[#8FB9B1]"
                            title={`${dayTasks.length} task due`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#68978F]" />
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop/Tablet Detailed Items (md+) */}
                    <div className="hidden md:flex flex-col gap-1 mt-1.5 min-w-0">
                      {visibleDesktop.map((entry) => {
                        if (entry.kind === 'project') {
                          const proj = entry.project;
                          const isOverdue =
                            proj.status !== 'completed' && proj.targetDate < todayIso;
                          return (
                            <button
                              key={`proj-${proj.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendarDate(cell.iso);
                                setActiveProject(proj);
                              }}
                              className={`cursor-pointer w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border transition-colors ${
                                proj.status === 'completed'
                                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 line-through'
                                  : isOverdue
                                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-[#A83C25] dark:text-red-300'
                                    : 'bg-[#2C3A57]/8 dark:bg-sky-950/50 border-[#2C3A57]/20 dark:border-sky-800 text-[#2C3A57] dark:text-sky-200 hover:bg-[#2C3A57]/15'
                              }`}
                              title={`Initiative Target: ${proj.title}`}
                            >
                              <FolderKanban className="w-3 h-3 shrink-0" />
                              <span className="truncate">{proj.title}</span>
                            </button>
                          );
                        }
                        const task = entry.task;
                        const isOverdue =
                          task.status !== 'completed' && task.dueDate < todayIso;
                        return (
                          <button
                            key={`task-${task.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCalendarDate(cell.iso);
                              setActiveTask(task);
                            }}
                            className={`cursor-pointer w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1.5 border transition-colors ${
                              task.status === 'completed'
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                : isOverdue
                                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-[#A83C25] dark:text-red-300'
                                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            title={`Task Due: ${task.title}`}
                          >
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: PILLAR_META[task.pillar].hex }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{task.title}</span>
                          </button>
                        );
                      })}
                      {extraCount > 0 && (
                        <span className="text-[10px] font-mono-tabular font-medium text-slate-500 dark:text-slate-400 pl-1">
                          +{extraCount} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Schedule & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-[#2B2F36] dark:text-slate-100">
                    {(parseIsoDateLocal(selectedCalendarDate) || new Date()).toLocaleDateString(
                      undefined,
                      {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                    {selectedDayItems.projects.length} initiative target
                    {selectedDayItems.projects.length === 1 ? '' : 's'} ·{' '}
                    {selectedDayItems.tasks.length} task
                    {selectedDayItems.tasks.length === 1 ? '' : 's'} due
                  </p>
                </div>

                <button
                  type="button"
                  disabled={projects.length === 0}
                  onClick={() => {
                    setTaskDueDate(selectedCalendarDate);
                    setShowTaskModal(true);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Task</span>
                </button>
              </div>

              {selectedDayItems.projects.length === 0 &&
              selectedDayItems.tasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No project target dates or task deadlines on{' '}
                  <span className="font-mono-tabular">{selectedCalendarDate}</span>.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayItems.projects.map((proj) => {
                    const statusInfo = getDeadlineStatus(
                      proj.targetDate,
                      todayIso,
                      proj.status === 'completed'
                    );
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => setActiveProject(proj)}
                        className="cursor-pointer w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-[#2C3A57] dark:hover:border-sky-400 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#2C3A57] dark:text-sky-300">
                            <FolderKanban className="w-3.5 h-3.5" />
                            <span>Initiative Target</span>
                          </span>
                          <span
                            className={`font-mono-tabular font-medium ${
                              statusInfo.tone === 'overdue'
                                ? 'text-[#C44D34] dark:text-[#E87A64]'
                                : statusInfo.tone === 'soon'
                                  ? 'text-[#B57B14] dark:text-[#E8A735]'
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                          {proj.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {PILLAR_META[proj.pillar].label} · Lead: {proj.leadName}
                        </p>
                      </button>
                    );
                  })}

                  {selectedDayItems.tasks.map((task) => {
                    const parent = projectLookup.get(task.projectId);
                    const statusInfo = getDeadlineStatus(
                      task.dueDate,
                      todayIso,
                      task.status === 'completed'
                    );
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setActiveTask(task)}
                        className="cursor-pointer w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#2C3A57] dark:hover:border-sky-400 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: PILLAR_META[task.pillar].hex }}
                              aria-hidden="true"
                            />
                            <span>Task · {PILLAR_META[task.pillar].label}</span>
                          </span>
                          <span
                            className={`font-mono-tabular font-medium ${
                              statusInfo.tone === 'overdue'
                                ? 'text-[#C44D34] dark:text-[#E87A64]'
                                : statusInfo.tone === 'soon'
                                  ? 'text-[#B57B14] dark:text-[#E8A735]'
                                  : statusInfo.tone === 'done'
                                    ? 'text-[#4B756E] dark:text-[#8FB9B1]'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            task.status === 'completed'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-[#2B2F36] dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {parent?.title || 'Initiative'} · {task.assigneeName}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-[#68978F]" />
                  <h4 className="font-display text-sm sm:text-base font-bold text-[#2B2F36] dark:text-slate-100">
                    Upcoming &amp; Overdue Timeline
                  </h4>
                </div>
                <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                  {upcomingTimeline.length} scheduled
                </span>
              </div>

              {upcomingTimeline.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No dated initiatives or tasks match the active filters.
                </p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingTimeline.map((item) => {
                    const statusInfo = getDeadlineStatus(
                      item.date,
                      todayIso,
                      item.isDone
                    );
                    const parsed = parseIsoDateLocal(item.date);
                    return (
                      <div
                        key={item.id}
                        className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-[#2B2F36] dark:text-slate-200">
                              {item.kind === 'project' ? 'Initiative' : 'Task'}
                            </span>
                            <span>·</span>
                            <span>{PILLAR_META[item.pillar].label}</span>
                            {item.kind === 'task' && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[180px]">
                                  {item.parentTitle}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.kind === 'project') {
                                setActiveProject(item.project);
                              } else {
                                setActiveTask(item.task);
                              }
                            }}
                            className={`cursor-pointer text-left text-sm font-semibold hover:text-[#2C3A57] dark:hover:text-sky-300 hover:underline truncate block max-w-full ${
                              item.isDone
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-[#2B2F36] dark:text-slate-100'
                            }`}
                          >
                            {item.title}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Owner: {item.ownerName}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (parsed) {
                                  setCalendarMonth(
                                    new Date(parsed.getFullYear(), parsed.getMonth(), 1)
                                  );
                                  setSelectedCalendarDate(item.date);
                                }
                              }}
                              className="cursor-pointer block font-mono-tabular text-xs font-semibold text-[#2B2F36] dark:text-slate-200 hover:underline"
                              title="Focus date in calendar"
                            >
                              {item.date}
                            </button>
                            <span
                              className={`text-[11px] font-mono-tabular font-medium ${
                                statusInfo.tone === 'overdue'
                                  ? 'text-[#C44D34] dark:text-[#E87A64]'
                                  : statusInfo.tone === 'soon'
                                    ? 'text-[#B57B14] dark:text-[#E8A735]'
                                    : statusInfo.tone === 'done'
                                      ? 'text-[#4B756E] dark:text-[#8FB9B1]'
                                      : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* New Initiative Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                Create New Initiative
              </h3>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateProject(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initiative Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g., Community Symmetry Workshop Series"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Scope, goals, and target community impact..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mission Pillar
                  </label>
                  <select
                    value={projPillar}
                    onChange={(e) => setProjPillar(e.target.value as Pillar)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                  >
                    <option value="learn">Learn</option>
                    <option value="create">Create</option>
                    <option value="empower">Empower</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={projTargetDate}
                    onChange={(e) => setProjTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-60"
                >
                  {isSubmittingProject ? 'Creating...' : 'Create Initiative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                Add Action Item
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateTask(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initiative
                </label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({PILLAR_META[p.pillar].label})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={140}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Prepare facilitator slides for workshop 2"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details or acceptance criteria..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                  >
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-60"
                >
                  {isSubmittingTask ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail & Comments Drawer */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full border-l border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {PILLAR_META[activeTask.pillar].label} · Task Details
              </span>
              <div className="flex items-center gap-2">
                {(isAdmin || activeTask.createdBy === currentUid) && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = activeTask.id;
                      setActiveTask(null);
                      void deleteTask(id);
                    }}
                    aria-label="Delete task"
                    className="p-1.5 text-slate-400 hover:text-[#C44D34] rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                  {activeTask.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeTask.description || 'No additional description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={activeTask.status}
                    disabled={activeTask.status === 'completed' && !isAdmin}
                    onChange={(e) =>
                      void handleTaskStatusChange(activeTask, e.target.value as TaskStatus)
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Assignee
                  </label>
                  <select
                    value={activeTask.assigneeId}
                    disabled={activeTask.status === 'completed' && !isAdmin}
                    onChange={(e) =>
                      void handleTaskAssigneeChange(activeTask, e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100 disabled:opacity-60"
                  >
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTask.status === 'completed' && (
                <div className="flex items-center gap-2 text-xs text-[#4B756E] dark:text-[#8FB9B1] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Task marked completed. {isAdmin ? 'Admin override active.' : 'Locked for audit integrity.'}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Team Discussion ({comments.length})
                </h4>
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                    No comments yet. Share progress or ask a teammate below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#2B2F36] dark:text-slate-100">
                            {cmt.authorName}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 font-mono-tabular">
                            {cmt.createdAt?.toDate
                              ? cmt.createdAt.toDate().toLocaleDateString()
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{cmt.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {members.length > 0 && (
                <div className="px-4 pt-2.5 flex items-center gap-2 overflow-x-auto text-xs text-slate-500 dark:text-slate-400">
                  <span className="shrink-0">Mention:</span>
                  {members.slice(0, 6).map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() =>
                        setCommentBody((prev) =>
                          `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${m.displayName} `
                        )
                      }
                      className="text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap shrink-0"
                    >
                      @{m.displayName}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => void handleSendComment(e)}
                className="p-3 sm:p-4 flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={600}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment (use @Name to mention)..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={isSendingComment || !commentBody.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Project Comments Drawer */}
      {activeProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full border-l border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {PILLAR_META[activeProject.pillar].label} · Initiative Discussion
              </span>
              <button
                type="button"
                onClick={() => setActiveProject(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                  {activeProject.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeProject.description || 'No description provided.'}
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Lead: {activeProject.leadName} · Target{' '}
                  <span className="font-mono-tabular">{activeProject.targetDate}</span>
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Project Comments ({projectComments.length})
                </h4>
                {projectComments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                    No project comments yet. Mention a teammate with @Name to alert them.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projectComments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#2B2F36] dark:text-slate-100">
                            {cmt.authorName}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 font-mono-tabular">
                            {cmt.createdAt?.toDate
                              ? cmt.createdAt.toDate().toLocaleDateString()
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{cmt.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {members.length > 0 && (
                <div className="px-4 pt-2.5 flex items-center gap-2 overflow-x-auto text-xs text-slate-500 dark:text-slate-400">
                  <span className="shrink-0">Mention:</span>
                  {members.slice(0, 6).map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() =>
                        setProjectCommentBody((prev) =>
                          `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${m.displayName} `
                        )
                      }
                      className="text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap shrink-0"
                    >
                      @{m.displayName}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => void handleSendProjectComment(e)}
                className="p-3 sm:p-4 flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={600}
                  value={projectCommentBody}
                  onChange={(e) => setProjectCommentBody(e.target.value)}
                  placeholder="Comment on this project (use @Name)..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={isSendingProjectComment || !projectCommentBody.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
