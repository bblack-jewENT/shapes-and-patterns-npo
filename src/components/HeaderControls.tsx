import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Bell,
  BookOpen,
  CheckCheck,
  ClipboardCheck,
  FolderKanban,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PILLAR_META } from '../lib/validation';
import type {
  Project,
  ResourceItem,
  Task,
  WorkspaceNotification,
} from '../types/workspace';

interface GlobalSearchBarProps {
  projects: Project[];
  tasks: Task[];
  resources: ResourceItem[];
  onSelectProject: (project: Project) => void;
  onSelectTask: (task: Task) => void;
  onSelectResource: (resource: ResourceItem) => void;
}

export function GlobalSearchBar({
  projects,
  tasks,
  resources,
  onSelectProject,
  onSelectTask,
  onSelectResource,
}: GlobalSearchBarProps) {
  const [queryText, setQueryText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) {
      return { projects: [], tasks: [], resources: [] };
    }

    const matchedProjects = projects
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.leadName.toLowerCase().includes(q) ||
          p.pillar.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedTasks = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assigneeName.toLowerCase().includes(q) ||
          t.pillar.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchedResources = resources
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.resourceType.toLowerCase().includes(q) ||
          r.pillar.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return {
      projects: matchedProjects,
      tasks: matchedTasks,
      resources: matchedResources,
    };
  }, [queryText, projects, tasks, resources]);

  const totalMatches =
    results.projects.length + results.tasks.length + results.resources.length;

  function clearAndClose() {
    setQueryText('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full md:max-w-sm">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="search"
          aria-label="Search workspace projects, tasks, and resources"
          value={queryText}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQueryText(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder="Search projects, tasks, or resources..."
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500 transition-colors"
        />
        {queryText && (
          <button
            type="button"
            onClick={clearAndClose}
            aria-label="Clear search"
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && queryText.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 overflow-hidden max-h-[420px] overflow-y-auto">
          {totalMatches === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No projects, tasks, or resources match &ldquo;{queryText.trim()}&rdquo;.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.projects.length > 0 && (
                <div className="py-2">
                  <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Projects ({results.projects.length})
                  </p>
                  {results.projects.map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        onSelectProject(proj);
                        clearAndClose();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-start gap-2.5 transition-colors"
                    >
                      <FolderKanban className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2B2F36] dark:text-slate-100 truncate">
                          {proj.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {PILLAR_META[proj.pillar].label} · Lead: {proj.leadName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.tasks.length > 0 && (
                <div className="py-2">
                  <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tasks ({results.tasks.length})
                  </p>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        onSelectTask(task);
                        clearAndClose();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-start gap-2.5 transition-colors"
                    >
                      <ClipboardCheck className="w-4 h-4 text-[#68978F] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2B2F36] dark:text-slate-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {PILLAR_META[task.pillar].label} · {task.assigneeName} ·{' '}
                          <span className="capitalize">{task.status.replace('_', ' ')}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.resources.length > 0 && (
                <div className="py-2">
                  <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Resources ({results.resources.length})
                  </p>
                  {results.resources.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        onSelectResource(res);
                        clearAndClose();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-start gap-2.5 transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-[#E8A735] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2B2F36] dark:text-slate-100 truncate">
                          {res.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                          {PILLAR_META[res.pillar].label} · {res.resourceType}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationsIndicatorProps {
  notifications: WorkspaceNotification[];
  onOpenNotification: (notification: WorkspaceNotification) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
}

export function NotificationsIndicator({
  notifications,
  onOpenNotification,
  onMarkAllRead,
  onDeleteNotification,
}: NotificationsIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <div ref={popoverRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        className="cursor-pointer relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3A57]"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-md bg-[#C44D34] text-white text-[10px] font-mono-tabular font-semibold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You are all caught up. Task assignments and @mentions in project comments will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex items-start justify-between gap-3 transition-colors ${
                    item.read
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      : 'bg-slate-50/90 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenNotification(item);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left flex items-start gap-2.5 min-w-0"
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'task_assigned' ? (
                        <ClipboardCheck className="w-4 h-4 text-[#68978F]" />
                      ) : (
                        <AtSign className="w-4 h-4 text-[#E8A735]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C44D34] dark:text-[#E87A64] shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono-tabular">
                        {item.senderName} ·{' '}
                        {item.createdAt?.toDate
                          ? item.createdAt.toDate().toLocaleDateString()
                          : 'Just now'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteNotification(item.id)}
                    aria-label="Dismiss notification"
                    className="p-1 text-slate-400 hover:text-[#C44D34] rounded shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
