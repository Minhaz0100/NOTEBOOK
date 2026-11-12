import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Columns2,
  Eye,
  FileText,
  Menu,
  PenTool,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ActiveToolMode,
  AnimationMode,
  JournalSummaryResult,
  Notebook,
  NotebookPage,
  PenConfig,
  PlacedPhoto,
  PlacedShape,
  ShapeKind,
  SyncStatus,
} from '../types/journal';
import {
  buildPageWithDocumentState,
  clampPhotoTransform,
  clampShapeTransform,
  getCalendarDaysForMonth,
  getPageDocumentState,
  type PageDocumentState,
} from '../utils/journalLogic';
import {
  compressUploadedImageToDataUrl,
  getStudioSamplePhotos,
} from '../utils/samplePhotos';
import { soundEngine } from '../utils/soundEffects';
import { PageCanvasSurface } from './PageCanvasSurface';
import { PenBoxTray } from './PenBoxTray';

interface NotebookSpreadViewProps {
  notebook: Notebook;
  pages: NotebookPage[];
  syncStatus: SyncStatus;
  soundEnabled: boolean;
  soundVolume: number;
  animationMode: AnimationMode;
  onCloseNotebook: () => void;
  onOpenNotebookSettings: () => void;
  onUpdateNotebookMeta: (patch: Partial<Notebook>) => void;
  onUpdatePage: (updatedPage: NotebookPage) => void;
  onAddPage: (entryDate?: string) => NotebookPage;
  onDeletePage: (pageId: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const NotebookSpreadView: React.FC<NotebookSpreadViewProps> = ({
  notebook,
  pages,
  syncStatus,
  soundEnabled,
  soundVolume,
  animationMode,
  onCloseNotebook,
  onOpenNotebookSettings,
  onUpdateNotebookMeta,
  onUpdatePage,
  onAddPage,
  onDeletePage,
}) => {
  const [forceSinglePage, setForceSinglePage] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isReadMode, setIsReadMode] = useState<boolean>(false);
  const [radialOrigin, setRadialOrigin] = useState<{ x: number; y: number } | null>(null);

  const isSinglePageMode = forceSinglePage;

  // Restore lastOpenedPage from notebook memory
  const [currentPageNum, setCurrentPageNum] = useState<number>(() =>
    Math.max(1, Math.min(pages.length || 1, notebook.lastOpenedPage || 1)),
  );
  const [activeSidePageNum, setActiveSidePageNum] = useState<number>(currentPageNum);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);

  interface FlippingLeafState {
    direction: 'next' | 'prev';
    page: NotebookPage;
  }
  const [flippingLeaf, setFlippingLeaf] = useState<FlippingLeafState | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleTurnNext();
      } else {
        handleTurnPrevious();
      }
    }
  };

  const [toolMode, setToolMode] = useState<ActiveToolMode>('write');
  const [penConfig, setPenConfig] = useState<PenConfig>({
    instrument: 'fountain',
    color: '#2C2623',
    size: 3,
    opacity: 0.95,
    fontFamily: notebook.defaultFontFamily || 'Caveat',
    fontSize: 25,
    underlined: false,
    align: 'left',
  });

  // Per-session Undo / Redo stack for page edits
  const [undoStack, setUndoStack] = useState<NotebookPage[]>([]);
  const [redoStack, setRedoStack] = useState<NotebookPage[]>([]);

  // Modals: Bookmark Index, Daily Journal Calendar, and AI Notebook Summary
  const [showBookmarkIndex, setShowBookmarkIndex] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(notebook.journalYear || 2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    if (notebook.lastViewedDate) {
      const m = parseInt(notebook.lastViewedDate.split('-')[1], 10);
      if (!Number.isNaN(m) && m >= 1 && m <= 12) return m - 1;
    }
    return 10; // November default
  });

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryScope, setSummaryScope] = useState<'page' | 'selected' | 'notebook'>('notebook');
  const [selectedSummaryPageNums, setSelectedSummaryPageNums] = useState<number[]>([1]);
  const [includeHandwritingInSummary, setIncludeHandwritingInSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<JournalSummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRadialOrigin(null);
        setShowBookmarkIndex(false);
        setShowCalendarModal(false);
        setShowSummaryModal(false);
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Compute left & right pages in two-page spread mode (odd pages on left: 1-2, 3-4, 5-6...)
  const leftPageNum = isSinglePageMode
    ? currentPageNum
    : currentPageNum % 2 === 1
      ? currentPageNum
      : Math.max(1, currentPageNum - 1);
  const rightPageNum = isSinglePageMode ? null : leftPageNum + 1;

  const leftPage = pages.find((p) => p.pageNumber === leftPageNum) || pages[0];
  const rightPage = rightPageNum ? pages.find((p) => p.pageNumber === rightPageNum) || null : null;

  const activePage =
    pages.find((p) => p.pageNumber === activeSidePageNum) || leftPage || pages[0];

  const activePageDocState = useMemo(
    () =>
      activePage
        ? getPageDocumentState(
            activePage,
            notebook.defaultFontFamily || 'Caveat',
            penConfig.color || '#2C2623',
          )
        : {
            text: '',
            fontFamily: notebook.defaultFontFamily || 'Caveat',
            fontSize: 24,
            color: penConfig.color || '#2C2623',
            underlined: false,
            align: 'left' as const,
          },
    [activePage, notebook.defaultFontFamily, penConfig.color],
  );

  // Remember lastOpenedPage & lastViewedDate whenever user navigates pages
  const navigateToPageNumber = (
    targetPage: number,
    directionHint?: 'next' | 'prev',
    allowNewPage = false,
  ) => {
    const clamped = allowNewPage
      ? Math.max(1, targetPage)
      : Math.max(1, Math.min(pages.length, targetPage));
    if (clamped === currentPageNum) return;

    const dir = directionHint || (clamped > currentPageNum ? 'next' : 'prev');
    const outgoingPage = activePage || leftPage;
    const targetPageObj = pages.find((p) => p.pageNumber === clamped) || outgoingPage;

    if (animationMode !== 'none' && outgoingPage) {
      if (flipTimerRef.current) {
        window.clearTimeout(flipTimerRef.current);
      }
      soundEngine.playPageTurn(soundEnabled, soundVolume);

      if (dir === 'next') {
        // Next: underlying page immediately becomes targetPage, leaf is outgoingPage curling away
        setFlippingLeaf({ direction: 'next', page: outgoingPage });
        setTurnDirection('next');
        setCurrentPageNum(clamped);
        setActiveSidePageNum(clamped);

        flipTimerRef.current = window.setTimeout(() => {
          setFlippingLeaf(null);
          setTurnDirection(null);
        }, 480);
      } else {
        // Prev: underlying page stays outgoingPage while leaf (targetPage) curls in from left to right
        setFlippingLeaf({ direction: 'prev', page: targetPageObj });
        setTurnDirection('prev');

        flipTimerRef.current = window.setTimeout(() => {
          setCurrentPageNum(clamped);
          setActiveSidePageNum(clamped);
          setFlippingLeaf(null);
          setTurnDirection(null);
        }, 470);
      }
    } else {
      soundEngine.playPageTurn(soundEnabled, soundVolume);
      setCurrentPageNum(clamped);
      setActiveSidePageNum(clamped);
    }

    onUpdateNotebookMeta({
      lastOpenedPage: clamped,
      lastViewedDate: targetPageObj?.entryDate || notebook.lastViewedDate,
    });
  };

  const handleTurnPrevious = () => {
    const step = isSinglePageMode ? 1 : 2;
    if (leftPageNum > 1) {
      navigateToPageNumber(Math.max(1, leftPageNum - step), 'prev');
    }
  };

  const handleTurnNext = () => {
    const step = isSinglePageMode ? 1 : 2;
    if (leftPageNum + step <= pages.length) {
      navigateToPageNumber(leftPageNum + step, 'next');
    } else {
      const created = onAddPage();
      navigateToPageNumber(created.pageNumber, 'next', true);
    }
  };

  const handlePageEditWithUndo = (updatedPage: NotebookPage, pushUndo = false) => {
    if (pushUndo) {
      const prior = pages.find((p) => p.id === updatedPage.id);
      if (prior) {
        setUndoStack((prev) => [...prev.slice(-24), prior]);
        setRedoStack([]);
      }
    }
    onUpdatePage(updatedPage);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    const currentState = pages.find((p) => p.id === previousState.id);
    setUndoStack((prev) => prev.slice(0, -1));
    if (currentState) {
      setRedoStack((prev) => [...prev, currentState]);
    }
    onUpdatePage(previousState);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    const currentState = pages.find((p) => p.id === nextState.id);
    setRedoStack((prev) => prev.slice(0, -1));
    if (currentState) {
      setUndoStack((prev) => [...prev, currentState]);
    }
    onUpdatePage(nextState);
  };

  const handleUploadPhotoToActivePage = async (file: File) => {
    if (!activePage) return;
    try {
      const { dataUrl, aspectRatio } = await compressUploadedImageToDataUrl(file);
      const newPhoto: PlacedPhoto = clampPhotoTransform({
        id: `ph-${Date.now()}`,
        dataUrl,
        caption: file.name.replace(/\.[^.]+$/, ''),
        x: 18 + ((activePage.photos?.length || 0) * 6) % 30,
        y: 38 + ((activePage.photos?.length || 0) * 5) % 25,
        width: 44,
        aspectRatio,
        rotation: (activePage.photos?.length || 0) % 2 === 0 ? -3.0 : 3.0,
        hasBorder: true,
        hasTape: true,
        tapeColor: '#E8D8BE',
        layerOrder: (activePage.photos?.length || 0) + 3,
        createdAt: Date.now(),
      });
      soundEngine.playPhotoPlace(soundEnabled, soundVolume);
      handlePageEditWithUndo(
        {
          ...activePage,
          photos: [...(activePage.photos || []), newPhoto],
        },
        true,
      );
    } catch {
      // ignore invalid file
    }
  };

  const handleInsertStudioPhotoToActivePage = (
    preset: 'sunset' | 'daisies' | 'windowCat' | 'botanical',
  ) => {
    if (!activePage) return;
    const studioMap = getStudioSamplePhotos();
    const dataUrl = studioMap[preset];
    if (!dataUrl) return;
    const labels: Record<string, string> = {
      sunset: 'Evening sky from the study window',
      daisies: 'Wild daisies in the morning light',
      windowCat: 'Afternoon nap in the sunbeam',
      botanical: 'Pressed olive leaf study',
    };
    const newPhoto: PlacedPhoto = clampPhotoTransform({
      id: `ph-${Date.now()}`,
      dataUrl,
      caption: labels[preset] || 'Studio Print',
      x: 18 + ((activePage.photos?.length || 0) * 7) % 32,
      y: 40 + ((activePage.photos?.length || 0) * 5) % 24,
      width: 44,
      aspectRatio: preset === 'botanical' ? 0.87 : 1.41,
      rotation: (activePage.photos?.length || 0) % 2 === 0 ? -3.5 : 3.0,
      hasBorder: true,
      hasTape: true,
      tapeColor: '#E8D8BE',
      layerOrder: (activePage.photos?.length || 0) + 3,
      createdAt: Date.now(),
    });
    soundEngine.playPhotoPlace(soundEnabled, soundVolume);
    handlePageEditWithUndo(
      {
        ...activePage,
        photos: [...(activePage.photos || []), newPhoto],
      },
      true,
    );
  };

  const handleUpdateActivePageDocStyle = (patch: Partial<PageDocumentState>) => {
    if (!activePage) return;
    const updated = buildPageWithDocumentState(
      activePage,
      patch,
      notebook.defaultFontFamily || 'Caveat',
      penConfig.color || '#2C2623',
    );
    handlePageEditWithUndo(updated, true);
  };

  const handleAddShapeToActivePage = (kind: ShapeKind) => {
    if (!activePage) return;
    const count = activePage.shapes?.length || 0;
    const strokeHex = activePageDocState.color || penConfig.color || '#2C2623';
    const newShape: PlacedShape = clampShapeTransform({
      id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      kind,
      x: 52 + ((count * 6) % 24),
      y: 26 + ((count * 7) % 30),
      width: kind === 'line' || kind === 'arrow' ? 36 : 26,
      height: kind === 'line' || kind === 'arrow' ? 6 : 16,
      color: strokeHex,
      fillColor: penConfig.shapeFilled ? `${strokeHex}1F` : 'transparent',
      strokeWidth: Math.max(2, Math.min(5, penConfig.size || 2.5)),
      dashed: Boolean(penConfig.shapeDashed),
      rotation: 0,
      layerOrder: count + 2,
      createdAt: Date.now(),
    });
    soundEngine.playPenSelect(soundEnabled, soundVolume);
    handlePageEditWithUndo(
      {
        ...activePage,
        shapes: [...(activePage.shapes || []), newShape],
      },
      true,
    );
  };

  const handleClearActivePageStrokes = () => {
    if (!activePage || !activePage.strokes || activePage.strokes.length === 0) return;
    soundEngine.playEraser(soundEnabled, soundVolume);
    handlePageEditWithUndo({ ...activePage, strokes: [] }, true);
  };

  const handleClearActivePageShapes = () => {
    if (!activePage || !activePage.shapes || activePage.shapes.length === 0) return;
    soundEngine.playEraser(soundEnabled, soundVolume);
    handlePageEditWithUndo({ ...activePage, shapes: [] }, true);
  };

  const bookmarkedPages = useMemo(
    () => pages.filter((p) => Boolean(p.bookmarkColor && p.bookmarkStyle !== 'none')),
    [pages],
  );

  const calendarCells = useMemo(
    () => getCalendarDaysForMonth(calendarYear, calendarMonth, pages),
    [calendarYear, calendarMonth, pages],
  );

  const handleSelectDateInCalendar = (dateStr: string) => {
    const existingPage = pages.find((p) => p.entryDate === dateStr);
    if (existingPage) {
      setShowCalendarModal(false);
      navigateToPageNumber(existingPage.pageNumber);
    } else {
      const created = onAddPage(dateStr);
      setShowCalendarModal(false);
      navigateToPageNumber(created.pageNumber, 'next', true);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const targetPages =
        summaryScope === 'page'
          ? [activePage]
          : summaryScope === 'selected'
            ? pages.filter((p) => selectedSummaryPageNums.includes(p.pageNumber))
            : pages;

      const payloadPages = targetPages.filter(Boolean).map((p) => ({
        pageNumber: p.pageNumber,
        entryDate: p.entryDate,
        title: p.title,
        textContent: (p.textBlocks || []).map((b) => b.text).join('\n'),
        strokeCount: p.strokes?.length || 0,
      }));

      const buildLocalSynthesis = () => {
        const totalWords = payloadPages.reduce(
          (sum, p) =>
            sum + (p.textContent ? p.textContent.trim().split(/\s+/).filter(Boolean).length : 0),
          0,
        );
        const titles = payloadPages.map((p) => p.title).filter(Boolean);
        return {
          overview: `Across ${payloadPages.length} ${payloadPages.length === 1 ? 'page' : 'pages'} (${totalWords} words) in "${notebook.title || 'NOTE BOOK'}", your writing centers on quiet reflection${titles.length ? `, visiting moments such as ${titles.slice(0, 3).join(', ')}` : ''}.`,
          themes: ['Personal Reflection', 'Daily Gratitude', 'Mindful Pacing'],
          highlights: payloadPages.slice(0, 4).map((p) => ({
            pageNumber: p.pageNumber,
            note: p.title
              ? `${p.title}: ${(p.textContent || 'Visual sketch & memory page').replace(/\s+/g, ' ').slice(0, 110)}`
              : (p.textContent || 'Quiet page with visual memories.').replace(/\s+/g, ' ').slice(0, 120),
          })),
        };
      };

      try {
        const res = await fetch('/api/journal/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notebookTitle: notebook.title,
            scope: summaryScope,
            pages: payloadPages,
            includeHandwriting: includeHandwritingInSummary,
          }),
        });
        if (!res.ok) {
          throw new Error('Server unavailable');
        }
        const data = await res.json();
        setSummaryResult(data);
      } catch {
        // Standalone mobile app fallback synthesis
        setSummaryResult(buildLocalSynthesis());
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Unable to summarize right now.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isReadMode) return;
    e.preventDefault();
    const clampedX = Math.max(245, Math.min(window.innerWidth - 245, e.clientX));
    const clampedY = Math.max(245, Math.min(window.innerHeight - 245, e.clientY));
    soundEngine.playPenSelect(soundEnabled, soundVolume);
    setRadialOrigin({ x: clampedX, y: clampedY });
  };

  // Visual paper stack thickness on outer left/right edges scales with page count
  const visualEdgeLayers = Math.min(12, Math.max(2, Math.ceil(pages.length / 2)));

  // Distinctive Cover Material CSS Texture for the Physical Open Book Surround
  const coverSurroundStyle: React.CSSProperties = useMemo(() => {
    const baseColor = notebook.coverColor || '#EFE6D8';
    const isHardcover = notebook.bindingStyle === 'hardcover';
    const bgPattern =
      notebook.coverMaterial === 'linen'
        ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 4px)'
        : notebook.coverMaterial === 'leather'
          ? 'radial-gradient(circle at 50% 50%, rgba(255,245,230,0.08) 0%, rgba(15,8,4,0.28) 100%)'
          : notebook.coverMaterial === 'buckram'
            ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 5px)'
            : 'repeating-radial-gradient(circle at 20% 30%, rgba(80,55,30,0.05) 0px, transparent 3px)';

    return {
      backgroundColor: baseColor,
      backgroundImage: bgPattern,
      boxShadow: `var(--shadow-book), 0 ${visualEdgeLayers + 3}px 0 -2px #E5DDD0, 0 ${
        visualEdgeLayers * 2 + 5
      }px 22px rgba(28, 20, 14, 0.22)`,
      border:
        notebook.coverMaterial === 'leather'
          ? '3px dashed rgba(215, 180, 115, 0.55)'
          : isHardcover
            ? '4px solid rgba(54, 42, 34, 0.34)'
            : '1.5px solid rgba(54, 42, 34, 0.22)',
    };
  }, [notebook.coverColor, notebook.coverMaterial, notebook.bindingStyle, visualEdgeLayers]);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-canvas)',
        backgroundImage:
          'radial-gradient(circle at 50% 42%, rgba(255, 250, 240, 0.65) 0%, rgba(210, 194, 174, 0.3) 100%)',
      }}
    >
      {/* 1. Minimal Open-Notebook Header Bar */}
      <header className="w-full px-4 sm:px-6 py-2 flex items-center justify-between gap-3 z-30 border-b border-stone-900/10 bg-[#F4EFE6] shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Menu"
            className="md:hidden p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] text-stone-800 hover:bg-stone-200/60 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Back"
            title="Back"
            onClick={() => {
              soundEngine.playBookClose(soundEnabled, soundVolume);
              onCloseNotebook();
            }}
            className="w-8 h-8 rounded-lg bg-[#524035] text-[#FAF6F0] hover:bg-[#3f3128] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span
              className="font-semibold text-stone-900 truncate max-w-[180px] sm:max-w-[260px]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '19px' }}
            >
              {notebook.title}
            </span>
            <span
              className="text-xs text-stone-500 font-mono"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {activePage?.pageNumber || 1}/{pages.length}
            </span>
          </div>
        </div>

        {/* Center/Right Minimal Controls */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Read / Edit View Switcher */}
          <button
            type="button"
            data-testid="toggle-read-mode"
            onClick={() => {
              setIsReadMode((prev) => {
                const next = !prev;
                if (next) setRadialOrigin(null);
                return next;
              });
            }}
            title={isReadMode ? 'Switch to Edit View' : 'Switch to Read View'}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isReadMode
                ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                : 'bg-[#FAF6F0] text-stone-800 border-stone-300 hover:bg-white'
            }`}
          >
            {isReadMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Read</span>
              </>
            ) : (
              <>
                <PenTool className="w-3.5 h-3.5" />
                <span>Edit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setForceSinglePage((prev) => !prev)}
            aria-label={forceSinglePage ? 'Two-page spread' : 'Single page'}
            title={forceSinglePage ? 'Two-page spread' : 'Single page'}
            className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-stone-700 cursor-pointer"
          >
            {forceSinglePage ? (
              <Columns2 className="w-3.5 h-3.5" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
          </button>

          {notebook.notebookType === 'daily' && (
            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              aria-label="Calendar"
              title="Calendar"
              className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-amber-900 cursor-pointer"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowBookmarkIndex(true)}
            aria-label="Bookmarks"
            title="Bookmarks"
            className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-red-800 flex items-center gap-1 text-xs cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {bookmarkedPages.length > 0 && <span>{bookmarkedPages.length}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSummaryPageNums([activePage?.pageNumber || 1]);
              setShowSummaryModal(true);
            }}
            aria-label="Summary"
            title="Summary"
            className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-stone-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {!isReadMode && (
            <>
              <button
                type="button"
                aria-label="New Page"
                title="New Page"
                onClick={() => {
                  const created = onAddPage();
                  navigateToPageNumber(created.pageNumber, 'next', true);
                }}
                className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-stone-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {pages.length > 1 && activePage && (
                <button
                  type="button"
                  aria-label="Delete Page"
                  title="Delete Page"
                  onClick={() => {
                    const delId = activePage.id;
                    const nextP = Math.max(1, activePage.pageNumber - 1);
                    onDeletePage(delId);
                    setCurrentPageNum(nextP);
                    setActiveSidePageNum(nextP);
                  }}
                  className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-red-50 text-red-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onOpenNotebookSettings}
            aria-label="Settings"
            title="Settings"
            className="p-2 rounded-lg border border-stone-300 bg-[#FAF6F0] hover:bg-white text-stone-800 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          <span
            className="hidden lg:flex items-center text-stone-500 pl-1"
            title={syncStatus === 'saving' ? 'Saving' : 'Saved'}
          >
            {syncStatus === 'saving' ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            )}
          </span>
        </div>

        {/* Mobile Quick Controls in Top Bar */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsReadMode((prev) => !prev)}
            aria-label={isReadMode ? 'Edit' : 'Read'}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer ${
              isReadMode
                ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                : 'bg-[#FAF6F0] text-stone-800 border-stone-300'
            }`}
          >
            {isReadMode ? <Eye className="w-3.5 h-3.5" /> : <PenTool className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleTurnPrevious}
            disabled={leftPageNum <= 1}
            aria-label="Previous Page"
            className="p-1.5 rounded-lg border border-stone-300 bg-[#FAF6F0] text-stone-800 disabled:opacity-35 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleTurnNext}
            aria-label="Next Page"
            className="p-1.5 rounded-lg border border-stone-300 bg-[#FAF6F0] text-stone-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Right-Click Expanding Concentric Radial Menu */}
      <PenBoxTray
        radialOrigin={radialOrigin}
        isReadMode={isReadMode}
        toolMode={toolMode}
        penConfig={penConfig}
        pageDocState={activePageDocState}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onCloseRadial={() => setRadialOrigin(null)}
        onOpenRadialAt={(origin) => setRadialOrigin(origin)}
        onChangeToolMode={(mode) => {
          soundEngine.playPenSelect(soundEnabled, soundVolume);
          setToolMode(mode);
        }}
        onChangePenConfig={(patch) => {
          soundEngine.playPenSelect(soundEnabled, soundVolume);
          setPenConfig((prev) => ({ ...prev, ...patch }));
        }}
        onUpdatePageDocStyle={handleUpdateActivePageDocStyle}
        onAddShapeToPage={handleAddShapeToActivePage}
        onClearPageStrokes={handleClearActivePageStrokes}
        onClearPageShapes={handleClearActivePageShapes}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onUploadPhotoFile={handleUploadPhotoToActivePage}
        onInsertStudioPhoto={handleInsertStudioPhotoToActivePage}
      />

      {/* Collapsible Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            aria-label="Notebook Menu"
            className="w-64 max-w-[82vw] h-full bg-[#FAF6F0] border-r border-stone-300 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-300/80">
                <div
                  className="text-lg font-bold text-stone-900 truncate"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {notebook.title}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsReadMode((prev) => !prev);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                >
                  {isReadMode ? <PenTool className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isReadMode ? 'Edit View' : 'Read View'}</span>
                </button>

                {notebook.notebookType === 'daily' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      setShowCalendarModal(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                  >
                    <CalendarIcon className="w-4 h-4 text-amber-900" />
                    <span>Calendar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowBookmarkIndex(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                >
                  <Bookmark className="w-4 h-4 text-red-800" />
                  <span>Bookmarks ({bookmarkedPages.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForceSinglePage((prev) => !prev);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                >
                  <BookOpen className="w-4 h-4 text-stone-700" />
                  <span>{forceSinglePage ? 'Spread View' : 'Single Page'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setSelectedSummaryPageNums([activePage?.pageNumber || 1]);
                    setShowSummaryModal(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                >
                  <FileText className="w-4 h-4 text-stone-700" />
                  <span>Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    onOpenNotebookSettings();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium flex items-center gap-2.5"
                >
                  <Settings2 className="w-4 h-4 text-stone-700" />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onCloseNotebook();
              }}
              className="w-full py-2.5 rounded-xl bg-[#524035] text-[#FAF6F0] text-xs font-semibold flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </aside>
        </div>
      )}

      {/* 3. Wide Physical Notebook Stage (Right-Click Anywhere to Bloom Radial Menu) */}
      <main
        onContextMenu={handleContextMenu}
        className="relative flex-1 w-full overflow-auto flex items-start justify-center px-3 sm:px-6 py-5"
      >
        <div className="flex items-center my-auto">
          {/* Left Page-Turn Arrow Button (Desktop) */}
          <button
            type="button"
            onClick={handleTurnPrevious}
            disabled={leftPageNum <= 1}
            aria-label="Previous page"
            className="hidden md:flex z-20 mr-4 w-10 h-10 rounded-full bg-[#FAF6F0] border border-stone-300 shadow-xs items-center justify-center text-stone-800 hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Wide Physical Cover Board & Stacked Paper Edges Container */}
          <div
            data-testid="open-notebook-book-container"
            onTouchStart={isReadMode || toolMode === 'write' ? handleTouchStart : undefined}
            onTouchEnd={isReadMode || toolMode === 'write' ? handleTouchEnd : undefined}
            className={`relative flex rounded-xl transition-opacity duration-200 shrink-0 ${
              notebook.bindingStyle === 'hardcover' ? 'p-3.5 sm:p-4' : 'p-2 sm:p-2.5'
            } ${
              isSinglePageMode
                ? 'w-[min(95vw,860px)] h-[792px] min-h-[792px]'
                : 'w-[min(96vw,1280px)] min-w-[1160px] h-[792px] min-h-[792px]'
            } ${turnDirection ? 'opacity-95' : 'opacity-100'}`}
            style={{
              ...coverSurroundStyle,
              perspective: '2200px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            {/* Softcover Elastic Closure Strap tucked around right cover board */}
            {notebook.bindingStyle === 'softcover' && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 right-3 w-3.5 z-30"
                style={{
                  backgroundColor: 'rgba(46, 34, 26, 0.78)',
                  boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
                }}
              />
            )}

            {/* Left Stacked Paper Edge Thickness Effect */}
            <div
              className="h-full rounded-l bg-gradient-to-r from-stone-300 via-[#F5EFE4] to-[#FAF6F0] border-r border-stone-300/60 shrink-0"
              style={{ width: `${Math.min(12, 4 + Math.floor(pages.length / 2))}px` }}
            />

            {/* Single-Page Left Spine Binding Signature */}
            {isSinglePageMode && (
              <div
                className="relative w-6 h-full flex flex-col items-center justify-evenly py-4 z-25 select-none shrink-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(45,32,22,0.25) 0%, rgba(65,48,35,0.10) 100%)',
                }}
              >
                {notebook.bindingStyle === 'spiral' &&
                  Array.from({ length: 13 }).map((_, idx) => (
                    <div key={idx} className="flex items-center">
                      <div
                        className="w-6 h-2.5 -ml-2 rounded-full shadow-xs"
                        style={{
                          background:
                            'linear-gradient(180deg, #E2CC9F 0%, #9E7E4B 55%, #5C4628 100%)',
                          border: '1px solid rgba(40, 30, 20, 0.45)',
                        }}
                      />
                      <span className="w-2 h-2 rounded-full bg-stone-900 -ml-1" />
                    </div>
                  ))}
                {notebook.bindingStyle === 'stitched' &&
                  Array.from({ length: 7 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-6 flex flex-col items-center justify-center gap-1"
                    >
                      <div className="w-full h-0.5 bg-[#FAF6F0] rotate-25 rounded-full shadow-xs" />
                      <div className="w-full h-0.5 bg-[#FAF6F0] -rotate-25 rounded-full shadow-xs" />
                    </div>
                  ))}
                {notebook.bindingStyle === 'hardcover' &&
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-full h-2 rounded-xs"
                      style={{
                        backgroundColor: 'rgba(40, 28, 18, 0.35)',
                        borderTop: '1px solid rgba(255, 240, 210, 0.25)',
                      }}
                    />
                  ))}
              </div>
            )}

            {/* LEFT PAGE (or Single Wide Active Page) */}
            {leftPage && (
              <div className="flex-1 h-full relative overflow-visible">
                <PageCanvasSurface
                  page={leftPage}
                  notebookPaperStyle={notebook.defaultPaperStyle}
                  notebookPageColor={notebook.defaultPageColor}
                  notebookDefaultFont={notebook.defaultFontFamily || 'Caveat'}
                  isActivePage={activePage?.id === leftPage.id}
                  isReadMode={isReadMode}
                  toolMode={toolMode}
                  penConfig={penConfig}
                  soundEnabled={soundEnabled}
                  soundVolume={soundVolume}
                  isDailyJournal={notebook.notebookType === 'daily'}
                  onActivatePage={() => setActiveSidePageNum(leftPage.pageNumber)}
                  onUpdatePage={handlePageEditWithUndo}
                />

                {/* 3D Realistic Page Curl Turning Leaf Overlay */}
                {flippingLeaf && (
                  <>
                    {/* Underlying Dynamic Cast Shadow sweeping across destination page */}
                    <div
                      className="pointer-events-none absolute inset-0 z-30 animate-shadow-cast"
                      style={{
                        background:
                          flippingLeaf.direction === 'next'
                            ? 'linear-gradient(90deg, rgba(20,14,10,0.38) 0%, rgba(20,14,10,0.16) 35%, transparent 70%)'
                            : 'linear-gradient(270deg, rgba(20,14,10,0.38) 0%, rgba(20,14,10,0.16) 35%, transparent 70%)',
                      }}
                    />

                    {/* 3D Curled Turning Page Leaf */}
                    <div
                      className={`pointer-events-none absolute inset-0 z-40 ${
                        flippingLeaf.direction === 'next'
                          ? 'animate-page-flip-next'
                          : 'animate-page-flip-prev'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'left center',
                      }}
                    >
                      {/* FRONT FACE of Curled Leaf (curling away to spine or revealing destination) */}
                      <div
                        className="absolute inset-0 w-full h-full overflow-hidden rounded-r-lg shadow-2xl"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg)',
                          backgroundColor: notebook.defaultPageColor || '#FAF6F0',
                        }}
                      >
                        <PageCanvasSurface
                          page={flippingLeaf.page}
                          notebookPaperStyle={notebook.defaultPaperStyle}
                          notebookPageColor={notebook.defaultPageColor}
                          notebookDefaultFont={notebook.defaultFontFamily || 'Caveat'}
                          isActivePage={false}
                          isReadMode={true}
                          toolMode="write"
                          penConfig={penConfig}
                          soundEnabled={false}
                          soundVolume={0}
                          isDailyJournal={notebook.notebookType === 'daily'}
                          onActivatePage={() => {}}
                          onUpdatePage={() => {}}
                        />

                        {/* Front Curl Cylindrical Specular & Shading Gradient Overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(255,255,255,0.35) 20%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.22) 92%, rgba(0,0,0,0.32) 100%)',
                          }}
                        />
                      </div>

                      {/* BACK FACE of Curled Leaf (revealed when curled past 90 degrees) */}
                      <div
                        className={`absolute inset-0 w-full h-full overflow-hidden rounded-l-lg shadow-2xl ${
                          notebook.defaultPaperStyle === 'ruled'
                            ? 'paper-ruled'
                            : notebook.defaultPaperStyle === 'dotted'
                              ? 'paper-dotted'
                              : 'paper-blank'
                        }`}
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          backgroundColor: notebook.defaultPageColor || '#FAF6F0',
                        }}
                      >
                        {/* Physical Backside Paper Shading, Spine Depth & Curl Edge Highlight */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(270deg, rgba(30,22,16,0.30) 0%, rgba(30,22,16,0.12) 15%, rgba(255,255,255,0.25) 45%, rgba(30,22,16,0.05) 85%, rgba(30,22,16,0.18) 100%)',
                          }}
                        />
                        {/* Subtle Backside Binding Margin Stamp */}
                        <div className="absolute top-6 right-8 text-[11px] uppercase tracking-widest text-stone-400 font-mono select-none opacity-40">
                          {notebook.title || 'NOTE BOOK'}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CENTER PHYSICAL NOTEBOOK BINDING GUTTER (in 2-Page Spread Mode) */}
            {!isSinglePageMode && (
              <div
                className="relative w-9 h-full flex flex-col items-center justify-evenly py-4 z-25 select-none shrink-0"
                style={{
                  background:
                    notebook.bindingStyle === 'hardcover'
                      ? 'linear-gradient(90deg, rgba(50,36,25,0.22) 0%, rgba(25,18,12,0.42) 50%, rgba(50,36,25,0.22) 100%)'
                      : 'linear-gradient(90deg, rgba(60,46,35,0.16) 0%, rgba(35,25,18,0.28) 50%, rgba(60,46,35,0.16) 100%)',
                }}
              >
                {notebook.bindingStyle === 'hardcover' && (
                  <>
                    <div className="w-5 h-2 rounded-t-xs bg-amber-700/80 border-b border-amber-200/50 absolute top-0" />
                    <div className="w-5 h-2 rounded-b-xs bg-amber-700/80 border-t border-amber-200/50 absolute bottom-0" />
                  </>
                )}

                {notebook.bindingStyle === 'spiral' &&
                  Array.from({ length: 13 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-center w-12">
                      <span className="w-2 h-2 rounded-full bg-stone-900/85 shrink-0" />
                      <div
                        className="w-9 h-2.5 -mx-1 rounded-full shadow-xs z-10"
                        style={{
                          background:
                            'linear-gradient(180deg, #E2CC9F 0%, #9E7E4B 52%, #594428 100%)',
                          border: '1px solid rgba(40, 30, 20, 0.45)',
                        }}
                      />
                      <span className="w-2 h-2 rounded-full bg-stone-900/85 shrink-0" />
                    </div>
                  ))}

                {notebook.bindingStyle === 'stitched' &&
                  Array.from({ length: 7 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-7 h-6 flex flex-col items-center justify-center gap-1"
                    >
                      <div className="w-full h-1 bg-[#4A382B]/60 rounded-xs" />
                      <div className="w-full h-0.5 bg-[#FAF6F0] shadow-xs rounded-full" />
                      <div className="w-5 h-0.5 bg-[#FAF6F0] rotate-12 rounded-full" />
                    </div>
                  ))}

                {notebook.bindingStyle === 'hardcover' &&
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-full h-2.5 rounded-xs"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,245,220,0.18) 0%, rgba(25,16,10,0.45) 100%)',
                      }}
                    />
                  ))}
              </div>
            )}

            {/* RIGHT PAGE (in 2-Page Spread Mode) */}
            {!isSinglePageMode && (
              <div className="flex-1 h-full relative overflow-visible">
                {rightPage ? (
                  <PageCanvasSurface
                    page={rightPage}
                    notebookPaperStyle={notebook.defaultPaperStyle}
                    notebookPageColor={notebook.defaultPageColor}
                    notebookDefaultFont={notebook.defaultFontFamily || 'Caveat'}
                    isActivePage={activePage?.id === rightPage.id}
                    isReadMode={isReadMode}
                    toolMode={toolMode}
                    penConfig={penConfig}
                    soundEnabled={soundEnabled}
                    soundVolume={soundVolume}
                    isDailyJournal={notebook.notebookType === 'daily'}
                    onActivatePage={() => setActiveSidePageNum(rightPage.pageNumber)}
                    onUpdatePage={handlePageEditWithUndo}
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                    style={{ backgroundColor: notebook.defaultPageColor || '#FAF6F0' }}
                  >
                    {!isReadMode && (
                      <button
                        type="button"
                        onClick={() => {
                          const created = onAddPage();
                          setActiveSidePageNum(created.pageNumber);
                        }}
                        className="px-4 py-2 rounded-lg bg-stone-800 text-amber-50 hover:bg-stone-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Page {pages.length + 1}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right Stacked Paper Edge Thickness Effect */}
            <div
              className="h-full rounded-r bg-gradient-to-l from-stone-300 via-[#F5EFE4] to-[#FAF6F0] border-l border-stone-300/60 shrink-0"
              style={{ width: `${Math.min(12, 4 + Math.floor(pages.length / 2))}px` }}
            />
          </div>

          {/* Right Page-Turn / Add-Page Arrow Button (Desktop) */}
          <button
            type="button"
            onClick={handleTurnNext}
            aria-label="Next page"
            className="hidden md:flex z-20 ml-4 w-10 h-10 rounded-full bg-[#FAF6F0] border border-stone-300 shadow-xs items-center justify-center text-stone-800 hover:bg-white cursor-pointer shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* MODAL A: Physical Bookmark Ribbon Index */}
      {showBookmarkIndex && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setShowBookmarkIndex(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Notebook Bookmark Index"
            className="w-full max-w-md rounded-xl p-6 border"
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: 'rgba(82, 64, 53, 0.25)',
              boxShadow: 'var(--shadow-lifted)',
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-300/80">
              <div>
                <h2
                  className="text-xl font-semibold text-stone-900"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Bookmark Ribbons
                </h2>
                <p className="text-xs text-stone-600">
                  Jump directly to any bookmarked page in {notebook.title}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Bookmark Index"
                onClick={() => setShowBookmarkIndex(false)}
                className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookmarkedPages.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-600">
                <p className="mb-3">No bookmark ribbons placed in this notebook yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (activePage) {
                      handlePageEditWithUndo(
                        {
                          ...activePage,
                          bookmarkTitle: activePage.title || `Page ${activePage.pageNumber}`,
                          bookmarkColor: '#B85D57',
                          bookmarkStyle: 'satin',
                        },
                        true,
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-stone-800 text-amber-50 text-xs font-medium cursor-pointer"
                >
                  Bookmark Current Page (Page {activePage?.pageNumber || 1})
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {bookmarkedPages.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-300/80 bg-white/60 hover:bg-white transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookmarkIndex(false);
                        navigateToPageNumber(bp.pageNumber);
                      }}
                      className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                    >
                      <span
                        className="w-3.5 h-8 rounded-b-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: bp.bookmarkColor || '#B85D57' }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-stone-900">
                          {bp.bookmarkTitle || bp.title || `Page ${bp.pageNumber}`}
                        </div>
                        <div className="text-xs text-stone-500">
                          Page {bp.pageNumber} · {bp.bookmarkStyle} ribbon
                          {bp.entryDate ? ` · ${bp.entryDate}` : ''}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-label={`Remove bookmark on Page ${bp.pageNumber}`}
                      onClick={() =>
                        handlePageEditWithUndo(
                          {
                            ...bp,
                            bookmarkTitle: '',
                            bookmarkColor: '',
                            bookmarkStyle: 'none',
                          },
                          true,
                        )
                      }
                      className="p-1.5 text-stone-400 hover:text-red-700 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL B: Daily Journal Personal Calendar Index */}
      {showCalendarModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Daily Journal Calendar Index"
            className="w-full max-w-lg rounded-xl p-6 border"
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: 'rgba(82, 64, 53, 0.25)',
              boxShadow: 'var(--shadow-lifted)',
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-300/80">
              <div>
                <h2
                  className="text-2xl font-semibold text-stone-900"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Personal Journal Calendar
                </h2>
                <p className="text-xs text-stone-600">
                  Select any date to revisit an entry or begin writing for that day
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Calendar Index"
                onClick={() => setShowCalendarModal(false)}
                className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  className="p-1.5 rounded border border-stone-300 hover:bg-stone-200/60 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-stone-900 min-w-[130px] text-center">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  className="p-1.5 rounded border border-stone-300 hover:bg-stone-200/60 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-stone-700">
                <span>Year:</span>
                <select
                  aria-label="Select Journal Year"
                  value={calendarYear}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value, 10);
                    setCalendarYear(yr);
                    onUpdateNotebookMeta({ journalYear: yr });
                  }}
                  className="px-2 py-1 rounded border border-stone-300 bg-white font-medium cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-500 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => handleSelectDateInCalendar(cell.dateStr)}
                  title={
                    cell.hasEntry
                      ? `${cell.dateStr}: ${cell.entryTitle || `Page ${cell.pageNumber}`}`
                      : `Write entry for ${cell.dateStr}`
                  }
                  className={`h-11 rounded-lg border flex flex-col items-center justify-center relative transition-colors cursor-pointer ${
                    !cell.isCurrentMonth
                      ? 'opacity-35 border-transparent text-stone-400'
                      : cell.hasEntry
                        ? 'bg-[#524035] text-[#FAF6F0] border-[#524035] font-semibold shadow-xs'
                        : 'bg-white/70 hover:bg-stone-200/70 border-stone-200 text-stone-800'
                  }`}
                >
                  <span className="text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {cell.dayOfMonth}
                  </span>
                  {cell.hasEntry && (
                    <span className="text-[9px] opacity-85">p.{cell.pageNumber}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL C: Literary Notebook Summary Card */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Notebook Summary and Reading Statistics"
            className="w-full max-w-lg rounded-xl p-6 border"
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: 'rgba(82, 64, 53, 0.25)',
              boxShadow: 'var(--shadow-lifted)',
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-300/80">
              <div>
                <h2
                  className="text-2xl font-semibold text-stone-900"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Journal Reflection &amp; Summary
                </h2>
                <p className="text-xs text-stone-600">
                  Revisit themes and highlights across your personal writing
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Summary Modal"
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              {(
                [
                  { id: 'page', label: `Current Page (p.${activePage?.pageNumber || 1})` },
                  { id: 'selected', label: 'Selected Pages' },
                  { id: 'notebook', label: `Entire Notebook (${pages.length} pages)` },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSummaryScope(sc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    summaryScope === sc.id
                      ? 'bg-stone-800 text-amber-50 border-stone-800'
                      : 'bg-white/70 text-stone-700 border-stone-300 hover:bg-stone-200/50'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {summaryScope === 'selected' && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 rounded-lg bg-stone-200/50 border border-stone-300/70">
                {pages.map((p) => {
                  const checked = selectedSummaryPageNums.includes(p.pageNumber);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedSummaryPageNums((prev) =>
                          checked
                            ? prev.filter((n) => n !== p.pageNumber)
                            : [...prev, p.pageNumber],
                        )
                      }
                      className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                        checked
                          ? 'bg-stone-800 text-amber-50'
                          : 'bg-white text-stone-700 border border-stone-300'
                      }`}
                    >
                      Page {p.pageNumber}
                    </button>
                  );
                })}
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-stone-700 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHandwritingInSummary}
                onChange={(e) => setIncludeHandwritingInSummary(e.target.checked)}
                className="rounded accent-stone-800"
              />
              <span>Include freehand handwriting / sketches in summary recognition</span>
            </label>

            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="w-full py-2.5 rounded-lg bg-[#524035] hover:bg-[#3f3128] text-[#FAF6F0] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingSummary ? 'Synthesizing journal reflection...' : 'Generate Summary'}
              </span>
            </button>

            {summaryError && (
              <p className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {summaryError}
              </p>
            )}

            {summaryResult && (
              <div className="mt-4 p-4 rounded-xl bg-white/80 border border-stone-300 space-y-3 text-xs">
                <p className="text-sm text-stone-800 leading-relaxed italic">
                  &ldquo;{summaryResult.overview}&rdquo;
                </p>

                {summaryResult.themes && summaryResult.themes.length > 0 && (
                  <div>
                    <span className="font-semibold text-stone-700 block mb-1">
                      Recurring Themes:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {summaryResult.themes.map((th, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-md bg-stone-200/80 text-stone-800 font-medium"
                        >
                          {th}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {summaryResult.highlights && summaryResult.highlights.length > 0 && (
                  <div>
                    <span className="font-semibold text-stone-700 block mb-1">Page Notes:</span>
                    <ul className="space-y-1 text-stone-600">
                      {summaryResult.highlights.map((h, i) => (
                        <li key={i}>
                          <strong className="text-stone-800">Page {h.pageNumber}:</strong> {h.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
