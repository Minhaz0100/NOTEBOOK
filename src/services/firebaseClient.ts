import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signInAnonymously,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Notebook, NotebookPage, UserProfile } from '../types/journal';
import {
  packShapesIntoTextBlocks,
  unpackShapesFromTextBlocks,
} from '../utils/journalLogic';

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGooglePopup(): Promise<User> {
  if (Capacitor.isNativePlatform()) {
    // Native Android / iOS Google Sign-In via Google Play Services
    const result = await FirebaseAuthentication.signInWithGoogle();
    if (result.credential?.idToken) {
      const credential = GoogleAuthProvider.credential(
        result.credential.idToken,
        result.credential.accessToken
      );
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential.user;
    }
    if (auth.currentUser) {
      return auth.currentUser;
    }
  }

  // Standard Web Browser Google Sign-In
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch {
      // Ignore native signout error
    }
  }
  await fbSignOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Defensive sanitization helper matching firebase-blueprint.json schema boundaries
function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : fallback;
  return s.slice(0, maxLen);
}

export async function fetchOrCreateUserProfile(
  user: User,
  defaultProfile: UserProfile,
): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        uid: user.uid,
        displayName: clampStr(d.displayName, 120, user.displayName || 'Writer'),
        tableStyle: ['oak', 'walnut', 'modern'].includes(d.tableStyle) ? d.tableStyle : 'oak',
        bookshelfStyle: ['classic', 'dark', 'minimal'].includes(d.bookshelfStyle)
          ? d.bookshelfStyle
          : 'classic',
        theme: ['warm-ivory', 'soft-sage', 'evening-study'].includes(d.theme)
          ? d.theme
          : 'warm-ivory',
        soundEnabled: typeof d.soundEnabled === 'boolean' ? d.soundEnabled : true,
        soundVolume: typeof d.soundVolume === 'number' ? Math.max(0, Math.min(1, d.soundVolume)) : 0.5,
        animationMode: ['full', 'reduced', 'none'].includes(d.animationMode)
          ? d.animationMode
          : 'full',
        defaultPenColor: clampStr(d.defaultPenColor, 32, '#2C2623'),
        defaultPageColor: clampStr(d.defaultPageColor, 32, '#FAF6F0'),
        defaultFontFamily: clampStr(d.defaultFontFamily, 64, 'Caveat'),
        hasSeenRoomIntro: Boolean(d.hasSeenRoomIntro),
        createdAt: defaultProfile.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const created: UserProfile = {
    ...defaultProfile,
    uid: user.uid,
    displayName: clampStr(user.displayName || 'Journal Writer', 120, 'Journal Writer'),
  };

  try {
    await setDoc(ref, {
      uid: created.uid,
      displayName: created.displayName,
      tableStyle: created.tableStyle,
      bookshelfStyle: created.bookshelfStyle,
      theme: created.theme,
      soundEnabled: created.soundEnabled,
      soundVolume: created.soundVolume,
      animationMode: created.animationMode,
      defaultPenColor: created.defaultPenColor,
      defaultPageColor: created.defaultPageColor,
      defaultFontFamily: created.defaultFontFamily,
      hasSeenRoomIntro: created.hasSeenRoomIntro,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return created;
}

export async function saveUserProfileToCloud(profile: UserProfile): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  const path = `users/${profile.uid}`;
  const ref = doc(db, 'users', profile.uid);
  try {
    await updateDoc(ref, {
      displayName: clampStr(profile.displayName, 120, 'Journal Writer'),
      tableStyle: ['oak', 'walnut', 'modern'].includes(profile.tableStyle)
        ? profile.tableStyle
        : 'oak',
      bookshelfStyle: ['classic', 'dark', 'minimal'].includes(profile.bookshelfStyle)
        ? profile.bookshelfStyle
        : 'classic',
      theme: ['warm-ivory', 'soft-sage', 'evening-study'].includes(profile.theme)
        ? profile.theme
        : 'warm-ivory',
      soundEnabled: Boolean(profile.soundEnabled),
      soundVolume: Math.max(0, Math.min(1, Number(profile.soundVolume) || 0.5)),
      animationMode: ['full', 'reduced', 'none'].includes(profile.animationMode)
        ? profile.animationMode
        : 'full',
      defaultPenColor: clampStr(profile.defaultPenColor, 32, '#2C2623'),
      defaultPageColor: clampStr(profile.defaultPageColor, 32, '#FAF6F0'),
      defaultFontFamily: clampStr(profile.defaultFontFamily, 64, 'Caveat'),
      hasSeenRoomIntro: Boolean(profile.hasSeenRoomIntro),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchUserNotebooksFromCloud(
  uid: string,
): Promise<{ notebooks: Notebook[]; pagesByNotebook: Record<string, NotebookPage[]> }> {
  const path = 'notebooks';
  const notebooks: Notebook[] = [];
  const pagesByNotebook: Record<string, NotebookPage[]> = {};

  try {
    const q = query(collection(db, 'notebooks'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const nb: Notebook = {
        id: docSnap.id,
        ownerId: d.ownerId,
        title: d.title || 'Untitled Notebook',
        description: d.description || '',
        notebookType: d.notebookType || 'free',
        journalYear: typeof d.journalYear === 'number' ? d.journalYear : 2026,
        coverColor: d.coverColor || '#EFE6D8',
        coverMaterial: d.coverMaterial || 'linen',
        coverAccent: d.coverAccent || 'botanical',
        bindingStyle: d.bindingStyle || 'spiral',
        defaultPaperStyle: d.defaultPaperStyle || 'ruled',
        defaultPageColor: d.defaultPageColor || '#FAF6F0',
        defaultFontFamily: d.defaultFontFamily || 'Caveat',
        pageCount: typeof d.pageCount === 'number' ? d.pageCount : 1,
        lastOpenedPage: typeof d.lastOpenedPage === 'number' ? d.lastOpenedPage : 1,
        lastViewedDate: d.lastViewedDate || '',
        archived: Boolean(d.archived),
        deskPositionX: typeof d.deskPositionX === 'number' ? d.deskPositionX : 0,
        deskPositionZ: typeof d.deskPositionZ === 'number' ? d.deskPositionZ : 0,
        deskRotationY: typeof d.deskRotationY === 'number' ? d.deskRotationY : 0,
        bookmarkIds: Array.isArray(d.bookmarkIds) ? d.bookmarkIds : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notebooks.push(nb);

      // Fetch pages subcollection with ownerId filter matching security rules
      const pagesPath = `notebooks/${nb.id}/pages`;
      try {
        const pq = query(
          collection(db, 'notebooks', nb.id, 'pages'),
          where('ownerId', '==', uid),
          where('notebookId', '==', nb.id),
        );
        const pSnap = await getDocs(pq);
        const pageList: NotebookPage[] = pSnap.docs
          .map((pDoc) => {
            const pd = pDoc.data();
            const rawBlocks = Array.isArray(pd.textBlocks) ? pd.textBlocks : [];
            const { textBlocks, shapes } = unpackShapesFromTextBlocks(rawBlocks);
            return {
              id: pDoc.id,
              notebookId: nb.id,
              ownerId: pd.ownerId,
              pageNumber: typeof pd.pageNumber === 'number' ? pd.pageNumber : 1,
              entryDate: pd.entryDate || '',
              title: pd.title || '',
              paperStyle: nb.defaultPaperStyle,
              pageColor: nb.defaultPageColor,
              bookmarkTitle: pd.bookmarkTitle || '',
              bookmarkColor: pd.bookmarkColor || '',
              bookmarkStyle: pd.bookmarkStyle || 'none',
              textBlocks,
              shapes,
              strokes: Array.isArray(pd.strokes) ? pd.strokes : [],
              photos: Array.isArray(pd.photos) ? pd.photos : [],
              wordCount: typeof pd.wordCount === 'number' ? pd.wordCount : 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          })
          .sort((a, b) => a.pageNumber - b.pageNumber);
        pagesByNotebook[nb.id] = pageList;
      } catch (pageErr) {
        handleFirestoreError(pageErr, OperationType.LIST, pagesPath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }

  return { notebooks, pagesByNotebook };
}

export async function upsertNotebookToCloud(nb: Notebook, isNew: boolean): Promise<void> {
  if (!auth.currentUser) return;
  const ownerId = auth.currentUser.uid;
  const path = `notebooks/${nb.id}`;
  const ref = doc(db, 'notebooks', nb.id);

  const sanitized = {
    title: clampStr(nb.title, 120, 'Untitled Notebook') || 'Untitled Notebook',
    description: clampStr(nb.description, 500, ''),
    notebookType: ['daily', 'free', 'notes'].includes(nb.notebookType) ? nb.notebookType : 'free',
    journalYear: Math.max(1970, Math.min(2100, Math.round(nb.journalYear || 2026))),
    coverColor: clampStr(nb.coverColor, 32, '#EFE6D8'),
    coverMaterial: ['linen', 'leather', 'kraft', 'buckram'].includes(nb.coverMaterial)
      ? nb.coverMaterial
      : 'linen',
    coverAccent: ['botanical', 'minimal-frame', 'celestial', 'monogram', 'none'].includes(
      nb.coverAccent,
    )
      ? nb.coverAccent
      : 'botanical',
    bindingStyle: ['spiral', 'stitched', 'hardcover', 'softcover'].includes(nb.bindingStyle)
      ? nb.bindingStyle
      : 'spiral',
    defaultPaperStyle: ['ruled', 'dotted', 'blank'].includes(nb.defaultPaperStyle)
      ? nb.defaultPaperStyle
      : 'ruled',
    defaultPageColor: clampStr(nb.defaultPageColor, 32, '#FAF6F0'),
    defaultFontFamily: clampStr(nb.defaultFontFamily, 64, 'Caveat'),
    pageCount: Math.max(1, Math.min(2000, Math.round(nb.pageCount || 1))),
    lastOpenedPage: Math.max(1, Math.min(2000, Math.round(nb.lastOpenedPage || 1))),
    lastViewedDate: clampStr(nb.lastViewedDate, 32, ''),
    archived: Boolean(nb.archived),
    deskPositionX: Math.max(-50, Math.min(50, Number(nb.deskPositionX) || 0)),
    deskPositionZ: Math.max(-50, Math.min(50, Number(nb.deskPositionZ) || 0)),
    deskRotationY: Math.max(-10, Math.min(10, Number(nb.deskRotationY) || 0)),
    bookmarkIds: (nb.bookmarkIds || [])
      .slice(0, 30)
      .map((id) => clampStr(id, 128, 'page-1')),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isNew) {
      await setDoc(ref, {
        id: nb.id,
        ownerId,
        ...sanitized,
        createdAt: serverTimestamp(),
      });
    } else {
      try {
        await updateDoc(ref, sanitized);
      } catch {
        // Document does not exist in cloud yet (e.g. local starter notebook modified after sign-in)
        await setDoc(ref, {
          id: nb.id,
          ownerId,
          ...sanitized,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function upsertNotebookPageToCloud(
  page: NotebookPage,
  isNew: boolean,
): Promise<void> {
  if (!auth.currentUser) return;
  const ownerId = auth.currentUser.uid;
  const path = `notebooks/${page.notebookId}/pages/${page.id}`;
  const ref = doc(db, 'notebooks', page.notebookId, 'pages', page.id);

  // Clean nested maps to guarantee zero `undefined` values in Firestore arrays
  const packedBlocks = packShapesIntoTextBlocks(page.textBlocks || [], page.shapes);
  const cleanTextBlocks = packedBlocks.slice(0, 100).map((b) => ({
    id: clampStr(b.id, 64, 'tb-1'),
    text: clampStr(b.text, 20000, ''),
    x: Number(b.x) || 7,
    y: Number(b.y) || 14,
    width: Number(b.width) || 85,
    fontFamily: clampStr(b.fontFamily, 64, 'Caveat'),
    fontSize: Number(b.fontSize) || 24,
    color: clampStr(b.color, 32, '#2C2623'),
    underlined: Boolean(b.underlined),
    align: ['left', 'center', 'right'].includes(b.align) ? b.align : 'left',
    layerOrder: Number(b.layerOrder) || 1,
    createdAt: Number(b.createdAt) || Date.now(),
  }));

  const cleanStrokes = (page.strokes || []).slice(0, 300).map((s) => ({
    id: clampStr(s.id, 64, 'st-1'),
    instrument: clampStr(s.instrument, 32, 'fountain'),
    color: clampStr(s.color, 32, '#2C2623'),
    size: Number(s.size) || 3,
    opacity: Number(s.opacity) || 0.95,
    points: (s.points || []).slice(0, 800).map((pt) => ({
      x: Number(pt.x) || 0,
      y: Number(pt.y) || 0,
      pressure: Number(pt.pressure) || 0.5,
    })),
    layerOrder: Number(s.layerOrder) || 1,
    createdAt: Number(s.createdAt) || Date.now(),
  }));

  const cleanPhotos = (page.photos || []).slice(0, 30).map((p) => ({
    id: clampStr(p.id, 64, 'ph-1'),
    dataUrl: clampStr(p.dataUrl, 350000, ''),
    caption: clampStr(p.caption || '', 200, ''),
    x: Number(p.x) || 20,
    y: Number(p.y) || 40,
    width: Number(p.width) || 42,
    aspectRatio: Number(p.aspectRatio) || 1.33,
    rotation: Number(p.rotation) || 0,
    hasBorder: Boolean(p.hasBorder),
    hasTape: Boolean(p.hasTape),
    tapeColor: clampStr(p.tapeColor || '#E8D8BE', 32, '#E8D8BE'),
    layerOrder: Number(p.layerOrder) || 2,
    createdAt: Number(p.createdAt) || Date.now(),
  }));

  const sanitized = {
    pageNumber: Math.max(1, Math.min(2000, Math.round(page.pageNumber || 1))),
    entryDate: clampStr(page.entryDate, 32, ''),
    title: clampStr(page.title, 200, ''),
    paperStyle: ['ruled', 'dotted', 'blank'].includes(page.paperStyle) ? page.paperStyle : 'ruled',
    pageColor: clampStr(page.pageColor, 32, '#FAF6F0'),
    bookmarkTitle: clampStr(page.bookmarkTitle, 120, ''),
    bookmarkColor: clampStr(page.bookmarkColor, 32, ''),
    bookmarkStyle: ['satin', 'linen', 'velvet', 'none'].includes(page.bookmarkStyle)
      ? page.bookmarkStyle
      : 'none',
    textBlocks: cleanTextBlocks,
    strokes: cleanStrokes,
    photos: cleanPhotos,
    wordCount: Math.max(0, Math.min(500000, Math.round(page.wordCount || 0))),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isNew) {
      await setDoc(ref, {
        id: page.id,
        notebookId: page.notebookId,
        ownerId,
        ...sanitized,
        createdAt: serverTimestamp(),
      });
    } else {
      try {
        await updateDoc(ref, sanitized);
      } catch {
        await setDoc(ref, {
          id: page.id,
          notebookId: page.notebookId,
          ownerId,
          ...sanitized,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteNotebookFromCloud(
  notebookId: string,
  pageIds: string[],
): Promise<void> {
  if (!auth.currentUser) return;
  for (const pid of pageIds) {
    const pPath = `notebooks/${notebookId}/pages/${pid}`;
    try {
      await deleteDoc(doc(db, 'notebooks', notebookId, 'pages', pid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, pPath);
    }
  }
  const path = `notebooks/${notebookId}`;
  try {
    await deleteDoc(doc(db, 'notebooks', notebookId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteNotebookPageFromCloud(
  notebookId: string,
  pageId: string,
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `notebooks/${notebookId}/pages/${pageId}`;
  try {
    await deleteDoc(doc(db, 'notebooks', notebookId, 'pages', pageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
