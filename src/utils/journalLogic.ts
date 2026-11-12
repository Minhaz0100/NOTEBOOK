import type {
  BindingStyle,
  Notebook,
  NotebookPage,
  PlacedPhoto,
  PlacedShape,
  TypedTextBlock,
} from '../types/journal';

export const SHAPES_META_BLOCK_ID = '__shapes_meta__';

export interface PageDocumentState {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  underlined: boolean;
  align: 'left' | 'center' | 'right';
}

/**
 * Counts words in a string cleanly.
 */
export function countWordsInText(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates total words on a single notebook page across its title and all typed text blocks
 * (excluding internal shape metadata blocks).
 */
export function calculatePageWordCount(
  page: Pick<NotebookPage, 'title' | 'textBlocks'>,
): number {
  const titleWords = countWordsInText(page.title);
  const blockWords = (page.textBlocks || []).reduce((sum, block: TypedTextBlock) => {
    if (block.id === SHAPES_META_BLOCK_ID) return sum;
    return sum + countWordsInText(block.text);
  }, 0);
  return titleWords + blockWords;
}

/**
 * Extracts the continuous Google Docs-style document flow and per-page typography settings
 * from a NotebookPage. Joins legacy multi-block entries seamlessly with double newlines.
 */
export function getPageDocumentState(
  page: Pick<NotebookPage, 'textBlocks'>,
  defaultFont = 'Caveat',
  defaultColor = '#2C2623',
): PageDocumentState {
  const realBlocks = (page.textBlocks || []).filter((b) => b.id !== SHAPES_META_BLOCK_ID);
  if (realBlocks.length === 0) {
    return {
      text: '',
      fontFamily: defaultFont,
      fontSize: 24,
      color: defaultColor,
      underlined: false,
      align: 'left',
    };
  }
  const primary = realBlocks[0];
  const combinedText = realBlocks.map((b) => b.text).join('\n\n');
  return {
    text: combinedText,
    fontFamily: primary.fontFamily || defaultFont,
    fontSize: primary.fontSize || 24,
    color: primary.color || defaultColor,
    underlined: Boolean(primary.underlined),
    align: primary.align || 'left',
  };
}

/**
 * Returns an updated NotebookPage with its continuous document flow and per-page style
 * stored in textBlocks[0], preserving any per-page shapes and recalculating wordCount.
 */
export function buildPageWithDocumentState(
  page: NotebookPage,
  patch: Partial<PageDocumentState>,
  defaultFont = 'Caveat',
  defaultColor = '#2C2623',
): NotebookPage {
  const current = getPageDocumentState(page, defaultFont, defaultColor);
  const nextDoc: PageDocumentState = {
    ...current,
    ...patch,
  };
  const docBlock: TypedTextBlock = {
    id: 'doc-body',
    text: nextDoc.text,
    x: 7,
    y: 12,
    width: 86,
    fontFamily: nextDoc.fontFamily,
    fontSize: nextDoc.fontSize,
    color: nextDoc.color,
    underlined: nextDoc.underlined,
    align: nextDoc.align,
    layerOrder: 1,
    createdAt: page.textBlocks?.[0]?.createdAt || 1,
  };
  const updatedPage: NotebookPage = {
    ...page,
    textBlocks: [docBlock],
  };
  updatedPage.wordCount = calculatePageWordCount(updatedPage);
  return updatedPage;
}

/**
 * Clamps a placed shape's geometry so it always stays within reachable bounds on the A4 page.
 */
export function clampShapeTransform(shape: PlacedShape): PlacedShape {
  const width = Math.max(6, Math.min(88, Number.isFinite(shape.width) ? shape.width : 28));
  const height = Math.max(3, Math.min(84, Number.isFinite(shape.height) ? shape.height : 18));
  const x = Math.max(2, Math.min(96 - width * 0.5, Number.isFinite(shape.x) ? shape.x : 24));
  const y = Math.max(2, Math.min(92 - height * 0.5, Number.isFinite(shape.y) ? shape.y : 26));
  const strokeWidth = Math.max(
    1.5,
    Math.min(8, Number.isFinite(shape.strokeWidth) ? shape.strokeWidth : 2.5),
  );
  let rotation = Number.isFinite(shape.rotation) ? shape.rotation : 0;
  while (rotation > 180) rotation -= 360;
  while (rotation < -180) rotation += 360;

  return {
    ...shape,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
    strokeWidth: Number(strokeWidth.toFixed(1)),
    rotation: Number(rotation.toFixed(1)),
  };
}

/**
 * Packs per-page shapes into textBlocks for cloud persistence compatibility with firestore.rules.
 */
export function packShapesIntoTextBlocks(
  textBlocks: TypedTextBlock[],
  shapes?: PlacedShape[],
): TypedTextBlock[] {
  const cleanBlocks = (textBlocks || []).filter((b) => b.id !== SHAPES_META_BLOCK_ID);
  if (!shapes || shapes.length === 0) {
    return cleanBlocks;
  }
  const metaBlock: TypedTextBlock = {
    id: SHAPES_META_BLOCK_ID,
    text: JSON.stringify(shapes.slice(0, 40)),
    x: 0,
    y: 0,
    width: 20,
    fontFamily: 'Caveat',
    fontSize: 20,
    color: '#2C2623',
    underlined: false,
    align: 'left',
    layerOrder: 99,
    createdAt: 1,
  };
  return [...cleanBlocks, metaBlock];
}

/**
 * Unpacks shapes from textBlocks when loading from Firestore, returning clean textBlocks and shapes.
 */
export function unpackShapesFromTextBlocks(
  textBlocks: TypedTextBlock[],
  existingShapes?: PlacedShape[],
): { textBlocks: TypedTextBlock[]; shapes: PlacedShape[] } {
  const meta = (textBlocks || []).find((b) => b.id === SHAPES_META_BLOCK_ID);
  const cleanBlocks = (textBlocks || []).filter((b) => b.id !== SHAPES_META_BLOCK_ID);
  if (existingShapes && existingShapes.length > 0) {
    return { textBlocks: cleanBlocks, shapes: existingShapes };
  }
  if (!meta || !meta.text) {
    return { textBlocks: cleanBlocks, shapes: [] };
  }
  try {
    const parsed = JSON.parse(meta.text);
    if (Array.isArray(parsed)) {
      return { textBlocks: cleanBlocks, shapes: parsed.map(clampShapeTransform) };
    }
  } catch {
    // ignore malformed shape metadata
  }
  return { textBlocks: cleanBlocks, shapes: [] };
}

/**
 * Calculates total words across an entire notebook's pages.
 */
export function calculateNotebookWordCount(
  pages: Array<Pick<NotebookPage, 'title' | 'textBlocks'>>,
): number {
  if (!Array.isArray(pages)) return 0;
  return pages.reduce((sum, p) => sum + calculatePageWordCount(p), 0);
}

/**
 * Formats an ISO YYYY-MM-DD date string into a warm handwritten date label (e.g. "Nov 10, 2026").
 * If empty or invalid, returns a fallback or the raw string.
 */
export function formatHandwrittenDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;

  const year = parseInt(match[1], 10);
  const monthIndex = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const shortMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
    return trimmed;
  }
  return `${shortMonths[monthIndex]} ${day}, ${year}`;
}

/**
 * Computes visual 2D book spine thickness in pixels based on page count and binding style.
 * Guarantees that adding pages visibly thickens the physical notebook spine.
 */
export function computeNotebookSpineThickness(
  pageCount: number,
  bindingStyle: BindingStyle,
): number {
  const clampedPages = Math.max(1, Math.min(2000, pageCount || 1));
  const baseCoverThickness =
    bindingStyle === 'hardcover'
      ? 0.085
      : bindingStyle === 'spiral'
        ? 0.065
        : bindingStyle === 'stitched'
          ? 0.055
          : 0.048;
  const paperStack = Math.min(0.42, clampedPages * 0.0045 + Math.log10(clampedPages) * 0.035);
  return Number((baseCoverThickness + paperStack).toFixed(4));
}

/**
 * Computes non-overlapping desk positions for active notebooks.
 */
export function computeIntelligentDeskPositions(
  notebooks: Notebook[],
): Array<{ id: string; x: number; z: number; rotY: number }> {
  const active = notebooks.filter((n) => !n.archived);
  const results: Array<{ id: string; x: number; z: number; rotY: number }> = [];
  const minDistance = 1.42;

  const naturalSlots = [
    { x: -1.75, z: 0.55, rotY: 0.06 },
    { x: 0.0, z: 0.62, rotY: -0.04 },
    { x: 1.75, z: 0.52, rotY: 0.08 },
    { x: -1.65, z: -0.95, rotY: -0.07 },
    { x: 0.05, z: -0.92, rotY: 0.05 },
    { x: 1.72, z: -0.95, rotY: -0.08 },
    { x: -3.25, z: -0.15, rotY: 0.11 },
    { x: 3.25, z: -0.15, rotY: -0.09 },
  ];

  for (let i = 0; i < active.length; i++) {
    const nb = active[i];
    const hasCustomPos =
      typeof nb.deskPositionX === 'number' &&
      typeof nb.deskPositionZ === 'number' &&
      (nb.deskPositionX !== 0 || nb.deskPositionZ !== 0);

    let candidateX = hasCustomPos
      ? Math.max(-3.4, Math.min(3.4, nb.deskPositionX))
      : naturalSlots[i % naturalSlots.length].x;
    let candidateZ = hasCustomPos
      ? Math.max(-1.35, Math.min(1.25, nb.deskPositionZ))
      : naturalSlots[i % naturalSlots.length].z;
    const candidateRot =
      typeof nb.deskRotationY === 'number' && nb.deskRotationY !== 0
        ? Math.max(-0.45, Math.min(0.45, nb.deskRotationY))
        : naturalSlots[i % naturalSlots.length].rotY;

    let attempts = 0;
    while (
      attempts < 48 &&
      results.some((placed) => {
        const dx = placed.x - candidateX;
        const dz = placed.z - candidateZ;
        return Math.hypot(dx, dz) < minDistance;
      })
    ) {
      if (attempts < naturalSlots.length) {
        const slot = naturalSlots[attempts];
        candidateX = slot.x;
        candidateZ = slot.z;
      } else {
        const step = attempts - naturalSlots.length + 1;
        const angle = step * 1.15;
        const radius = 0.8 + step * 0.28;
        candidateX = Math.cos(angle) * radius * 1.35;
        candidateZ = Math.sin(angle) * radius * 0.75;
      }
      attempts++;
    }

    results.push({
      id: nb.id,
      x: Number(candidateX.toFixed(3)),
      z: Number(candidateZ.toFixed(3)),
      rotY: Number(candidateRot.toFixed(3)),
    });
  }

  return results;
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  hasEntry: boolean;
  pageNumber: number | null;
  wordCount: number;
  entryTitle: string;
}

/**
 * Generates a 42-cell (6-week) calendar grid for a Daily Journal month,
 * associating existing notebook pages with their matching ISO date.
 */
export function getCalendarDaysForMonth(
  year: number,
  monthZeroIndexed: number,
  pages: NotebookPage[],
): CalendarDayCell[] {
  const firstDayOfMonth = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const startWeekday = firstDayOfMonth.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const startDate = new Date(Date.UTC(year, monthZeroIndexed, 1 - startWeekday));

  const pageByDate = new Map<string, NotebookPage>();
  for (const p of pages) {
    if (p.entryDate) {
      const existing = pageByDate.get(p.entryDate);
      if (!existing || p.wordCount > existing.wordCount) {
        pageByDate.set(p.entryDate, p);
      }
    }
  }

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const matchedPage = pageByDate.get(dateStr);
    const hasContent = Boolean(
      matchedPage &&
        (matchedPage.wordCount > 0 ||
          (matchedPage.strokes && matchedPage.strokes.length > 0) ||
          (matchedPage.shapes && matchedPage.shapes.length > 0) ||
          (matchedPage.photos && matchedPage.photos.length > 0) ||
          matchedPage.title.trim().length > 0),
    );

    cells.push({
      dateStr,
      dayOfMonth: day,
      isCurrentMonth: m === monthZeroIndexed && y === year,
      hasEntry: hasContent,
      pageNumber: matchedPage ? matchedPage.pageNumber : null,
      wordCount: matchedPage ? matchedPage.wordCount : 0,
      entryTitle: matchedPage?.title || '',
    });
  }

  return cells;
}

/**
 * Clamps a photograph's position, size, and rotation so it always remains reachable on the page.
 */
export function clampPhotoTransform(photo: PlacedPhoto): PlacedPhoto {
  const width = Math.max(14, Math.min(78, Number.isFinite(photo.width) ? photo.width : 36));
  const x = Math.max(1, Math.min(96 - width * 0.5, Number.isFinite(photo.x) ? photo.x : 18));
  const y = Math.max(2, Math.min(88, Number.isFinite(photo.y) ? photo.y : 28));
  let rotation = Number.isFinite(photo.rotation) ? photo.rotation : 0;
  while (rotation > 180) rotation -= 360;
  while (rotation < -180) rotation += 360;

  return {
    ...photo,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(width.toFixed(2)),
    rotation: Number(rotation.toFixed(1)),
  };
}
