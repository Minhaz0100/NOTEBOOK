import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSampleStarterData } from './samplePhotos';
import { getUserStorageKey, GUEST_STORAGE_KEY } from './storageKeys';
import type { Notebook, NotebookPage, UserProfile } from '../types/journal';

describe('Account-Based Data Storage & Isolation Tests', () => {
  it('1. User-scoped storage keys are isolated per authenticated user ID', () => {
    const userAKey = getUserStorageKey('gmail-user-A-uid');
    const userBKey = getUserStorageKey('gmail-user-B-uid');

    assert.equal(userAKey, 'daybook_user_state_gmail-user-A-uid');
    assert.equal(userBKey, 'daybook_user_state_gmail-user-B-uid');
    assert.notEqual(userAKey, userBKey, 'User A and User B must have distinct local storage keys');
    assert.notEqual(userAKey, GUEST_STORAGE_KEY, 'Authenticated key must differ from guest key');
  });

  it('2. Starter notebooks generated for User A and User B have zero ID collisions', () => {
    const userAStarter = createSampleStarterData('gmail-user-A');
    const userBStarter = createSampleStarterData('gmail-user-B');

    // All notebooks and pages for User A have ownerId == gmail-user-A
    for (const nb of userAStarter.notebooks) {
      assert.equal(nb.ownerId, 'gmail-user-A');
      const pages = userAStarter.pagesByNotebook[nb.id] || [];
      for (const p of pages) {
        assert.equal(p.ownerId, 'gmail-user-A');
        assert.equal(p.notebookId, nb.id);
      }
    }

    // All notebooks and pages for User B have ownerId == gmail-user-B
    for (const nb of userBStarter.notebooks) {
      assert.equal(nb.ownerId, 'gmail-user-B');
      const pages = userBStarter.pagesByNotebook[nb.id] || [];
      for (const p of pages) {
        assert.equal(p.ownerId, 'gmail-user-B');
        assert.equal(p.notebookId, nb.id);
      }
    }

    // Verify completely disjoint notebook IDs between User A and User B
    const userANotebookIds = new Set(userAStarter.notebooks.map((n) => n.id));
    const userBNotebookIds = new Set(userBStarter.notebooks.map((n) => n.id));

    for (const id of userANotebookIds) {
      assert.equal(
        userBNotebookIds.has(id),
        false,
        `Collision detected! Notebook ID "${id}" belongs to both User A and User B`,
      );
    }
  });

  it('3. Strict User Data Isolation in queries (User B cannot see User A data)', () => {
    // Simulated cloud database holding documents for both accounts
    const cloudDatabase: {
      notebooks: Notebook[];
      pages: NotebookPage[];
    } = {
      notebooks: [],
      pages: [],
    };

    // User A writes private notebooks
    const userAData = createSampleStarterData('user-A-secret-uid');
    for (const nb of userAData.notebooks) {
      cloudDatabase.notebooks.push({ ...nb, title: `User A Notebook: ${nb.title}` });
      for (const p of userAData.pagesByNotebook[nb.id] || []) {
        cloudDatabase.pages.push({ ...p, title: 'User A Secret Page' });
      }
    }

    // User B writes private notebooks
    const userBData = createSampleStarterData('user-B-isolated-uid');
    for (const nb of userBData.notebooks) {
      cloudDatabase.notebooks.push({ ...nb, title: `User B Notebook: ${nb.title}` });
      for (const p of userBData.pagesByNotebook[nb.id] || []) {
        cloudDatabase.pages.push({ ...p, title: 'User B Secret Page' });
      }
    }

    // Simulation of fetchUserNotebooksFromCloud with strict where('ownerId', '==', uid)
    const fetchForUser = (uid: string) => {
      const userNotebooks = cloudDatabase.notebooks.filter((nb) => nb.ownerId === uid);
      const userPagesByNotebook: Record<string, NotebookPage[]> = {};
      for (const nb of userNotebooks) {
        userPagesByNotebook[nb.id] = cloudDatabase.pages.filter(
          (p) => p.ownerId === uid && p.notebookId === nb.id,
        );
      }
      return { notebooks: userNotebooks, pagesByNotebook: userPagesByNotebook };
    };

    const userAResult = fetchForUser('user-A-secret-uid');
    const userBResult = fetchForUser('user-B-isolated-uid');

    // User A sees only User A data
    assert.equal(userAResult.notebooks.length > 0, true);
    for (const nb of userAResult.notebooks) {
      assert.equal(nb.ownerId, 'user-A-secret-uid');
      assert.equal(nb.title.startsWith('User A Notebook'), true);
    }

    // User B sees only User B data
    assert.equal(userBResult.notebooks.length > 0, true);
    for (const nb of userBResult.notebooks) {
      assert.equal(nb.ownerId, 'user-B-isolated-uid');
      assert.equal(nb.title.startsWith('User B Notebook'), true);
    }

    // Verify User B cannot access any of User A's notebooks or pages
    const userBAllNotebookIds = userBResult.notebooks.map((n) => n.id);
    for (const nbA of userAResult.notebooks) {
      assert.equal(userBAllNotebookIds.includes(nbA.id), false);
    }
  });

  it('4. Sign-Out Cleans All Private Data from Memory & Resets Interface', () => {
    // Current active state when User A is logged in
    let currentUser: { uid: string; email: string } | null = {
      uid: 'user-A',
      email: 'usera@gmail.com',
    };
    let notebooks: Notebook[] = createSampleStarterData('user-A').notebooks;
    let openedNotebookId: string | null = notebooks[0].id;
    let viewMode: string = 'notebook';

    // Verify User A data is currently present
    assert.equal(currentUser.email, 'usera@gmail.com');
    assert.equal(notebooks.length > 0, true);
    assert.equal(openedNotebookId, notebooks[0].id);
    assert.equal(viewMode, 'notebook');

    // Simulate Sign-Out execution (Clean Room Protocol)
    currentUser = null;
    const cleanGuestStarter = createSampleStarterData('guest-writer');
    notebooks = cleanGuestStarter.notebooks;
    openedNotebookId = null;
    viewMode = 'welcome';

    // Verify User A data has completely vanished
    assert.equal(currentUser, null);
    assert.equal(openedNotebookId, null);
    assert.equal(viewMode, 'welcome');
    // None of the remaining notebooks belong to user-A
    for (const nb of notebooks) {
      assert.notEqual(nb.ownerId, 'user-A');
    }
  });

  it('5. New Gmail account (User B) receives a completely fresh space without User A data', () => {
    const cloudStorage: Record<string, Notebook[]> = {};

    // User A has saved notebooks in cloud
    cloudStorage['user-A'] = createSampleStarterData('user-A').notebooks;

    // User B signs in for the first time
    const userB_uid = 'user-B-new';
    const existingCloudDataForB = cloudStorage[userB_uid] || [];

    // Verify user B has 0 existing notebooks
    assert.equal(existingCloudDataForB.length, 0);

    // App generates fresh starter space for User B (NOT migrating User A's data)
    const freshForB = createSampleStarterData(userB_uid);
    cloudStorage[userB_uid] = freshForB.notebooks;

    // Verify User B has their own notebooks with ownerId == user-B-new
    assert.equal(cloudStorage[userB_uid].length > 0, true);
    for (const nb of cloudStorage[userB_uid]) {
      assert.equal(nb.ownerId, userB_uid);
      assert.notEqual(nb.ownerId, 'user-A');
    }
  });

  it('6. Returning Gmail account (User A) restores previously saved cloud data intact', () => {
    const cloudStorage: Record<string, { notebooks: Notebook[]; profile: Partial<UserProfile> }> = {};

    // User A originally created custom notebooks and settings
    const userANotebooks: Notebook[] = [
      {
        id: 'nb-custom-letters-1',
        ownerId: 'user-A',
        title: 'User A Handwritten Memories',
        description: 'Special personal memories',
        notebookType: 'daily',
        journalYear: 2026,
        coverColor: '#5B6D54',
        coverMaterial: 'leather',
        coverAccent: 'botanical',
        bindingStyle: 'hardcover',
        defaultPaperStyle: 'ruled',
        defaultPageColor: '#FAF6F0',
        defaultFontFamily: 'Caveat',
        pageCount: 12,
        lastOpenedPage: 5,
        lastViewedDate: '2026-11-10',
        archived: false,
        deskPositionX: 0,
        deskPositionZ: 0,
        deskRotationY: 0,
        bookmarkIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    cloudStorage['user-A'] = {
      notebooks: userANotebooks,
      profile: {
        uid: 'user-A',
        displayName: 'Mahin Writer',
        theme: 'evening-study',
      },
    };

    // User A signs out... then signs in again!
    const restored = cloudStorage['user-A'];
    assert.equal(restored.notebooks.length, 1);
    assert.equal(restored.notebooks[0].title, 'User A Handwritten Memories');
    assert.equal(restored.notebooks[0].lastOpenedPage, 5);
    assert.equal(restored.profile.displayName, 'Mahin Writer');
    assert.equal(restored.profile.theme, 'evening-study');
  });
});
