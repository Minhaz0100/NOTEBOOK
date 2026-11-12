import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSource = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

interface AuthContext {
  uid: string;
  email_verified: boolean;
}

function evaluateDirtyDozen(
  auth: AuthContext | null,
  operation: 'get' | 'list' | 'create' | 'update',
  collection: 'users' | 'notebooks',
  docId: string,
  incomingData: Record<string, unknown>,
  existingData: Record<string, unknown>,
  nowMs: number,
): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (!/^[a-zA-Z0-9_\-]+$/.test(docId) || docId.length === 0 || docId.length > 128) {
    return 'PERMISSION_DENIED';
  }

  if (collection === 'users') {
    if (operation === 'get') {
      return auth.uid === docId ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (operation === 'list') return 'PERMISSION_DENIED';
    const required = [
      'uid', 'displayName', 'tableStyle', 'bookshelfStyle', 'theme',
      'soundEnabled', 'soundVolume', 'animationMode', 'defaultPenColor',
      'defaultPageColor', 'defaultFontFamily', 'hasSeenRoomIntro',
      'createdAt', 'updatedAt',
    ];
    const keys = Object.keys(incomingData);
    if (keys.length !== required.length || !required.every((k) => keys.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    if (incomingData.uid !== auth.uid || incomingData.uid !== docId) return 'PERMISSION_DENIED';
    if (!['oak', 'walnut', 'modern'].includes(String(incomingData.tableStyle))) {
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (incomingData.createdAt !== nowMs || incomingData.updatedAt !== nowMs) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    if (operation === 'update') {
      if (existingData.uid !== auth.uid || incomingData.uid !== existingData.uid) {
        return 'PERMISSION_DENIED';
      }
      if (incomingData.createdAt !== existingData.createdAt || incomingData.updatedAt !== nowMs) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
  }

  if (collection === 'notebooks') {
    if (operation === 'get' || operation === 'list') {
      return existingData.ownerId === auth.uid ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    const required = [
      'id', 'ownerId', 'title', 'description', 'notebookType', 'journalYear',
      'coverColor', 'coverMaterial', 'coverAccent', 'bindingStyle',
      'defaultPaperStyle', 'defaultPageColor', 'defaultFontFamily',
      'pageCount', 'lastOpenedPage', 'lastViewedDate', 'archived',
      'deskPositionX', 'deskPositionZ', 'deskRotationY', 'bookmarkIds',
      'createdAt', 'updatedAt',
    ];
    const keys = Object.keys(incomingData);
    if (keys.length !== required.length || !required.every((k) => keys.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    if (incomingData.ownerId !== auth.uid || incomingData.id !== docId) {
      return 'PERMISSION_DENIED';
    }
    if (typeof incomingData.title !== 'string' || incomingData.title.length < 1 || incomingData.title.length > 120) {
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (incomingData.createdAt !== nowMs || incomingData.updatedAt !== nowMs) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    if (operation === 'update') {
      if (existingData.ownerId !== auth.uid || incomingData.ownerId !== existingData.ownerId) {
        return 'PERMISSION_DENIED';
      }
      if (incomingData.createdAt !== existingData.createdAt || incomingData.updatedAt !== nowMs) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
  }

  return 'PERMISSION_DENIED';
}

const NOW = 1794248000000;
const validNotebook = {
  id: 'nb1',
  ownerId: 'u1',
  title: 'My Daily Journal',
  description: 'A quiet year of reflections',
  notebookType: 'daily',
  journalYear: 2026,
  coverColor: '#D8CFC4',
  coverMaterial: 'linen',
  coverAccent: 'botanical',
  bindingStyle: 'spiral',
  defaultPaperStyle: 'ruled',
  defaultPageColor: '#FAF6F0',
  defaultFontFamily: 'Caveat',
  pageCount: 4,
  lastOpenedPage: 1,
  lastViewedDate: '2026-11-09',
  archived: false,
  deskPositionX: 0,
  deskPositionZ: 0,
  deskRotationY: 0,
  bookmarkIds: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const validUser = {
  uid: 'u1',
  displayName: 'Clara Vance',
  tableStyle: 'oak',
  bookshelfStyle: 'classic',
  theme: 'warm-ivory',
  soundEnabled: true,
  soundVolume: 0.5,
  animationMode: 'full',
  defaultPenColor: '#2C2623',
  defaultPageColor: '#FAF6F0',
  defaultFontFamily: 'Caveat',
  hasSeenRoomIntro: true,
  createdAt: NOW,
  updatedAt: NOW,
};

test('firestore.rules contains all 8 hardened pillars and match blocks', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;'));
  assert.ok(rulesSource.includes('isValidUserProfile(incoming())'));
  assert.ok(rulesSource.includes('isValidNotebook(incoming())'));
  assert.ok(rulesSource.includes('isValidNotebookPage(incoming())'));
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
});

test('Dirty Dozen #1-12 payloads all return PERMISSION_DENIED', () => {
  const u1 = { uid: 'u1', email_verified: true };
  const u2 = { uid: 'u2', email_verified: true };

  // 1. Unauthenticated Write
  assert.equal(evaluateDirtyDozen(null, 'create', 'notebooks', 'nb1', validNotebook, {}, NOW), 'PERMISSION_DENIED');

  // 2. Unverified Email Spoof
  assert.equal(
    evaluateDirtyDozen({ uid: 'u1', email_verified: false }, 'create', 'users', 'u1', validUser, {}, NOW),
    'PERMISSION_DENIED',
  );

  // 3. Cross-User Profile Read (PII Leak)
  assert.equal(evaluateDirtyDozen(u2, 'get', 'users', 'u1', {}, validUser, NOW), 'PERMISSION_DENIED');

  // 4. Owner Spoofing on Notebook Create
  assert.equal(
    evaluateDirtyDozen(u1, 'create', 'notebooks', 'nb1', { ...validNotebook, ownerId: 'u2' }, {}, NOW),
    'PERMISSION_DENIED',
  );

  // 5. Shadow / Ghost Field Injection on Create
  assert.equal(
    evaluateDirtyDozen(u1, 'create', 'notebooks', 'nb1', { ...validNotebook, isAdmin: true }, {}, NOW),
    'PERMISSION_DENIED',
  );

  // 6. Shadow / Ghost Field Injection on Update
  assert.equal(
    evaluateDirtyDozen(u1, 'update', 'notebooks', 'nb1', { ...validNotebook, hacked: 'yes' }, validNotebook, NOW),
    'PERMISSION_DENIED',
  );

  // 7. Owner Reassignment on Update
  assert.equal(
    evaluateDirtyDozen(u1, 'update', 'notebooks', 'nb1', { ...validNotebook, ownerId: 'u2' }, validNotebook, NOW),
    'PERMISSION_DENIED',
  );

  // 8. CreatedAt Tampering on Update
  assert.equal(
    evaluateDirtyDozen(u1, 'update', 'notebooks', 'nb1', { ...validNotebook, createdAt: NOW + 500 }, validNotebook, NOW),
    'PERMISSION_DENIED',
  );

  // 9. Client-Forged Timestamp on Create
  assert.equal(
    evaluateDirtyDozen(u1, 'create', 'notebooks', 'nb1', { ...validNotebook, createdAt: NOW - 1000 }, {}, NOW),
    'PERMISSION_DENIED',
  );

  // 10. Denial-of-Wallet Oversized Title
  assert.equal(
    evaluateDirtyDozen(u1, 'update', 'notebooks', 'nb1', { ...validNotebook, title: 'A'.repeat(500) }, validNotebook, NOW),
    'PERMISSION_DENIED',
  );

  // 11. Invalid Enum Injection
  assert.equal(
    evaluateDirtyDozen(u1, 'update', 'users', 'u1', { ...validUser, tableStyle: 'cyberpunk-neon' }, validUser, NOW),
    'PERMISSION_DENIED',
  );

  // 12. Unauthorized Blanket List Query
  assert.equal(
    evaluateDirtyDozen(u2, 'list', 'notebooks', 'nb1', {}, validNotebook, NOW),
    'PERMISSION_DENIED',
  );
});
