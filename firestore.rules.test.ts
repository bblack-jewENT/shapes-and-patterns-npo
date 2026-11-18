/**
 * Security Rules Specification Verification Matrix for Shapes and Patterns NPO
 * Maps all 12 Dirty Dozen adversarial payloads from security_spec.md
 * to expected PERMISSION_DENIED outcomes under firestore.rules.
 */

export interface AdversarialCase {
  id: string;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated Read',
    collectionPath: '/projects/p1',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    name: 'Unverified Email Admin Spoof',
    collectionPath: '/members/userA',
    operation: 'update',
    auth: { uid: 'attacker', email: 'mosesrametsi16@gmail.com', email_verified: false },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    name: 'Cross-User PII Read',
    collectionPath: '/users/userA',
    operation: 'get',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    name: 'Self-Admin Role Escalation on Create',
    collectionPath: '/members/userB',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: {
      uid: 'userB',
      orgId: 'shapes-and-patterns-npo',
      displayName: 'User B',
      role: 'admin',
      pillarFocus: 'learn',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    name: 'Self-Admin Role Escalation on Update',
    collectionPath: '/members/userB',
    operation: 'update',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    name: 'Shadow Ghost Field Injection',
    collectionPath: '/projects/proj_1',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'proj_1', orgId: 'shapes-and-patterns-npo', isVerifiedAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    name: 'Path ID Poisoning',
    collectionPath: '/projects/' + 'x'.repeat(130),
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'x'.repeat(130) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    name: 'Orphaned Task Creation',
    collectionPath: '/tasks/task_orphan',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'task_orphan', projectId: 'non_existent_project' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    name: 'Spoofed Author Identity in Message',
    collectionPath: '/channels/general/messages/msg_1',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'msg_1', channelId: 'general', authorId: 'userA', body: 'Impersonation' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    name: 'Client Timestamp Forgery',
    collectionPath: '/projects/proj_2',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'proj_2', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    name: 'Terminal State Tampering on Completed Task',
    collectionPath: '/tasks/task_completed',
    operation: 'update',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { status: 'in_progress' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    name: 'Unbounded Pattern Tiles Array Exhaustion',
    collectionPath: '/patterns/pat_overflow',
    operation: 'create',
    auth: { uid: 'userB', email: 'b@example.org', email_verified: true },
    payload: { id: 'pat_overflow', tiles: new Array(97).fill({ key: '0-0' }) },
    expected: 'PERMISSION_DENIED',
  },
];
