import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  ExternalLink,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PILLAR_META } from '../lib/validation';
import {
  createResource,
  deleteResource,
  toggleResourceBookmark,
} from '../lib/workspaceService';
import type {
  MemberProfile,
  Pillar,
  ResourceBookmark,
  ResourceItem,
  ResourceType,
} from '../types/workspace';

type ResourceLibraryTab = 'all' | 'bookmarks';

interface ResourcesSectionProps {
  currentUid: string;
  currentMember: MemberProfile | null;
  resources: ResourceItem[];
  bookmarks: ResourceBookmark[];
  isAdmin: boolean;
  focusedSearchQuery?: string | null;
  onClearFocusedSearch?: () => void;
}

export function ResourcesSection({
  currentUid,
  currentMember,
  resources,
  bookmarks,
  isAdmin,
  focusedSearchQuery,
  onClearFocusedSearch,
}: ResourcesSectionProps) {
  const [activeTab, setActiveTab] = useState<ResourceLibraryTab>('all');
  const [pillarFilter, setPillarFilter] = useState<'all' | Pillar>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState<string[]>([]);

  useEffect(() => {
    if (focusedSearchQuery) {
      setActiveTab('all');
      setSearchQuery(focusedSearchQuery);
      setPillarFilter('all');
      onClearFocusedSearch?.();
    }
  }, [focusedSearchQuery, onClearFocusedSearch]);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [pillar, setPillar] = useState<Pillar>('learn');
  const [resourceType, setResourceType] = useState<ResourceType>('guide');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookmarkedIdSet = useMemo(() => {
    return new Set(bookmarks.map((b) => b.resourceId));
  }, [bookmarks]);

  const tabResources = useMemo(() => {
    if (activeTab === 'bookmarks') {
      return resources.filter((item) => bookmarkedIdSet.has(item.id));
    }
    return resources;
  }, [activeTab, resources, bookmarkedIdSet]);

  const totalBookmarkedCount = useMemo(() => {
    return resources.filter((item) => bookmarkedIdSet.has(item.id)).length;
  }, [resources, bookmarkedIdSet]);

  const pillarCounts = useMemo(() => {
    const counts: Record<'all' | Pillar, number> = {
      all: tabResources.length,
      learn: 0,
      create: 0,
      empower: 0,
    };
    for (const item of tabResources) {
      counts[item.pillar] += 1;
    }
    return counts;
  }, [tabResources]);

  const filteredResources = useMemo(() => {
    return tabResources.filter((item) => {
      if (pillarFilter !== 'all' && item.pillar !== pillarFilter) return false;
      if (
        searchQuery.trim() &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.summary.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.resourceType.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tabResources, pillarFilter, searchQuery]);

  async function handleToggleBookmark(resourceId: string) {
    if (pendingBookmarkIds.includes(resourceId)) return;
    const currentlyBookmarked = bookmarkedIdSet.has(resourceId);
    setPendingBookmarkIds((prev) => [...prev, resourceId]);
    try {
      await toggleResourceBookmark({
        userId: currentUid,
        resourceId,
        isBookmarked: currentlyBookmarked,
      });
    } finally {
      setPendingBookmarkIds((prev) => prev.filter((id) => id !== resourceId));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await createResource({
        userId: currentUid,
        authorName: currentMember?.displayName || 'Team Contributor',
        title,
        summary,
        pillar,
        resourceType,
        url: url.trim() || 'https://shapesandpatterns.org/resources',
      });
      setTitle('');
      setSummary('');
      setUrl('');
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px] lg:min-h-[580px]">
      {/* Resources Sidebar */}
      <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/70 p-3 sm:p-4 flex flex-col justify-between gap-4 lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2 px-1 lg:px-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Library
              </h2>
            </div>
            <nav className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 lg:gap-1" aria-label="Resource Library Views">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[#2B2F36] dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 shrink-0 text-[#2C3A57] dark:text-sky-300" />
                  <span className="truncate">All Resources</span>
                </span>
                <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                  {resources.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bookmarks')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors ${
                  activeTab === 'bookmarks'
                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[#2B2F36] dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Bookmark
                    className={`w-4 h-4 shrink-0 ${
                      activeTab === 'bookmarks' || totalBookmarkedCount > 0
                        ? 'text-[#D4921E] dark:text-[#F0B94E]'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">My Bookmarks</span>
                </span>
                <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                  {totalBookmarkedCount}
                </span>
              </button>
            </nav>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1 lg:px-2">
              Mission Pillar
            </h2>
            <div className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {(['all', 'learn', 'create', 'empower'] as const).map((tab) => {
                const isActive = pillarFilter === tab;
                const dotColor = tab === 'all' ? '#2C3A57' : PILLAR_META[tab].hex;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPillarFilter(tab)}
                    className={`w-auto lg:w-full text-left px-3 py-1.5 lg:py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[#2B2F36] dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-[#2B2F36] dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: dotColor }}
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {tab === 'all' ? 'All Pillars' : PILLAR_META[tab].label}
                      </span>
                    </span>
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                      {pillarCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden lg:block pt-4 border-t border-slate-200 dark:border-slate-800 px-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Save facilitator guides, links, and toolkits to My Bookmarks for quick access across sessions.
          </p>
        </div>
      </aside>

      {/* Main Resource Area */}
      <div className="lg:col-span-9 flex flex-col">
        <header className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
              {activeTab === 'bookmarks' ? 'My Bookmarks' : 'Team Resource Library'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeTab === 'bookmarks'
                ? `${filteredResources.length} saved ${filteredResources.length === 1 ? 'resource' : 'resources'}`
                : `${filteredResources.length} shared ${filteredResources.length === 1 ? 'document' : 'documents'}`}
              {pillarFilter !== 'all' ? ` · ${PILLAR_META[pillarFilter].label} pillar` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'bookmarks'
                    ? 'Search your bookmarks...'
                    : 'Search guides & toolkits...'
                }
                className="pl-9 pr-8 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500 w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear resource search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1">
          {filteredResources.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-12 text-center">
              {activeTab === 'bookmarks' && totalBookmarkedCount === 0 ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#D4921E] dark:text-[#F0B94E] flex items-center justify-center mx-auto">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                    No bookmarked resources yet
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Click the bookmark icon on any guide, template, or toolkit in All Resources to save it here for quick reference.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setPillarFilter('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Browse All Resources</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {activeTab === 'bookmarks'
                      ? 'No bookmarked resources match your current filter.'
                      : 'No shared guides or toolkits match your current filter.'}
                  </p>
                  {(pillarFilter !== 'all' || searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPillarFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((item) => {
                const canDelete = isAdmin || item.createdBy === currentUid;
                const isBookmarked = bookmarkedIdSet.has(item.id);
                const isPending = pendingBookmarkIds.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                          {PILLAR_META[item.pillar].label} · {item.resourceType}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => void handleToggleBookmark(item.id)}
                            aria-label={
                              isBookmarked
                                ? `Remove ${item.title} from bookmarks`
                                : `Bookmark ${item.title}`
                            }
                            aria-pressed={isBookmarked}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-60 ${
                              isBookmarked
                                ? 'text-[#B57811] dark:text-[#F0B94E] bg-[#E8A735]/12 dark:bg-[#E8A735]/15 hover:bg-[#E8A735]/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-[#2C3A57] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`}
                            />
                            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteResource(item.id)}
                              aria-label={`Delete ${item.title}`}
                              className="p-1.5 text-slate-400 hover:text-[#C44D34] rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100 leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Shared by {item.authorName}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2C3A57] dark:text-sky-300 hover:underline whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                Share Team Resource
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Grade 6 Symmetry Lesson Worksheet"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Summary
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Key takeaways or classroom instructions..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pillar
                  </label>
                  <select
                    value={pillar}
                    onChange={(e) => setPillar(e.target.value as Pillar)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                  >
                    <option value="learn">Learn</option>
                    <option value="create">Create</option>
                    <option value="empower">Empower</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as ResourceType)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                  >
                    <option value="guide">Guide</option>
                    <option value="template">Template</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="toolkit">Toolkit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document URL
                </label>
                <input
                  type="url"
                  maxLength={500}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Share Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
