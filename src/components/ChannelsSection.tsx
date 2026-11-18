import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Hash, Plus, Send, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { ORG_ID, PILLAR_META } from '../lib/validation';
import {
  createChannel,
  deleteChannelMessage,
  sendChannelMessage,
} from '../lib/workspaceService';
import type {
  Channel,
  ChannelMessage,
  MemberProfile,
  Pillar,
} from '../types/workspace';

interface ChannelsSectionProps {
  currentUid: string;
  currentMember: MemberProfile | null;
  channels: Channel[];
  isAdmin: boolean;
}

export function ChannelsSection({
  currentUid,
  currentMember,
  channels,
  isAdmin,
}: ChannelsSectionProps) {
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [composerBody, setComposerBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [channelPillar, setChannelPillar] = useState<Pillar | 'general'>('general');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  const activeChannel = useMemo(() => {
    if (!channels.length) return null;
    return channels.find((c) => c.id === activeChannelId) || channels[0];
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (activeChannel && activeChannelId !== activeChannel.id) {
      setActiveChannelId(activeChannel.id);
    }
  }, [activeChannel, activeChannelId]);

  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'channels', activeChannel.id, 'messages'),
      where('orgId', '==', ORG_ID),
      where('channelId', '==', activeChannel.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as ChannelMessage);
        list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? Date.now()) -
            (b.createdAt?.toMillis?.() ?? Date.now())
        );
        setMessages(list);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `channels/${activeChannel.id}/messages`
        );
      }
    );

    return () => unsubscribe();
  }, [activeChannel]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChannel || !composerBody.trim()) return;
    setIsSending(true);
    try {
      await sendChannelMessage({
        channelId: activeChannel.id,
        authorId: currentUid,
        authorName: currentMember?.displayName || 'Team Member',
        authorRole: currentMember?.role || 'educator',
        body: composerBody,
      });
      setComposerBody('');
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!channelName.trim()) return;
    setIsCreatingChannel(true);
    try {
      const id = await createChannel({
        userId: currentUid,
        name: channelName,
        topic: channelTopic,
        pillar: channelPillar,
      });
      setActiveChannelId(id);
      setChannelName('');
      setChannelTopic('');
      setShowNewChannelModal(false);
    } finally {
      setIsCreatingChannel(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px] lg:min-h-[600px]">
      {/* Channel Sidebar */}
      <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/70 p-3 sm:p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5 lg:mb-3 px-1 lg:px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Channels
            </h2>
            <button
              type="button"
              onClick={() => setShowNewChannelModal(true)}
              aria-label="Create new channel"
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-[#2C3A57] dark:hover:text-slate-100 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {channels.length === 0 ? (
            <p className="px-2 py-2 lg:py-4 text-xs text-slate-500 dark:text-slate-400">
              No channels created yet.
            </p>
          ) : (
            <nav className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {channels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                const dotColor =
                  channel.pillar === 'general'
                    ? '#2C3A57'
                    : PILLAR_META[channel.pillar].hex;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-auto lg:w-full text-left px-3 py-1.5 lg:py-2 rounded-lg text-xs sm:text-sm flex items-center gap-2 lg:gap-2.5 transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[#2B2F36] dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-[#2B2F36] dark:hover:text-slate-100'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: dotColor }} />
                    <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        <div className="hidden lg:block mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 px-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Channels sync live across all signed-in Shapes and Patterns NPO collaborators.
          </p>
        </div>
      </aside>

      {/* Message Stream */}
      <div className="lg:col-span-9 flex flex-col justify-between min-h-[420px] lg:min-h-[520px]">
        {!activeChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Create a channel to start collaborating with your team.
            </p>
            <button
              type="button"
              onClick={() => setShowNewChannelModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] dark:bg-[#3B4E73] rounded-lg"
            >
              Create Channel
            </button>
          </div>
        ) : (
          <>
            <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
                  <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100 truncate">
                    {activeChannel.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {activeChannel.topic || 'Team discussion channel'}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap shrink-0">
                {activeChannel.pillar} channel
              </span>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[55vh] lg:max-h-[460px]">
              {messages.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No messages in #{activeChannel.name} yet. Start the conversation below.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const canDelete = isAdmin || msg.authorId === currentUid;
                  return (
                    <div
                      key={msg.id}
                      className="group flex items-start justify-between gap-3 sm:gap-4 py-2 px-2 sm:px-3 sm:-mx-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                            {msg.authorName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                            {msg.authorRole}
                          </span>
                          <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500">
                            {msg.createdAt?.toDate
                              ? msg.createdAt.toDate().toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Sending...'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                          {msg.body}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            void deleteChannelMessage(activeChannel.id, msg.id)
                          }
                          aria-label="Delete message"
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#C44D34] transition-opacity shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(e) => void handleSendMessage(e)}
              className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 sm:gap-3"
            >
              <input
                type="text"
                maxLength={1000}
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder={`Message #${activeChannel.name}...`}
                className="flex-1 min-w-0 px-3 sm:px-3.5 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={isSending || !composerBody.trim()}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </>
        )}
      </div>

      {/* Create Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                Create Team Channel
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChannelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateChannel(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., saturday-mentors"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  placeholder="What will the team coordinate here?"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#2C3A57] dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pillar Focus
                </label>
                <select
                  value={channelPillar}
                  onChange={(e) =>
                    setChannelPillar(e.target.value as Pillar | 'general')
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#2B2F36] dark:text-slate-100"
                >
                  <option value="general">General</option>
                  <option value="learn">Learn</option>
                  <option value="create">Create</option>
                  <option value="empower">Empower</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChannel}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] rounded-lg disabled:opacity-60"
                >
                  {isCreatingChannel ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
