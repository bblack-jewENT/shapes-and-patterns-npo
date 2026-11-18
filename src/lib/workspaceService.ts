import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  ADMIN_EMAIL,
  clampText,
  createDocumentId,
  formatIsoDate,
  LIMITS,
  ORG_ID,
  sanitizeId,
  sanitizeTiles,
} from './validation';
import type {
  MemberRole,
  NotificationDigest,
  NotificationType,
  PatternTile,
  Pillar,
  PillarFocus,
  ProjectStatus,
  ResourceType,
  TaskPriority,
  TaskStatus,
} from '../types/workspace';

export async function bootstrapUserSession(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const memberRef = doc(db, 'members', uid);
  const userPrivateRef = doc(db, 'users', uid);

  const isBootstrappedAdmin =
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified;

  try {
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      await setDoc(memberRef, {
        uid,
        orgId: ORG_ID,
        displayName: clampText(user.displayName || 'NPO Collaborator', LIMITS.displayNameMax),
        photoURL: clampText(user.photoURL || '', LIMITS.urlMax),
        role: isBootstrappedAdmin ? 'admin' : 'educator',
        pillarFocus: isBootstrappedAdmin ? 'operations' : 'learn',
        title: isBootstrappedAdmin ? 'Program Director' : 'Team Collaborator',
        bio: 'Collaborating across Learn, Create, and Empower initiatives.',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `members/${uid}`);
  }

  try {
    const privateSnap = await getDoc(userPrivateRef);
    if (!privateSnap.exists()) {
      await setDoc(userPrivateRef, {
        uid,
        email: clampText(user.email || 'member@shapesandpatterns.org', 254),
        phone: '',
        notificationDigest: 'weekly',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function seedStarterWorkspaceIfEmpty(user: User, displayName: string): Promise<boolean> {
  const uid = sanitizeId(user.uid);
  const authorName = clampText(displayName || user.displayName || 'Program Lead', LIMITS.displayNameMax);

  try {
    const existingProjects = await getDocs(
      query(collection(db, 'projects'), where('orgId', '==', ORG_ID), limit(1))
    );
    const existingChannels = await getDocs(
      query(collection(db, 'channels'), where('orgId', '==', ORG_ID), limit(1))
    );

    if (!existingProjects.empty && !existingChannels.empty) {
      return false;
    }

    const batch = writeBatch(db);

    if (existingProjects.empty) {
      const projLearnId = 'proj_learn_geometry_kits';
      const projCreateId = 'proj_create_studio_curriculum';
      const projEmpowerId = 'proj_empower_community_labs';

      batch.set(doc(db, 'projects', projLearnId), {
        id: projLearnId,
        orgId: ORG_ID,
        title: 'Foundational Geometry Workshop Kits',
        description:
          'Design tactile shape manipulatives and facilitator guides for Grade 4–7 community classrooms.',
        pillar: 'learn',
        status: 'active',
        leadId: uid,
        leadName: authorName,
        targetDate: '2026-12-15',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'projects', projCreateId), {
        id: projCreateId,
        orgId: ORG_ID,
        title: 'Modular Tessellation & Pattern Curriculum',
        description:
          'Co-author 12 visual pattern boards and printable classroom exercises blending art and symmetry.',
        pillar: 'create',
        status: 'active',
        leadId: uid,
        leadName: authorName,
        targetDate: '2026-12-20',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'projects', projEmpowerId), {
        id: projEmpowerId,
        orgId: ORG_ID,
        title: 'Educator Mentorship & Saturday Studio Labs',
        description:
          'Coordinate volunteer facilitators and youth mentors across three partner community centers.',
        pillar: 'empower',
        status: 'planning',
        leadId: uid,
        leadName: authorName,
        targetDate: '2027-01-18',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const starterTasks: Array<{
        id: string;
        projectId: string;
        title: string;
        description: string;
        pillar: Pillar;
        status: TaskStatus;
        priority: TaskPriority;
        dueDate: string;
      }> = [
        {
          id: 'task_kit_inventory',
          projectId: projLearnId,
          title: 'Finalize classroom shape stencil cut-list',
          description: 'Confirm card stock weights and color ratios for 120 student workshop kits.',
          pillar: 'learn',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-11-28',
        },
        {
          id: 'task_facilitator_deck',
          projectId: projLearnId,
          title: 'Review 45-minute workshop facilitation script',
          description: 'Align warm-up icebreakers with hands-on symmetry challenges.',
          pillar: 'learn',
          status: 'review',
          priority: 'medium',
          dueDate: '2026-12-03',
        },
        {
          id: 'task_pattern_templates',
          projectId: projCreateId,
          title: 'Publish 4 baseline Pattern Studio grids',
          description: 'Create reusable semi-circle, dot-matrix, and wave motifs in the studio.',
          pillar: 'create',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-12-01',
        },
        {
          id: 'task_partner_schedule',
          projectId: projEmpowerId,
          title: 'Confirm Saturday volunteer roster for Q1 hubs',
          description: 'Match two lead educators and three studio volunteers per community site.',
          pillar: 'empower',
          status: 'planned',
          priority: 'medium',
          dueDate: '2026-12-10',
        },
      ];

      for (const task of starterTasks) {
        batch.set(doc(db, 'tasks', task.id), {
          id: task.id,
          orgId: ORG_ID,
          projectId: task.projectId,
          title: task.title,
          description: task.description,
          pillar: task.pillar,
          status: task.status,
          priority: task.priority,
          assigneeId: uid,
          assigneeName: authorName,
          dueDate: task.dueDate,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const starterPatternTiles: PatternTile[] = [
        { key: '2-1', shape: 'half-circle', color: '#E8A735', rotation: 0 },
        { key: '3-1', shape: 'dot-matrix', color: '#68978F', rotation: 0 },
        { key: '2-2', shape: 'quad-grid', color: '#2C3A57', rotation: 0 },
        { key: '3-2', shape: 'wave-stack', color: '#2C3A57', rotation: 0 },
        { key: '6-1', shape: 'circle', color: '#68978F', rotation: 0 },
        { key: '7-1', shape: 'triangle', color: '#C44D34', rotation: 90 },
        { key: '6-2', shape: 'half-circle', color: '#C44D34', rotation: 180 },
        { key: '7-2', shape: 'square', color: '#E8A735', rotation: 0 },
      ];

      batch.set(doc(db, 'patterns', 'pat_npo_identity_mosaic'), {
        id: 'pat_npo_identity_mosaic',
        orgId: ORG_ID,
        title: 'Founders Mosaic — Learn, Create, Empower',
        description:
          'Collaborative pattern study inspired by the Shapes and Patterns NPO geometric emblem.',
        pillar: 'create',
        cols: 12,
        rows: 8,
        tiles: starterPatternTiles,
        createdBy: uid,
        lastEditedByName: authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'resources', 'res_workshop_guide'), {
        id: 'res_workshop_guide',
        orgId: ORG_ID,
        title: 'Facilitator Handbook: Geometric Thinking Through Play',
        summary:
          'Step-by-step classroom facilitation guide covering pattern recognition, symmetry warm-ups, and reflection prompts.',
        pillar: 'learn',
        resourceType: 'guide',
        url: 'https://shapesandpatterns.org/guides/geometric-thinking',
        createdBy: uid,
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'resources', 'res_outreach_toolkit'), {
        id: 'res_outreach_toolkit',
        orgId: ORG_ID,
        title: 'Community Partner & Volunteer Onboarding Toolkit',
        summary:
          'Checklists, workshop supply ratios, and safety briefs for launching weekend empowerment sessions.',
        pillar: 'empower',
        resourceType: 'toolkit',
        url: 'https://shapesandpatterns.org/toolkits/community-onboarding',
        createdBy: uid,
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (existingChannels.empty) {
      const channels = [
        {
          id: 'general',
          name: 'general',
          topic: 'Organization-wide coordination, announcements, and weekly sync notes.',
          pillar: 'general',
        },
        {
          id: 'learn-curriculum',
          name: 'learn-curriculum',
          topic: 'Classroom workshop scripts, student kits, and educator feedback.',
          pillar: 'learn',
        },
        {
          id: 'create-studio',
          name: 'create-studio',
          topic: 'Collaborative Pattern Studio boards, print layouts, and visual kits.',
          pillar: 'create',
        },
        {
          id: 'empower-outreach',
          name: 'empower-outreach',
          topic: 'Community center partnerships, volunteer scheduling, and mentorship.',
          pillar: 'empower',
        },
      ];

      for (const ch of channels) {
        batch.set(doc(db, 'channels', ch.id), {
          id: ch.id,
          orgId: ORG_ID,
          name: ch.name,
          topic: ch.topic,
          pillar: ch.pillar,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
      }

      batch.set(doc(db, 'channels', 'general', 'messages', 'msg_welcome_general'), {
        id: 'msg_welcome_general',
        channelId: 'general',
        orgId: ORG_ID,
        authorId: uid,
        authorName,
        authorRole: 'Workspace Lead',
        body: 'Welcome to the Shapes and Patterns NPO collaboration workspace. Coordinate initiatives, co-design workshop motifs in Pattern Studio, and share resources here.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workspace/seed');
  }
}

export async function createProject(params: {
  userId: string;
  leadId: string;
  leadName: string;
  title: string;
  description: string;
  pillar: Pillar;
  status: ProjectStatus;
  targetDate: string;
}): Promise<string> {
  const id = createDocumentId('proj');
  try {
    await setDoc(doc(db, 'projects', id), {
      id,
      orgId: ORG_ID,
      title: clampText(params.title, LIMITS.titleMax),
      description: clampText(params.description, LIMITS.descriptionMax),
      pillar: params.pillar,
      status: params.status,
      leadId: sanitizeId(params.leadId),
      leadName: clampText(params.leadName, LIMITS.displayNameMax),
      targetDate: formatIsoDate(params.targetDate),
      createdBy: sanitizeId(params.userId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${id}`);
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  const id = sanitizeId(projectId);
  try {
    await updateDoc(doc(db, 'projects', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function createTask(params: {
  userId: string;
  projectId: string;
  title: string;
  description: string;
  pillar: Pillar;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
}): Promise<string> {
  const id = createDocumentId('task');
  try {
    await setDoc(doc(db, 'tasks', id), {
      id,
      orgId: ORG_ID,
      projectId: sanitizeId(params.projectId),
      title: clampText(params.title, LIMITS.taskTitleMax),
      description: clampText(params.description, LIMITS.descriptionMax),
      pillar: params.pillar,
      status: params.status,
      priority: params.priority,
      assigneeId: params.assigneeId ? sanitizeId(params.assigneeId) : '',
      assigneeName: clampText(params.assigneeName || 'Unassigned', LIMITS.displayNameMax),
      dueDate: formatIsoDate(params.dueDate),
      createdBy: sanitizeId(params.userId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tasks/${id}`);
  }
}

export async function updateTaskStatusAndAssignee(
  taskId: string,
  updates: { status: TaskStatus; assigneeId: string; assigneeName: string }
): Promise<void> {
  const id = sanitizeId(taskId);
  try {
    await updateDoc(doc(db, 'tasks', id), {
      status: updates.status,
      assigneeId: updates.assigneeId ? sanitizeId(updates.assigneeId) : '',
      assigneeName: clampText(updates.assigneeName || 'Unassigned', LIMITS.displayNameMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const id = sanitizeId(taskId);
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
  }
}

export async function addTaskComment(params: {
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
}): Promise<string> {
  const taskId = sanitizeId(params.taskId);
  const commentId = createDocumentId('cmt');
  try {
    await setDoc(doc(db, 'tasks', taskId, 'comments', commentId), {
      id: commentId,
      taskId,
      orgId: ORG_ID,
      authorId: sanitizeId(params.authorId),
      authorName: clampText(params.authorName, LIMITS.displayNameMax),
      body: clampText(params.body, LIMITS.commentMax),
      createdAt: serverTimestamp(),
    });
    return commentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tasks/${taskId}/comments/${commentId}`);
  }
}

export async function addProjectComment(params: {
  projectId: string;
  authorId: string;
  authorName: string;
  body: string;
}): Promise<string> {
  const projectId = sanitizeId(params.projectId);
  const commentId = createDocumentId('pcmt');
  try {
    await setDoc(doc(db, 'projects', projectId, 'comments', commentId), {
      id: commentId,
      projectId,
      orgId: ORG_ID,
      authorId: sanitizeId(params.authorId),
      authorName: clampText(params.authorName, LIMITS.displayNameMax),
      body: clampText(params.body, LIMITS.commentMax),
      createdAt: serverTimestamp(),
    });
    return commentId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `projects/${projectId}/comments/${commentId}`
    );
  }
}

export async function createWorkspaceNotification(params: {
  recipientId: string;
  senderId: string;
  senderName: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
}): Promise<string> {
  const id = createDocumentId('ntf');
  try {
    await setDoc(doc(db, 'notifications', id), {
      id,
      orgId: ORG_ID,
      recipientId: sanitizeId(params.recipientId),
      senderId: sanitizeId(params.senderId),
      senderName: clampText(params.senderName, LIMITS.displayNameMax),
      type: params.type,
      title: clampText(params.title, LIMITS.notificationTitleMax),
      message: clampText(params.message, LIMITS.notificationMessageMax),
      projectId: params.projectId ? sanitizeId(params.projectId) : '',
      taskId: params.taskId ? sanitizeId(params.taskId) : '',
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const id = sanitizeId(notificationId);
  try {
    await updateDoc(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsRead(
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const rawId of notificationIds) {
      const id = sanitizeId(rawId);
      batch.update(doc(db, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications/batch-read');
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const id = sanitizeId(notificationId);
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
  }
}

export async function createPatternBoard(params: {
  userId: string;
  editorName: string;
  title: string;
  description: string;
  pillar: Pillar;
  tiles?: PatternTile[];
}): Promise<string> {
  const id = createDocumentId('pat');
  try {
    await setDoc(doc(db, 'patterns', id), {
      id,
      orgId: ORG_ID,
      title: clampText(params.title, 100),
      description: clampText(params.description, LIMITS.patternDescMax),
      pillar: params.pillar,
      cols: 12,
      rows: 8,
      tiles: sanitizeTiles(params.tiles ?? []),
      createdBy: sanitizeId(params.userId),
      lastEditedByName: clampText(params.editorName, LIMITS.displayNameMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `patterns/${id}`);
  }
}

export async function savePatternTiles(params: {
  patternId: string;
  tiles: PatternTile[];
  editorName: string;
}): Promise<void> {
  const id = sanitizeId(params.patternId);
  try {
    await updateDoc(doc(db, 'patterns', id), {
      tiles: sanitizeTiles(params.tiles),
      lastEditedByName: clampText(params.editorName, LIMITS.displayNameMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `patterns/${id}`);
  }
}

export async function createChannel(params: {
  userId: string;
  name: string;
  topic: string;
  pillar: Pillar | 'general';
}): Promise<string> {
  const slug = sanitizeId(params.name.toLowerCase().replace(/\s+/g, '-')).slice(0, 48);
  const id = slug || createDocumentId('ch');
  try {
    await setDoc(doc(db, 'channels', id), {
      id,
      orgId: ORG_ID,
      name: clampText(params.name.toLowerCase().replace(/\s+/g, '-'), LIMITS.channelNameMax),
      topic: clampText(params.topic, LIMITS.channelTopicMax),
      pillar: params.pillar,
      createdBy: sanitizeId(params.userId),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${id}`);
  }
}

export async function sendChannelMessage(params: {
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
}): Promise<string> {
  const channelId = sanitizeId(params.channelId);
  const messageId = createDocumentId('msg');
  try {
    await setDoc(doc(db, 'channels', channelId, 'messages', messageId), {
      id: messageId,
      channelId,
      orgId: ORG_ID,
      authorId: sanitizeId(params.authorId),
      authorName: clampText(params.authorName, LIMITS.displayNameMax),
      authorRole: clampText(params.authorRole, 40),
      body: clampText(params.body, LIMITS.messageBodyMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return messageId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `channels/${channelId}/messages/${messageId}`
    );
  }
}

export async function deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
  const cId = sanitizeId(channelId);
  const mId = sanitizeId(messageId);
  try {
    await deleteDoc(doc(db, 'channels', cId, 'messages', mId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `channels/${cId}/messages/${mId}`);
  }
}

export async function createResource(params: {
  userId: string;
  authorName: string;
  title: string;
  summary: string;
  pillar: Pillar;
  resourceType: ResourceType;
  url: string;
}): Promise<string> {
  const id = createDocumentId('res');
  try {
    await setDoc(doc(db, 'resources', id), {
      id,
      orgId: ORG_ID,
      title: clampText(params.title, LIMITS.resourceTitleMax),
      summary: clampText(params.summary, LIMITS.resourceSummaryMax),
      pillar: params.pillar,
      resourceType: params.resourceType,
      url: clampText(params.url, LIMITS.urlMax),
      createdBy: sanitizeId(params.userId),
      authorName: clampText(params.authorName, LIMITS.displayNameMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `resources/${id}`);
  }
}

export async function deleteResource(resourceId: string): Promise<void> {
  const id = sanitizeId(resourceId);
  try {
    await deleteDoc(doc(db, 'resources', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
  }
}

export async function toggleResourceBookmark(params: {
  userId: string;
  resourceId: string;
  isBookmarked: boolean;
}): Promise<boolean> {
  const uid = sanitizeId(params.userId);
  const resId = sanitizeId(params.resourceId);
  const ref = doc(db, 'users', uid, 'bookmarks', resId);
  try {
    if (params.isBookmarked) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, {
      id: resId,
      userId: uid,
      orgId: ORG_ID,
      resourceId: resId,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(
      error,
      params.isBookmarked ? OperationType.DELETE : OperationType.CREATE,
      `users/${uid}/bookmarks/${resId}`
    );
  }
}

export async function updateOwnMemberProfile(params: {
  uid: string;
  displayName: string;
  pillarFocus: PillarFocus;
  title: string;
  bio: string;
}): Promise<void> {
  const id = sanitizeId(params.uid);
  try {
    await updateDoc(doc(db, 'members', id), {
      displayName: clampText(params.displayName, LIMITS.displayNameMax),
      pillarFocus: params.pillarFocus,
      title: clampText(params.title, 80),
      bio: clampText(params.bio, LIMITS.bioMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${id}`);
  }
}

export async function adminUpdateMemberRole(
  targetUid: string,
  role: MemberRole
): Promise<void> {
  const id = sanitizeId(targetUid);
  try {
    await updateDoc(doc(db, 'members', id), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${id}`);
  }
}

export async function updateUserPrivatePrefs(params: {
  uid: string;
  email: string;
  phone: string;
  notificationDigest: NotificationDigest;
}): Promise<void> {
  const id = sanitizeId(params.uid);
  try {
    await updateDoc(doc(db, 'users', id), {
      email: clampText(params.email, 254),
      phone: clampText(params.phone, LIMITS.phoneMax),
      notificationDigest: params.notificationDigest,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
  }
}
