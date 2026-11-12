# Daybook Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Account Isolation (`UserProfile`)**: A user document at `/users/{userId}` can only be read, created, or updated when `request.auth != null`, `request.auth.token.email_verified == true`, `isValidId(userId)`, `request.auth.uid == userId`, and `incoming().uid == request.auth.uid`.
2. **Notebook Ownership & Integrity (`Notebook`)**: A notebook document at `/notebooks/{notebookId}` can only be read, listed, created, updated, or deleted by its verified owner (`resource.data.ownerId == request.auth.uid` on read/list/delete; `incoming().ownerId == request.auth.uid` on create/update).
3. **Immutable Identity & Creation Timestamps**: During updates to `/users/{userId}` or `/notebooks/{notebookId}`, identity fields (`uid`, `id`, `ownerId`) and creation timestamps (`createdAt`) must remain strictly equal to `existing()` values, while `updatedAt` must equal `request.time`.
4. **Strict Key Allowlisting & Volumetric Bounds**: All writes must enforce exact required/allowed keys via `hasAll` and `hasOnly` (on create) and `affectedKeys().hasOnly(...)` combined with `isValidUserProfile(incoming())` / `isValidNotebook(incoming())` (on update), with explicit `.size()` bounds on every string field.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/notebooks/nb1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email_verified: false } }`, creating `/users/u1` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Read (PII Leak)**: `auth = { uid: 'u2', token: { email_verified: true } }`, reading `/users/u1` -> `PERMISSION_DENIED`.
4. **Owner Spoofing on Notebook Create**: `auth = { uid: 'u1' }`, creating `/notebooks/nb1` with `ownerId: 'u2'` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection on Create**: Creating `/notebooks/nb1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection on Update**: Updating `/notebooks/nb1` with extra field `hacked: 'yes'` -> `PERMISSION_DENIED`.
7. **Owner Reassignment on Update**: Updating `/notebooks/nb1` to change `ownerId` from `'u1'` to `'u2'` -> `PERMISSION_DENIED`.
8. **CreatedAt Tampering on Update**: Updating `/notebooks/nb1` with a modified `createdAt` timestamp -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamp**: Creating `/notebooks/nb1` where `createdAt` is a forged past timestamp (`request.time - 1000s`) -> `PERMISSION_DENIED`.
10. **Denial-of-Wallet Oversized Title**: Updating `/notebooks/nb1` with a `title` of 5,000 characters (`> 120`) -> `PERMISSION_DENIED`.
11. **Invalid Enum Injection**: Updating `/users/u1` with `tableStyle: 'cyberpunk-neon'` (not in `['oak', 'walnut', 'modern']`) -> `PERMISSION_DENIED`.
12. **Unauthorized Blanket List Query**: User `u2` attempting to list `/notebooks` without `where('ownerId', '==', 'u2')` -> `PERMISSION_DENIED`.
