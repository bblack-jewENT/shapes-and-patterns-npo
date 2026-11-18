import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  BookOpen,
  FolderKanban,
  Gamepad2,
  Grid3x3,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { AuthGateScreen } from './components/AuthGateScreen';
import { ShapesPatternsSvgMark } from './components/BrandMark';
import { CalculatorButton } from './components/CalculatorWidget';
import { ChannelsSection } from './components/ChannelsSection';
import { GamesSection } from './components/GamesSection';
import {
  GlobalSearchBar,
  NotificationsIndicator,
} from './components/HeaderControls';
import { InitiativesSection } from './components/InitiativesSection';
import { OrganizationSection } from './components/OrganizationSection';
import { OverviewSection } from './components/OverviewSection';
import { PatternStudioSection } from './components/PatternStudioSection';
import { ResourcesSection } from './components/ResourcesSection';
import { TeamSection } from './components/TeamSection';
import { handleFirestoreError, OperationType } from './lib/firestoreError';
import { useThemeMode } from './lib/theme';
import { ADMIN_EMAIL, ORG_ID } from './lib/validation';
import {
  bootstrapUserSession,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  seedStarterWorkspaceIfEmpty,
} from './lib/workspaceService';
import { ThemeSwitcher, ThemeToggleButton } from './components/ThemeSwitcher';
import type {
  Channel,
  MemberProfile,
  PatternBoard,
  Project,
  ResourceBookmark,
  ResourceItem,
  Task,
  UserPrivate,
  WorkspaceNotification,
  WorkspaceSection,
} from './types/workspace';

const NAV_ITEMS: Array<{
  id: WorkspaceSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'initiatives', label: 'Initiatives', icon: FolderKanban },
  { id: 'studio', label: 'Pattern Studio', icon: Grid3x3 },
  { id: 'channels', label: 'Channels', icon: MessageSquare },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'team', label: 'Team Roster', icon: Users },
  { id: 'organization', label: 'Charter & NPO', icon: Landmark },
  { id: 'games', label: 'Games', icon: Gamepad2 },
];

const VALID_SECTIONS: WorkspaceSection[] = [
  'overview',
  'initiatives',
  'studio',
  'channels',
  'resources',
  'team',
  'organization',
  'games',
];

function getInitialWorkspaceSection(): WorkspaceSection {
  if (typeof window === 'undefined') return 'overview';
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (VALID_SECTIONS.includes(raw as WorkspaceSection)) {
    return raw as WorkspaceSection;
  }
  return 'overview';
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [section, setSectionState] = useState<WorkspaceSection>(
    getInitialWorkspaceSection
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patterns, setPatterns] = useState<PatternBoard[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourceBookmarks, setResourceBookmarks] = useState<ResourceBookmark[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);

  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [openProjectDrawerId, setOpenProjectDrawerId] = useState<string | null>(null);
  const [focusedResourceQuery, setFocusedResourceQuery] = useState<string | null>(null);

  const isWorkspaceLoadingInit = true;
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(isWorkspaceLoadingInit);
  const [isSeeding, setIsSeeding] = useState(false);
  const autoSeedAttemptedRef = useRef(false);
  const { themeMode, resolvedTheme, setThemeMode, toggleLightDark } = useThemeMode();

  function setSection(next: WorkspaceSection) {
    setSectionState(next);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${next}`;
    }
  }

  useEffect(() => {
    function handleHashChange() {
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (VALID_SECTIONS.includes(raw as WorkspaceSection)) {
        setSectionState(raw as WorkspaceSection);
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await bootstrapUserSession(firebaseUser);
        } catch (err) {
          console.error('Session bootstrap error:', err);
        }
      } else {
        autoSeedAttemptedRef.current = false;
      }
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setProjects([]);
      setTasks([]);
      setPatterns([]);
      setChannels([]);
      setResources([]);
      setResourceBookmarks([]);
      setMembers([]);
      setUserPrivate(null);
      setNotifications([]);
      setIsWorkspaceLoading(false);
      return;
    }

    setIsWorkspaceLoading(true);
    let projectsLoaded = false;
    let channelsLoaded = false;
    let currentProjectCount = 0;
    let currentChannelCount = 0;

    const maybeAutoSeed = async () => {
      if (
        projectsLoaded &&
        channelsLoaded &&
        currentProjectCount === 0 &&
        currentChannelCount === 0 &&
        !autoSeedAttemptedRef.current
      ) {
        autoSeedAttemptedRef.current = true;
        setIsSeeding(true);
        try {
          await seedStarterWorkspaceIfEmpty(
            user,
            user.displayName || 'Workspace Lead'
          );
        } finally {
          setIsSeeding(false);
        }
      }
      if (projectsLoaded && channelsLoaded) {
        setIsWorkspaceLoading(false);
      }
    };

    const toMs = (ts: { toMillis?: () => number } | undefined) =>
      ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now();

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('orgId', '==', ORG_ID)),
      (snap) => {
        currentProjectCount = snap.size;
        projectsLoaded = true;
        const list = snap.docs.map((d) => d.data() as Project);
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setProjects(list);
        void maybeAutoSeed();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'projects')
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Task);
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setTasks(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
    );

    const unsubPatterns = onSnapshot(
      query(collection(db, 'patterns'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PatternBoard);
        list.sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
        setPatterns(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'patterns')
    );

    const unsubChannels = onSnapshot(
      query(collection(db, 'channels'), where('orgId', '==', ORG_ID)),
      (snap) => {
        currentChannelCount = snap.size;
        channelsLoaded = true;
        const list = snap.docs.map((d) => d.data() as Channel);
        list.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
        setChannels(list);
        void maybeAutoSeed();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'channels')
    );

    const unsubResources = onSnapshot(
      query(collection(db, 'resources'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ResourceItem);
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setResources(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'resources')
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'members'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as MemberProfile);
        list.sort((a, b) => toMs(a.joinedAt) - toMs(b.joinedAt));
        setMembers(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'members')
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setUserPrivate(snap.exists() ? (snap.data() as UserPrivate) : null);
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`)
    );

    const unsubNotifications = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('orgId', '==', ORG_ID),
        where('recipientId', '==', user.uid)
      ),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WorkspaceNotification);
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setNotifications(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    const unsubBookmarks = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'bookmarks'),
        where('orgId', '==', ORG_ID),
        where('userId', '==', user.uid)
      ),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ResourceBookmark);
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setResourceBookmarks(list);
      },
      (error) =>
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/bookmarks`
        )
    );

    return () => {
      unsubProjects();
      unsubTasks();
      unsubPatterns();
      unsubChannels();
      unsubResources();
      unsubMembers();
      unsubPrivate();
      unsubNotifications();
      unsubBookmarks();
    };
  }, [authReady, user]);

  const currentMember = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.uid === user.uid) || null;
  }, [members, user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (
      user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      user.emailVerified
    ) {
      return true;
    }
    return currentMember?.role === 'admin';
  }, [user, currentMember]);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function handleManualSeed() {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedStarterWorkspaceIfEmpty(
        user,
        currentMember?.displayName || user.displayName || 'Workspace Lead'
      );
    } finally {
      setIsSeeding(false);
    }
  }

  function handleOpenNotification(item: WorkspaceNotification) {
    if (!item.read) {
      void markNotificationRead(item.id);
    }
    setSection('initiatives');
    if (item.taskId) {
      setFocusedTaskId(item.taskId);
      setFocusedProjectId(item.projectId || null);
      setOpenProjectDrawerId(null);
    } else if (item.projectId) {
      setOpenProjectDrawerId(item.projectId);
      setFocusedTaskId(null);
    }
  }

  function handleMarkAllNotificationsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      void markAllNotificationsRead(unreadIds);
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <ShapesPatternsSvgMark className="w-7 h-7" />
          <span>Loading Shapes and Patterns workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateScreen
        onSignIn={() => void handleGoogleSignIn()}
        isSigningIn={isSigningIn}
        authError={authError}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleLightDark}
      />
    );
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === section) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <ShapesPatternsSvgMark className="w-7 h-7 shrink-0" />
            <span className="font-display text-sm font-bold tracking-tight text-[#2B2F36] dark:text-slate-100 whitespace-nowrap truncate">
              Shapes and Patterns
            </span>
          </div>

          <nav className="p-3 space-y-1" aria-label="Primary Workspace Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2C3A57] dark:bg-[#3B4E73] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:translate-x-0.5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentMember?.photoURL || user.photoURL ? (
              <img
                src={currentMember?.photoURL || user.photoURL || ''}
                alt={currentMember?.displayName || user.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#2C3A57] dark:bg-[#3B4E73] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {(currentMember?.displayName || user.displayName || 'SP')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                {currentMember?.displayName || user.displayName || 'Collaborator'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                {currentMember?.role || 'educator'} ·{' '}
                {currentMember?.pillarFocus || 'learn'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Appearance
            </span>
            <ThemeSwitcher
              themeMode={themeMode}
              onChange={setThemeMode}
              compact
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-68 max-w-[85vw] bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShapesPatternsSvgMark className="w-6 h-6 shrink-0" />
                  <span className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                    Shapes and Patterns
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500 dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-[#2C3A57] dark:bg-[#3B4E73] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Appearance
                </span>
                <ThemeSwitcher
                  themeMode={themeMode}
                  onChange={setThemeMode}
                  compact
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <div className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="cursor-pointer lg:hidden p-2 -ml-1.5 text-slate-600 dark:text-slate-300 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-500 dark:text-slate-400 hidden xl:inline whitespace-nowrap">
                  Shapes and Patterns
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden xl:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-display font-semibold text-[#2B2F36] dark:text-slate-100 truncate">
                  {activeNav.label}
                </span>
              </div>
            </div>

            <div className="hidden md:flex flex-1 justify-center max-w-md min-w-0">
              <GlobalSearchBar
                projects={projects}
                tasks={tasks}
                resources={resources}
                onSelectProject={(proj) => {
                  setSection('initiatives');
                  setFocusedProjectId(proj.id);
                  setFocusedTaskId(null);
                }}
                onSelectTask={(task) => {
                  setSection('initiatives');
                  setFocusedTaskId(task.id);
                  setFocusedProjectId(task.projectId);
                }}
                onSelectResource={(res) => {
                  setSection('resources');
                  setFocusedResourceQuery(res.title);
                }}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <CalculatorButton />
              <ThemeToggleButton
                resolvedTheme={resolvedTheme}
                onToggle={toggleLightDark}
              />
              <NotificationsIndicator
                notifications={notifications}
                onOpenNotification={handleOpenNotification}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onDeleteNotification={(id) => void deleteNotification(id)}
              />
              {section !== 'studio' && (
                <button
                  type="button"
                  onClick={() => setSection('studio')}
                  className="cursor-pointer hidden sm:inline-flex px-3.5 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 shadow-xs"
                >
                  Open Pattern Studio
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Full-Width Mobile Search Row */}
          <div className="md:hidden px-4 pb-2.5">
            <GlobalSearchBar
              projects={projects}
              tasks={tasks}
              resources={resources}
              onSelectProject={(proj) => {
                setSection('initiatives');
                setFocusedProjectId(proj.id);
                setFocusedTaskId(null);
              }}
              onSelectTask={(task) => {
                setSection('initiatives');
                setFocusedTaskId(task.id);
                setFocusedProjectId(task.projectId);
              }}
              onSelectResource={(res) => {
                setSection('resources');
                setFocusedResourceQuery(res.title);
              }}
            />
          </div>
        </header>

        {/* Responsive Page Navigation Bar for Tablet / Split-Screen / Mobile */}
        <nav
          aria-label="Workspace pages"
          className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#2C3A57] dark:bg-[#3B4E73] text-white shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {isWorkspaceLoading ? (
            <div className="space-y-4">
              <div className="h-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <OverviewSection
                  currentMember={currentMember}
                  projects={projects}
                  tasks={tasks}
                  patterns={patterns}
                  channels={channels}
                  resources={resources}
                  members={members}
                  onNavigate={setSection}
                  onSelectProject={(proj) => {
                    setSection('initiatives');
                    setFocusedProjectId(proj.id);
                    setFocusedTaskId(null);
                  }}
                  onSelectTask={(task) => {
                    setSection('initiatives');
                    setFocusedTaskId(task.id);
                    setFocusedProjectId(task.projectId);
                  }}
                  onSeedWorkspace={() => void handleManualSeed()}
                  isSeeding={isSeeding}
                />
              )}

              {section === 'initiatives' && (
                <InitiativesSection
                  currentUid={user.uid}
                  currentMember={currentMember}
                  projects={projects}
                  tasks={tasks}
                  members={members}
                  isAdmin={isAdmin}
                  focusedProjectId={focusedProjectId}
                  focusedTaskId={focusedTaskId}
                  openProjectDrawerId={openProjectDrawerId}
                  onClearFocus={() => {
                    setFocusedProjectId(null);
                    setFocusedTaskId(null);
                    setOpenProjectDrawerId(null);
                  }}
                />
              )}

              {section === 'studio' && (
                <PatternStudioSection
                  currentUid={user.uid}
                  currentMember={currentMember}
                  patterns={patterns}
                />
              )}

              {section === 'channels' && (
                <ChannelsSection
                  currentUid={user.uid}
                  currentMember={currentMember}
                  channels={channels}
                  isAdmin={isAdmin}
                />
              )}

              {section === 'resources' && (
                <ResourcesSection
                  currentUid={user.uid}
                  currentMember={currentMember}
                  resources={resources}
                  bookmarks={resourceBookmarks}
                  isAdmin={isAdmin}
                  focusedSearchQuery={focusedResourceQuery}
                  onClearFocusedSearch={() => setFocusedResourceQuery(null)}
                />
              )}

              {section === 'team' && (
                <TeamSection
                  currentUid={user.uid}
                  currentMember={currentMember}
                  userPrivate={userPrivate}
                  members={members}
                  tasks={tasks}
                  patterns={patterns}
                  isAdmin={isAdmin}
                  themeMode={themeMode}
                  resolvedTheme={resolvedTheme}
                  onChangeThemeMode={setThemeMode}
                  onNavigate={setSection}
                />
              )}

              {section === 'organization' && (
                <OrganizationSection onNavigate={setSection} />
              )}

              {section === 'games' && <GamesSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
