import { Timestamp } from 'firebase/firestore';

export type Pillar = 'learn' | 'create' | 'empower';
export type PillarFocus = Pillar | 'operations';
export type MemberRole = 'admin' | 'lead' | 'educator' | 'volunteer';
export type ProjectStatus = 'planning' | 'active' | 'completed';
export type TaskStatus = 'planned' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ResourceType = 'guide' | 'template' | 'worksheet' | 'toolkit';
export type NotificationDigest = 'daily' | 'weekly' | 'none';

export type ShapeKind =
  | 'half-circle'
  | 'dot-matrix'
  | 'quad-grid'
  | 'wave-stack'
  | 'circle'
  | 'square'
  | 'triangle';

export type BrandColorHex =
  | '#2C3A57'
  | '#68978F'
  | '#E8A735'
  | '#C44D34'
  | '#2B2F36';

export interface PatternTile {
  key: string;
  shape: ShapeKind;
  color: BrandColorHex;
  rotation: 0 | 90 | 180 | 270;
}

export interface UserPrivate {
  uid: string;
  email: string;
  phone?: string;
  notificationDigest: NotificationDigest;
  updatedAt: Timestamp;
}

export interface MemberProfile {
  uid: string;
  orgId: string;
  displayName: string;
  photoURL?: string;
  role: MemberRole;
  pillarFocus: PillarFocus;
  title?: string;
  bio?: string;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: string;
  orgId: string;
  title: string;
  description: string;
  pillar: Pillar;
  status: ProjectStatus;
  leadId: string;
  leadName: string;
  targetDate: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string;
  pillar: Pillar;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskComment {
  id: string;
  taskId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Timestamp;
}

export interface PatternBoard {
  id: string;
  orgId: string;
  title: string;
  description: string;
  pillar: Pillar;
  cols: number;
  rows: number;
  tiles: PatternTile[];
  createdBy: string;
  lastEditedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  topic: string;
  pillar: Pillar | 'general';
  createdBy: string;
  createdAt: Timestamp;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResourceItem {
  id: string;
  orgId: string;
  title: string;
  summary: string;
  pillar: Pillar;
  resourceType: ResourceType;
  url: string;
  createdBy: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResourceBookmark {
  id: string;
  userId: string;
  orgId: string;
  resourceId: string;
  createdAt: Timestamp;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Timestamp;
}

export type NotificationType = 'task_assigned' | 'comment_mention';

export interface WorkspaceNotification {
  id: string;
  orgId: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId: string;
  taskId: string;
  read: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type WorkspaceSection =
  | 'overview'
  | 'initiatives'
  | 'studio'
  | 'channels'
  | 'resources'
  | 'team'
  | 'organization'
  | 'games';
