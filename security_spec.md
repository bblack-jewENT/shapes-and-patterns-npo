# Security Specification — Shapes and Patterns NPO

## 1. Data Invariants
1. **Authentication & Verification Gate**: Every read and write requires an authenticated user with `request.auth.token.email_verified == true`.
2. **PII Isolation**: Private user contact fields (`email`, `phone`, `notificationDigest`) live strictly under `/users/{userId}` and are accessible only by `userId == request.auth.uid` or `isAdmin()`. Public member profiles under `/members/{userId}` contain zero PII.
3. **Role Privilege Protection**: Non-admin users cannot self-assign `role: 'admin'` on `/members/{userId}` create, nor alter `role` during updates. Only `isAdmin()` (bootstrapped admin email `mosesrametsi16@gmail.com` with verified email or `/admins/{uid}` document) can promote or change member roles.
4. **Master Gate & Global Consistency**:
   - `/tasks/{taskId}` creation requires `exists(/databases/$(database)/documents/projects/$(incoming().projectId))`.
   - `/tasks/{taskId}/comments/{commentId}` requires `exists(/databases/$(database)/documents/tasks/$(taskId))`.
   - `/channels/{channelId}/messages/{messageId}` requires `exists(/databases/$(database)/documents/channels/$(channelId))`.
5. **Terminal State Locking**: Completed projects (`status == 'completed'`) and completed tasks (`status == 'completed'`) cannot be mutated by non-admins.
6. **Temporal & Ownership Integrity**: `createdAt` and `createdBy`/`authorId` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on update.
7. **Org Scoping on List Queries**: Every `allow list` rule enforces `resource.data.orgId == 'shapes-and-patterns-npo'` (or `resource.data.uid == request.auth.uid` for `/users`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Request with `auth == null` on `/projects/p1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Request with `email: 'mosesrametsi16@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
3. **Cross-User PII Leak**: User B reads `/users/userA` -> `PERMISSION_DENIED`.
4. **Self-Admin Role Escalation (Create)**: User creates `/members/userB` with `role: 'admin'` -> `PERMISSION_DENIED`.
5. **Self-Admin Role Escalation (Update)**: User updates `/members/userB` changing `role` from `'volunteer'` to `'admin'` -> `PERMISSION_DENIED`.
6. **Shadow Ghost Field Injection**: Write to `/projects/p1` with extra `isApproved: true` key -> `PERMISSION_DENIED`.
7. **Path ID Poisoning**: Document ID > 128 chars or containing invalid symbols (`../bad`) -> `PERMISSION_DENIED`.
8. **Orphaned Task Write**: Create `/tasks/t1` referencing non-existent `projectId: 'missing_proj'` -> `PERMISSION_DENIED`.
9. **Spoofed Author Identity**: User B creates `/channels/general/messages/m1` with `authorId: 'userA'` -> `PERMISSION_DENIED`.
10. **Client Timestamp Forgery**: Create `/projects/p1` with `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
11. **Terminal State Tampering**: Non-admin updates `/tasks/t_done` whose `existing().status == 'completed'` -> `PERMISSION_DENIED`.
12. **Unbounded Array Exhaustion**: Write `/patterns/pat1` with `tiles` length 97 (> 96) -> `PERMISSION_DENIED`.
