import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Eye,
  EyeOff,
  LogIn,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  BindingStyle,
  CoverAccent,
  CoverMaterial,
  Notebook,
  NotebookPage,
  NotebookType,
  PaperStyle,
  StudyViewMode,
  SyncStatus,
  UserProfile,
} from './types/journal';
import { createSampleStarterData } from './utils/samplePhotos';
import {
  deleteNotebookFromCloud,
  deleteNotebookPageFromCloud,
  fetchOrCreateUserProfile,
  fetchUserNotebooksFromCloud,
  saveUserProfileToCloud,
  signInWithGooglePopup,
  signOutUser,
  subscribeToAuth,
  upsertNotebookPageToCloud,
  upsertNotebookToCloud,
} from './services/firebaseClient';
import { soundEngine } from './utils/soundEffects';
import { StudySanctuary2D } from './components/StudySanctuary2D';
import { NotebookSpreadView } from './components/NotebookSpreadView';
import { WelcomeCoverScreen } from './components/WelcomeCoverScreen';
import {
  AppSettingsModal,
  CreateNotebookModal,
  NotebookSettingsModal,
} from './components/NotebookModals';

import {
  ENTERED_STORAGE_KEY,
  GUEST_STORAGE_KEY,
  getUserStorageKey,
  LEGACY_STORAGE_KEY,
} from './utils/storageKeys';

const DEFAULT_PROFILE: UserProfile = {
  uid: 'local-writer',
  displayName: 'Study Writer',
  tableStyle: 'oak',
  bookshelfStyle: 'classic',
  theme: 'warm-ivory',
  soundEnabled: true,
  soundVolume: 0.45,
  animationMode: 'full',
  defaultPenColor: '#2C2623',
  defaultPageColor: '#FAF6F0',
  defaultFontFamily: 'Caveat',
  hasSeenRoomIntro: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function App() {
  const [viewMode, setViewMode] = useState<StudyViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sceneParam = params.get('scene');
      if (sceneParam === 'desk' || sceneParam === 'bookshelf' || sceneParam === 'room') {
        return sceneParam;
      }
      if (params.get('autostart') === '1') return 'desk';
      if (localStorage.getItem(ENTERED_STORAGE_KEY) === 'true') return 'desk';
    }
    return 'welcome';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  const initialData = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clean legacy un-scoped key to prevent any old data leakage
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    const starter = createSampleStarterData('guest-writer');
    return {
      profile: DEFAULT_PROFILE,
      notebooks: starter.notebooks,
      pagesByNotebook: starter.pagesByNotebook,
    };
  }, []);

  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialData.notebooks);
  const [pagesByNotebook, setPagesByNotebook] = useState<Record<string, NotebookPage[]>>(
    initialData.pagesByNotebook,
  );

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const notebooksRef = useRef(notebooks);
  notebooksRef.current = notebooks;
  const pagesRef = useRef(pagesByNotebook);
  pagesRef.current = pagesByNotebook;

  const [openedNotebookId, setOpenedNotebookId] = useState<string | null>(null);
  const [selectedArchivedId, setSelectedArchivedId] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAppSettingsModal, setShowAppSettingsModal] = useState(false);
  const [appSettingsInitialTab, setAppSettingsInitialTab] = useState<
    'appearance' | 'room' | 'account' | 'sound'
  >('appearance');
  const [settingsNotebookId, setSettingsNotebookId] = useState<string | null>(null);

  useEffect(() => {
    if (!isZenMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZenMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isZenMode]);

  // Persist local cache strictly scoped to the active user's ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (currentUser) {
        localStorage.setItem(
          getUserStorageKey(currentUser.uid),
          JSON.stringify({
            profile,
            notebooks,
            pagesByNotebook,
          }),
        );
      } else {
        localStorage.setItem(
          GUEST_STORAGE_KEY,
          JSON.stringify({
            profile,
            notebooks,
            pagesByNotebook,
          }),
        );
      }
    } catch {
      // storage quota guard
    }
  }, [currentUser, profile, notebooks, pagesByNotebook]);

  // Handle Authentication State Change with Strict Account Isolation
  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (!user) {
        // User is signed out or not logged in
        return;
      }

      setSyncStatus('saving');
      try {
        // Fast local hydration for this specific user if available
        if (typeof window !== 'undefined') {
          try {
            const rawCached = localStorage.getItem(getUserStorageKey(user.uid));
            if (rawCached) {
              const cached = JSON.parse(rawCached);
              if (cached?.notebooks && cached?.pagesByNotebook) {
                setNotebooks(cached.notebooks);
                setPagesByNotebook(cached.pagesByNotebook);
                if (cached.profile) setProfile(cached.profile);
              }
            }
          } catch {
            // cache read guard
          }
        }

        // 1. Fetch or initialize the user's cloud profile
        const cloudProfile = await fetchOrCreateUserProfile(user, {
          ...DEFAULT_PROFILE,
          uid: user.uid,
          displayName: user.displayName || 'Journal Writer',
        });
        setProfile(cloudProfile);

        // 2. Fetch all notebooks strictly owned by this user (where ownerId == user.uid)
        const cloudData = await fetchUserNotebooksFromCloud(user.uid);

        if (cloudData.notebooks.length > 0) {
          // Returning user: restore all previously saved notebooks and pages
          setNotebooks(cloudData.notebooks);
          setPagesByNotebook(cloudData.pagesByNotebook);

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                getUserStorageKey(user.uid),
                JSON.stringify({
                  profile: cloudProfile,
                  notebooks: cloudData.notebooks,
                  pagesByNotebook: cloudData.pagesByNotebook,
                }),
              );
            } catch {
              // quota guard
            }
          }
        } else {
          // New account signing in for the first time:
          // Display a completely fresh application experience.
          // NEVER display or migrate another account's information!
          const freshStarter = createSampleStarterData(user.uid);

          // Upload the clean starter notebooks to Firestore under this user's UID
          for (const nb of freshStarter.notebooks) {
            await upsertNotebookToCloud(nb, true);
            const pList = freshStarter.pagesByNotebook[nb.id] || [];
            for (const p of pList) {
              await upsertNotebookPageToCloud(p, true);
            }
          }

          setNotebooks(freshStarter.notebooks);
          setPagesByNotebook(freshStarter.pagesByNotebook);

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                getUserStorageKey(user.uid),
                JSON.stringify({
                  profile: cloudProfile,
                  notebooks: freshStarter.notebooks,
                  pagesByNotebook: freshStarter.pagesByNotebook,
                }),
              );
            } catch {
              // quota guard
            }
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(ENTERED_STORAGE_KEY, 'true');
        }
        setViewMode((prev) => (prev === 'welcome' ? 'desk' : prev));
        setSyncStatus('saved');
      } catch (err) {
        console.error('Account synchronization error:', err);
        setSyncStatus('offline');
      }
    });
    return () => unsub();
  }, []);

  const syncTimerRef = useRef<number | null>(null);
  const triggerCloudSync = useCallback((task: () => Promise<void>) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('saving');
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(async () => {
      try {
        await task();
        setSyncStatus('saved');
      } catch {
        setSyncStatus('error');
      }
    }, 550);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGooglePopup();
      localStorage.setItem(ENTERED_STORAGE_KEY, 'true');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Sign in error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing.');
      } else if (error?.code === 'auth/popup-blocked') {
        setAuthError(
          'Popup was blocked by your browser. Please allow popups or tap "Just open..." below.',
        );
      } else if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.code === 'auth/configuration-not-found'
      ) {
        setAuthError('Google Sign-In is not enabled in Firebase Console.');
      } else {
        setAuthError(
          error?.message || 'Could not complete Google Sign-In. You can tap "Just open..." below.',
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleJustOpenStudyRoom = () => {
    localStorage.setItem(ENTERED_STORAGE_KEY, 'true');
    setViewMode('desk');
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }

    // 1. Immediately clear currentUser state
    setCurrentUser(null);

    // 2. Immediately purge all account-specific in-memory data
    const cleanGuestData = createSampleStarterData('guest-writer');
    setProfile(DEFAULT_PROFILE);
    setNotebooks(cleanGuestData.notebooks);
    setPagesByNotebook(cleanGuestData.pagesByNotebook);
    setOpenedNotebookId(null);
    setSelectedArchivedId(null);
    setShowAppSettingsModal(false);
    setShowCreateModal(false);
    setSettingsNotebookId(null);
    setIsMobileSidebarOpen(false);

    // 3. Clear session storage and unauthenticated session markers
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        localStorage.removeItem(ENTERED_STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // storage guard
      }
    }

    // 4. Return to the Welcome Cover Screen immediately so no user data remains visible
    setViewMode('welcome');
    setSyncStatus('saved');
  }, []);

  const handleUpdateProfile = (patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      if (currentUser) {
        triggerCloudSync(() => saveUserProfileToCloud({ ...next, uid: currentUser.uid }));
      }
      return next;
    });
  };

  const handleCreateNotebook = (data: {
    title: string;
    description: string;
    notebookType: NotebookType;
    journalYear: number;
    coverColor: string;
    coverMaterial: CoverMaterial;
    coverAccent: CoverAccent;
    bindingStyle: BindingStyle;
    defaultPaperStyle: PaperStyle;
  }) => {
    const nowIso = new Date().toISOString();
    const ownerId = currentUser?.uid || profile.uid;
    const nbId = `nb-${Date.now()}`;
    const firstPageId = `pg-${Date.now()}-1`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const newNotebook: Notebook = {
      id: nbId,
      ownerId,
      title: data.title,
      description: data.description,
      notebookType: data.notebookType,
      journalYear: data.journalYear,
      coverColor: data.coverColor,
      coverMaterial: data.coverMaterial,
      coverAccent: data.coverAccent,
      bindingStyle: data.bindingStyle,
      defaultPaperStyle: data.defaultPaperStyle,
      defaultPageColor: profile.defaultPageColor || '#FAF6F0',
      defaultFontFamily: profile.defaultFontFamily || 'Caveat',
      pageCount: 1,
      lastOpenedPage: 1,
      lastViewedDate: data.notebookType === 'daily' ? `${data.journalYear}-11-10` : todayStr,
      archived: false,
      deskPositionX: 0,
      deskPositionZ: 0,
      deskRotationY: 0,
      bookmarkIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const firstPage: NotebookPage = {
      id: firstPageId,
      notebookId: nbId,
      ownerId,
      pageNumber: 1,
      entryDate: data.notebookType === 'daily' ? `${data.journalYear}-11-10` : todayStr,
      title: '',
      paperStyle: data.defaultPaperStyle,
      pageColor: profile.defaultPageColor || '#FAF6F0',
      bookmarkTitle: '',
      bookmarkColor: '',
      bookmarkStyle: 'none',
      textBlocks: [
        {
          id: `tb-${Date.now()}`,
          text: '',
          x: 7,
          y: 6,
          width: 86,
          fontFamily: profile.defaultFontFamily || 'Caveat',
          fontSize: 25,
          color: profile.defaultPenColor || '#2C2623',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: Date.now(),
        },
      ],
      strokes: [],
      photos: [],
      wordCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setNotebooks((prev) => [...prev, newNotebook]);
    setPagesByNotebook((prev) => ({ ...prev, [nbId]: [firstPage] }));
    setShowCreateModal(false);
    setViewMode('desk');

    if (currentUser) {
      triggerCloudSync(async () => {
        await upsertNotebookToCloud(newNotebook, true);
        await upsertNotebookPageToCloud(firstPage, true);
      });
    }
  };

  const handleOpenNotebookById = (notebookId: string) => {
    soundEngine.playBookOpen(profile.soundEnabled, profile.soundVolume);
    setOpenedNotebookId(notebookId);
    setIsMobileSidebarOpen(false);
    setViewMode('notebook');
  };

  const handleUpdateNotebookMeta = useCallback(
    (notebookId: string, patch: Partial<Notebook>) => {
      setNotebooks((prev) =>
        prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const updated: Notebook = {
            ...nb,
            ...patch,
            ownerId: currentUser?.uid || nb.ownerId,
            updatedAt: new Date().toISOString(),
          };
          if (currentUser) {
            triggerCloudSync(() => upsertNotebookToCloud(updated, false));
          }
          return updated;
        }),
      );
    },
    [currentUser, triggerCloudSync],
  );

  const handleUpdatePage = useCallback(
    (notebookId: string, updatedPage: NotebookPage) => {
      setPagesByNotebook((prev) => {
        const list = prev[notebookId] || [];
        const normalizedPage: NotebookPage = {
          ...updatedPage,
          ownerId: currentUser?.uid || updatedPage.ownerId,
        };
        const nextList = list.map((p) => (p.id === normalizedPage.id ? normalizedPage : p));
        const bookmarkIds = nextList
          .filter((p) => Boolean(p.bookmarkColor && p.bookmarkStyle !== 'none'))
          .map((p) => p.id);

        setNotebooks((nbs) =>
          nbs.map((n) =>
            n.id === notebookId
              ? {
                  ...n,
                  bookmarkIds,
                  pageCount: nextList.length,
                  updatedAt: new Date().toISOString(),
                }
              : n,
          ),
        );

        if (currentUser) {
          triggerCloudSync(() => upsertNotebookPageToCloud(normalizedPage, false));
        }
        return { ...prev, [notebookId]: nextList };
      });
    },
    [currentUser, triggerCloudSync],
  );

  const handleAddPageToNotebook = useCallback(
    (notebookId: string, entryDate = ''): NotebookPage => {
      const nb = notebooks.find((n) => n.id === notebookId)!;
      const existingPages = pagesByNotebook[notebookId] || [];
      const nextNum = existingPages.length + 1;
      const nowIso = new Date().toISOString();
      const todayStr = nowIso.slice(0, 10);

      const newPage: NotebookPage = {
        id: `pg-${Date.now()}-${nextNum}`,
        notebookId,
        ownerId: currentUser?.uid || profile.uid,
        pageNumber: nextNum,
        entryDate: entryDate || todayStr,
        title: '',
        paperStyle: nb?.defaultPaperStyle || 'ruled',
        pageColor: nb?.defaultPageColor || '#FAF6F0',
        bookmarkTitle: '',
        bookmarkColor: '',
        bookmarkStyle: 'none',
        textBlocks: [
          {
            id: `tb-${Date.now()}`,
            text: '',
            x: 7,
            y: 6,
            width: 86,
            fontFamily: nb?.defaultFontFamily || 'Caveat',
            fontSize: 25,
            color: profile.defaultPenColor || '#2C2623',
            underlined: false,
            align: 'left',
            layerOrder: 1,
            createdAt: Date.now(),
          },
        ],
        strokes: [],
        photos: [],
        wordCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedList = [...existingPages, newPage];
      setPagesByNotebook((prev) => ({ ...prev, [notebookId]: updatedList }));
      handleUpdateNotebookMeta(notebookId, {
        pageCount: updatedList.length,
        lastOpenedPage: nextNum,
        lastViewedDate: entryDate || nb?.lastViewedDate || todayStr,
      });

      if (currentUser) {
        triggerCloudSync(() => upsertNotebookPageToCloud(newPage, true));
      }

      return newPage;
    },
    [notebooks, pagesByNotebook, currentUser, profile, handleUpdateNotebookMeta, triggerCloudSync],
  );

  const handleDeletePageFromNotebook = useCallback(
    (notebookId: string, pageId: string) => {
      setPagesByNotebook((prev) => {
        const existing = prev[notebookId] || [];
        if (existing.length <= 1) return prev;
        const filtered = existing
          .filter((p) => p.id !== pageId)
          .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

        handleUpdateNotebookMeta(notebookId, {
          pageCount: filtered.length,
          lastOpenedPage: Math.min(filtered.length, 1),
        });

        if (currentUser) {
          triggerCloudSync(() => deleteNotebookPageFromCloud(notebookId, pageId));
        }

        return { ...prev, [notebookId]: filtered };
      });
    },
    [currentUser, handleUpdateNotebookMeta, triggerCloudSync],
  );

  const handleDeleteEntireNotebook = (notebookId: string) => {
    const pageIds = (pagesByNotebook[notebookId] || []).map((p) => p.id);
    setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
    setPagesByNotebook((prev) => {
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });
    if (openedNotebookId === notebookId) {
      setOpenedNotebookId(null);
      setViewMode('desk');
    }
    if (selectedArchivedId === notebookId) {
      setSelectedArchivedId(null);
    }
    setSettingsNotebookId(null);

    if (currentUser) {
      triggerCloudSync(() => deleteNotebookFromCloud(notebookId, pageIds));
    }
  };

  const openAccountModal = () => {
    setAppSettingsInitialTab('account');
    setShowAppSettingsModal(true);
    setIsMobileSidebarOpen(false);
  };

  const openGeneralSettingsModal = () => {
    setAppSettingsInitialTab('appearance');
    setShowAppSettingsModal(true);
    setIsMobileSidebarOpen(false);
  };

  const activeNotebooks = useMemo(() => notebooks.filter((n) => !n.archived), [notebooks]);
  const archivedNotebooks = useMemo(() => notebooks.filter((n) => n.archived), [notebooks]);

  const openedNotebook = useMemo(
    () => notebooks.find((n) => n.id === openedNotebookId) || null,
    [notebooks, openedNotebookId],
  );
  const settingsNotebook = useMemo(
    () => notebooks.find((n) => n.id === settingsNotebookId) || null,
    [notebooks, settingsNotebookId],
  );

  // 1. Welcome Cover Screen
  if (viewMode === 'welcome') {
    return (
      <WelcomeCoverScreen
        isSigningIn={isSigningIn}
        authError={authError}
        onSignInWithGoogle={handleGoogleSignIn}
        onJustOpenStudyRoom={handleJustOpenStudyRoom}
      />
    );
  }

  // 2. Open Notebook Reading & Writing Experience (A4 Physical Notebook View)
  if (viewMode === 'notebook' && openedNotebook) {
    const nbPages = pagesByNotebook[openedNotebook.id] || [];
    return (
      <>
        <NotebookSpreadView
          notebook={openedNotebook}
          pages={nbPages}
          syncStatus={syncStatus}
          soundEnabled={profile.soundEnabled}
          soundVolume={profile.soundVolume}
          animationMode={profile.animationMode}
          onCloseNotebook={() => {
            setOpenedNotebookId(null);
            setViewMode(openedNotebook.archived ? 'bookshelf' : 'desk');
          }}
          onOpenNotebookSettings={() => setSettingsNotebookId(openedNotebook.id)}
          onUpdateNotebookMeta={(patch) => handleUpdateNotebookMeta(openedNotebook.id, patch)}
          onUpdatePage={(updatedPage) => handleUpdatePage(openedNotebook.id, updatedPage)}
          onAddPage={(entryDate) => handleAddPageToNotebook(openedNotebook.id, entryDate)}
          onDeletePage={(pageId) => handleDeletePageFromNotebook(openedNotebook.id, pageId)}
        />

        {settingsNotebook && (
          <NotebookSettingsModal
            notebook={settingsNotebook}
            onClose={() => setSettingsNotebookId(null)}
            onSaveNotebook={(patch) => handleUpdateNotebookMeta(settingsNotebook.id, patch)}
            onToggleArchive={() => {
              const nextArchived = !settingsNotebook.archived;
              handleUpdateNotebookMeta(settingsNotebook.id, { archived: nextArchived });
              setSettingsNotebookId(null);
              setOpenedNotebookId(null);
              setViewMode(nextArchived ? 'bookshelf' : 'desk');
            }}
            onDeleteNotebook={() => handleDeleteEntireNotebook(settingsNotebook.id)}
          />
        )}
      </>
    );
  }

  const isEvening = profile.theme === 'evening-study';

  // 3. Calm 2D Study Sanctuary (Writing Table, Archive Bookshelf, or Both Together)
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Top Bar */}
      {!isZenMode && (
        <header
          className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b transition-colors"
          style={{
            backgroundColor: isEvening ? 'rgba(34, 29, 26, 0.96)' : 'rgba(244, 239, 230, 0.96)',
            borderColor: isEvening ? 'rgba(255, 245, 235, 0.14)' : 'rgba(82, 64, 53, 0.15)',
            color: isEvening ? '#F6EFE6' : '#2C241E',
          }}
        >
          {/* Left Zone: Wordmark + Mobile Sidebar Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              aria-label="Open Navigation Menu"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg border border-current/20 hover:bg-black/5 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a
              href="#desk"
              onClick={(e) => {
                e.preventDefault();
                setSelectedArchivedId(null);
                setViewMode('desk');
              }}
              className="text-2xl font-bold tracking-tight whitespace-nowrap shrink-0"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              NOTE BOOK
            </a>
          </div>

          {/* Center Zone: Clean Navigation Links */}
          <nav
            aria-label="Study Sanctuary Views"
            className="hidden md:flex items-center gap-1 p-1 rounded-xl border"
            style={{
              backgroundColor: isEvening ? 'rgba(0,0,0,0.28)' : 'rgba(82, 64, 53, 0.07)',
              borderColor: isEvening ? 'rgba(255,255,255,0.1)' : 'rgba(82, 64, 53, 0.14)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedArchivedId(null);
                setViewMode('desk');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'desk'
                  ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              Table ({activeNotebooks.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('bookshelf');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'bookshelf'
                  ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              Shelf ({archivedNotebooks.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedArchivedId(null);
                setViewMode('room');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'room'
                  ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              Both
            </button>
          </nav>

          {/* Right Zone: Minimal Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="hidden lg:flex items-center opacity-70 mr-1"
              title={syncStatus === 'saving' ? 'Saving' : 'Saved'}
            >
              {syncStatus === 'saving' ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              )}
            </span>

            <button
              type="button"
              onClick={() => setIsZenMode(true)}
              aria-label="Zen View"
              title="Zen View"
              className="hidden sm:flex items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer"
              style={{
                borderColor: isEvening ? 'rgba(255,255,255,0.18)' : 'rgba(82, 64, 53, 0.22)',
              }}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={openGeneralSettingsModal}
              aria-label="Settings"
              title="Settings"
              className="p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer"
              style={{
                borderColor: isEvening ? 'rgba(255,255,255,0.18)' : 'rgba(82, 64, 53, 0.22)',
              }}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={openAccountModal}
              aria-label={
                currentUser ? `Account (${currentUser.email})` : 'Sign In'
              }
              title={
                currentUser
                  ? `${currentUser.email || profile.displayName}`
                  : 'Sign In'
              }
              className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              style={{
                borderColor: isEvening ? 'rgba(255,255,255,0.2)' : 'rgba(82, 64, 53, 0.24)',
                backgroundColor: isEvening ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
              }}
            >
              {currentUser ? (
                <span className="w-4 h-4 rounded-full bg-[#524035] text-[#FAF6F0] text-[10px] font-bold flex items-center justify-center">
                  {(currentUser.email || profile.displayName || 'D')[0].toUpperCase()}
                </span>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              aria-label="New Notebook"
              title="New Notebook"
              className="p-2 text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              style={{
                backgroundColor: '#524035',
                color: '#FAF6F0',
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Collapsible Mobile Sidebar Drawer (< 768px) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile Study Sanctuary Sidebar"
            className="w-72 max-w-[85vw] h-full p-5 flex flex-col justify-between overflow-y-auto shadow-2xl border-r"
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: 'rgba(82, 64, 53, 0.22)',
              color: '#2C241E',
            }}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-300">
                <div>
                  <span
                    className="text-2xl font-bold block"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    NOTE BOOK
                  </span>
                  <span className="text-[11px] text-stone-600">Personal Journaling Sanctuary</span>
                </div>
                <button
                  type="button"
                  aria-label="Close Sidebar Menu"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-200/70 text-stone-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EFE6D8] border border-stone-300/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#524035] text-[#FAF6F0] flex items-center justify-center font-semibold text-xs shrink-0">
                    {(currentUser?.email || profile.displayName || 'D')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-900 truncate">
                      {currentUser ? profile.displayName : 'Guest Writer'}
                    </div>
                    <div className="text-[11px] text-stone-600 truncate">
                      {currentUser?.email || 'Local storage active'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="px-2.5 py-1.5 rounded-lg bg-[#524035] text-[#FAF6F0] text-[11px] font-semibold cursor-pointer"
                  >
                    {currentUser ? 'Profile' : 'Sign In'}
                  </button>
                  {currentUser && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      title="Sign Out"
                      className="px-2 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-200/70 text-stone-700 text-[11px] font-medium cursor-pointer"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Study Views
                </span>
                {(
                  [
                    {
                      id: 'desk',
                      label: `Writing Table (${activeNotebooks.length})`,
                      sub: 'Active notebooks on your desk',
                    },
                    {
                      id: 'bookshelf',
                      label: `Archive Bookshelf (${archivedNotebooks.length})`,
                      sub: 'Completed & archived volumes',
                    },
                    {
                      id: 'room',
                      label: 'Both Together',
                      sub: 'Table & bookshelf together',
                    },
                  ] as const
                ).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setSelectedArchivedId(null);
                      setViewMode(sc.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      viewMode === sc.id
                        ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                        : 'bg-white text-stone-800 border-stone-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{sc.label}</div>
                    <div className="text-[10px] opacity-80">{sc.sub}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Open a Notebook (A4 Pages)
                </span>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {notebooks.map((nb) => (
                    <button
                      key={nb.id}
                      type="button"
                      onClick={() => handleOpenNotebookById(nb.id)}
                      className="w-full px-3 py-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-300/80 text-xs flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-4 rounded-xs shrink-0 border border-black/20"
                          style={{ backgroundColor: nb.coverColor }}
                        />
                        <span className="font-medium text-stone-800 truncate">{nb.title}</span>
                      </span>
                      <span className="text-[10px] text-stone-500 shrink-0">
                        {nb.archived ? 'Shelf' : 'Desk'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-300 space-y-2 text-xs">
              <button
                type="button"
                onClick={openGeneralSettingsModal}
                className="w-full py-2 px-3 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Study &amp; Journal Settings</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Floating Zen View Exit Pill */}
      {isZenMode && (
        <div className="fixed top-4 right-5 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer"
            style={{
              backgroundColor: 'rgba(44, 36, 30, 0.94)',
              borderColor: 'rgba(255, 245, 230, 0.25)',
              color: '#FAF6F0',
            }}
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-200" />
            <span>Exit Zen View</span>
          </button>
        </div>
      )}

      {/* Main 2D Study Sanctuary */}
      <main className="w-full flex-1 overflow-hidden">
        <StudySanctuary2D
          viewMode={viewMode}
          notebooks={notebooks}
          tableStyle={profile.tableStyle}
          bookshelfStyle={profile.bookshelfStyle}
          theme={profile.theme}
          selectedArchivedId={selectedArchivedId}
          onSelectViewMode={(mode) => setViewMode(mode)}
          onOpenNotebook={handleOpenNotebookById}
          onCustomizeNotebook={(id) => setSettingsNotebookId(id)}
          onToggleArchiveNotebook={(id, archived) => {
            handleUpdateNotebookMeta(id, { archived });
          }}
          onSelectArchivedNotebook={(id) => setSelectedArchivedId(id)}
          onCreateNotebookClick={() => setShowCreateModal(true)}
          onClearSamples={() => {
            setNotebooks((prev) => prev.filter((n) => !n.isSample));
          }}
        />
      </main>

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <CreateNotebookModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateNotebook}
        />
      )}

      {/* Individual Notebook Settings Modal */}
      {settingsNotebook && (
        <NotebookSettingsModal
          notebook={settingsNotebook}
          onClose={() => setSettingsNotebookId(null)}
          onSaveNotebook={(patch) => handleUpdateNotebookMeta(settingsNotebook.id, patch)}
          onToggleArchive={() => {
            const nextArchived = !settingsNotebook.archived;
            handleUpdateNotebookMeta(settingsNotebook.id, { archived: nextArchived });
            setSettingsNotebookId(null);
            setViewMode(nextArchived ? 'bookshelf' : 'desk');
          }}
          onDeleteNotebook={() => handleDeleteEntireNotebook(settingsNotebook.id)}
        />
      )}

      {/* Overall Application, Profile & Study Sanctuary Settings Modal */}
      {showAppSettingsModal && (
        <AppSettingsModal
          profile={profile}
          userEmail={currentUser?.email || null}
          syncStatus={syncStatus}
          initialTab={appSettingsInitialTab}
          onClose={() => setShowAppSettingsModal(false)}
          onUpdateProfile={handleUpdateProfile}
          onSignInWithGoogle={() => {
            setShowAppSettingsModal(false);
            handleGoogleSignIn();
          }}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
