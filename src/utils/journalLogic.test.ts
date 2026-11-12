import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPageWithDocumentState,
  calculateNotebookWordCount,
  calculatePageWordCount,
  clampPhotoTransform,
  clampShapeTransform,
  computeIntelligentDeskPositions,
  computeNotebookSpineThickness,
  countWordsInText,
  formatHandwrittenDate,
  getCalendarDaysForMonth,
  getPageDocumentState,
  packShapesIntoTextBlocks,
  unpackShapesFromTextBlocks,
} from './journalLogic';
import type { Notebook, NotebookPage, PlacedPhoto, PlacedShape } from '../types/journal';

test('countWordsInText and calculatePageWordCount count words accurately', () => {
  assert.equal(countWordsInText(''), 0);
  assert.equal(countWordsInText('   '), 0);
  assert.equal(countWordsInText('A Peaceful Day'), 3);
  assert.equal(countWordsInText('Today was such a calm day.\nLife feels brighter!'), 9);

  const pageWords = calculatePageWordCount({
    title: 'A Peaceful Day',
    textBlocks: [
      {
        id: 'tb1',
        text: 'Today was such a calm day.',
        x: 8,
        y: 14,
        width: 84,
        fontFamily: 'Caveat',
        fontSize: 24,
        color: '#2C2623',
        underlined: false,
        align: 'left',
        layerOrder: 1,
        createdAt: 1,
      },
      {
        id: 'tb2',
        text: 'Read a good book and enjoyed the little things.',
        x: 8,
        y: 35,
        width: 84,
        fontFamily: 'Caveat',
        fontSize: 24,
        color: '#3B4D7A',
        underlined: true,
        align: 'left',
        layerOrder: 2,
        createdAt: 2,
      },
    ],
  });
  assert.equal(pageWords, 3 + 6 + 9);

  const totalNotebookWords = calculateNotebookWordCount([
    { title: 'Entry One', textBlocks: [] },
    {
      title: 'Entry Two',
      textBlocks: [
        {
          id: 'tb3',
          text: 'Four words right here',
          x: 0,
          y: 0,
          width: 80,
          fontFamily: 'Caveat',
          fontSize: 22,
          color: '#000',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
    },
  ]);
  assert.equal(totalNotebookWords, 2 + 2 + 4);
});

test('getPageDocumentState and buildPageWithDocumentState manage per-page document flow and styles', () => {
  const page: NotebookPage = {
    id: 'p1',
    notebookId: 'nb1',
    ownerId: 'u1',
    pageNumber: 1,
    entryDate: '2026-11-10',
    title: 'Morning Notes',
    paperStyle: 'ruled',
    pageColor: '#FAF6F0',
    bookmarkTitle: '',
    bookmarkColor: '',
    bookmarkStyle: 'none',
    textBlocks: [
      {
        id: 'tb1',
        text: 'First paragraph.',
        x: 7,
        y: 12,
        width: 86,
        fontFamily: 'Dancing Script',
        fontSize: 26,
        color: '#3B4D7A',
        underlined: false,
        align: 'left',
        layerOrder: 1,
        createdAt: 1,
      },
      {
        id: 'tb2',
        text: 'Second paragraph.',
        x: 7,
        y: 30,
        width: 86,
        fontFamily: 'Dancing Script',
        fontSize: 26,
        color: '#3B4D7A',
        underlined: false,
        align: 'left',
        layerOrder: 2,
        createdAt: 2,
      },
    ],
    strokes: [],
    photos: [],
    wordCount: 6,
    createdAt: '',
    updatedAt: '',
  };

  const docState = getPageDocumentState(page);
  assert.equal(docState.text, 'First paragraph.\n\nSecond paragraph.');
  assert.equal(docState.fontFamily, 'Dancing Script');
  assert.equal(docState.color, '#3B4D7A');

  const updatedPage = buildPageWithDocumentState(page, {
    text: 'First paragraph.\n\nSecond paragraph.\n\nThird line added continuously.',
    fontFamily: 'Kalam',
    color: '#48704C',
  });
  assert.equal(updatedPage.textBlocks.length, 1);
  assert.equal(updatedPage.textBlocks[0].fontFamily, 'Kalam');
  assert.equal(updatedPage.textBlocks[0].color, '#48704C');
  assert.equal(updatedPage.wordCount, 2 + 8);
});

test('clampShapeTransform and packShapesIntoTextBlocks / unpackShapesFromTextBlocks round-trip shapes', () => {
  const rawShape: PlacedShape = {
    id: 'sh1',
    kind: 'rectangle',
    x: 120,
    y: -15,
    width: 150,
    height: 110,
    color: '#3B4D7A',
    fillColor: 'transparent',
    strokeWidth: 12,
    dashed: true,
    rotation: 380,
    layerOrder: 1,
    createdAt: 1,
  };
  const clamped = clampShapeTransform(rawShape);
  assert.ok(clamped.width <= 88 && clamped.width >= 6);
  assert.ok(clamped.height <= 84 && clamped.height >= 3);
  assert.ok(clamped.strokeWidth <= 8 && clamped.strokeWidth >= 1.5);
  assert.equal(clamped.rotation, 20);

  const packed = packShapesIntoTextBlocks([], [clamped]);
  assert.equal(packed.length, 1);
  assert.equal(calculatePageWordCount({ title: 'Title', textBlocks: packed }), 1);

  const unpacked = unpackShapesFromTextBlocks(packed);
  assert.equal(unpacked.textBlocks.length, 0);
  assert.equal(unpacked.shapes.length, 1);
  assert.equal(unpacked.shapes[0].id, 'sh1');
  assert.equal(unpacked.shapes[0].kind, 'rectangle');
});

test('formatHandwrittenDate formats ISO dates into readable handwritten labels', () => {
  assert.equal(formatHandwrittenDate(''), '');
  assert.equal(formatHandwrittenDate('2026-11-10'), 'Nov 10, 2026');
  assert.equal(formatHandwrittenDate('2026-01-05'), 'Jan 5, 2026');
  assert.equal(formatHandwrittenDate('Sunday Morning'), 'Sunday Morning');
});

test('computeNotebookSpineThickness increases monotonically with pageCount', () => {
  const thin = computeNotebookSpineThickness(2, 'spiral');
  const medium = computeNotebookSpineThickness(24, 'spiral');
  const thick = computeNotebookSpineThickness(80, 'spiral');
  assert.ok(thin < medium, `Expected ${thin} < ${medium}`);
  assert.ok(medium < thick, `Expected ${medium} < ${thick}`);

  const hardcover = computeNotebookSpineThickness(24, 'hardcover');
  const softcover = computeNotebookSpineThickness(24, 'softcover');
  assert.ok(hardcover > softcover, 'Hardcover should have thicker boards than softcover');
});

test('computeIntelligentDeskPositions prevents notebook collisions on the desk', () => {
  const makeNb = (id: string, archived = false): Notebook => ({
    id,
    ownerId: 'u1',
    title: `Notebook ${id}`,
    description: '',
    notebookType: 'free',
    journalYear: 2026,
    coverColor: '#D8CFC4',
    coverMaterial: 'linen',
    coverAccent: 'botanical',
    bindingStyle: 'spiral',
    defaultPaperStyle: 'ruled',
    defaultPageColor: '#FAF6F0',
    defaultFontFamily: 'Caveat',
    pageCount: 6,
    lastOpenedPage: 1,
    lastViewedDate: '',
    archived,
    deskPositionX: 0,
    deskPositionZ: 0,
    deskRotationY: 0,
    bookmarkIds: [],
    createdAt: '',
    updatedAt: '',
  });

  const positions = computeIntelligentDeskPositions([
    makeNb('n1'),
    makeNb('n2'),
    makeNb('n3'),
    makeNb('n4'),
    makeNb('n5', true),
  ]);

  assert.equal(positions.length, 4);
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dist = Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z);
      assert.ok(dist >= 1.4, `Notebooks ${i} and ${j} are too close: ${dist}`);
    }
  }
});

test('getCalendarDaysForMonth maps date-based entries to calendar cells', () => {
  const samplePage: NotebookPage = {
    id: 'p1',
    notebookId: 'nb1',
    ownerId: 'u1',
    pageNumber: 3,
    entryDate: '2026-11-08',
    title: 'A Peaceful Day',
    paperStyle: 'ruled',
    pageColor: '#FAF6F0',
    bookmarkTitle: '',
    bookmarkColor: '',
    bookmarkStyle: 'none',
    textBlocks: [],
    strokes: [],
    photos: [],
    wordCount: 42,
    createdAt: '',
    updatedAt: '',
  };

  const cells = getCalendarDaysForMonth(2026, 10, [samplePage]);
  assert.equal(cells.length, 42);
  const nov8 = cells.find((c) => c.dateStr === '2026-11-08');
  assert.ok(nov8);
  assert.equal(nov8.hasEntry, true);
  assert.equal(nov8.pageNumber, 3);
  assert.equal(nov8.entryTitle, 'A Peaceful Day');
});

test('clampPhotoTransform keeps freeform photos within safe page bounds and angle range', () => {
  const raw: PlacedPhoto = {
    id: 'ph1',
    dataUrl: 'data:image/png;base64,abc',
    caption: 'Sunset',
    x: 150,
    y: -20,
    width: 120,
    aspectRatio: 1.33,
    rotation: 545,
    hasBorder: true,
    hasTape: true,
    tapeColor: '#E6D7B9',
    layerOrder: 3,
    createdAt: 1,
  };
  const clamped = clampPhotoTransform(raw);
  assert.ok(clamped.width <= 78 && clamped.width >= 14);
  assert.ok(clamped.x >= 1 && clamped.x <= 96);
  assert.ok(clamped.y >= 2 && clamped.y <= 88);
  assert.ok(clamped.rotation >= -180 && clamped.rotation <= 180);
});
