import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Calendar as CalendarIcon,
  Copy,
  Maximize2,
  RotateCw,
  Trash2,
} from 'lucide-react';
import type {
  ActiveToolMode,
  BookmarkStyle,
  NotebookPage,
  PaperStyle,
  PenConfig,
  PenStroke,
  PlacedPhoto,
  PlacedShape,
  ShapeKind,
  StrokePoint,
} from '../types/journal';
import {
  buildPageWithDocumentState,
  calculatePageWordCount,
  clampPhotoTransform,
  clampShapeTransform,
  formatHandwrittenDate,
  getPageDocumentState,
} from '../utils/journalLogic';
import { compressUploadedImageToDataUrl } from '../utils/samplePhotos';
import { soundEngine } from '../utils/soundEffects';

interface PageCanvasSurfaceProps {
  page: NotebookPage;
  notebookPaperStyle: PaperStyle;
  notebookPageColor: string;
  notebookDefaultFont: string;
  isActivePage: boolean;
  isReadMode?: boolean;
  toolMode: ActiveToolMode;
  penConfig: PenConfig;
  soundEnabled: boolean;
  soundVolume: number;
  isDailyJournal: boolean;
  onActivatePage: () => void;
  onUpdatePage: (updated: NotebookPage, pushUndo?: boolean) => void;
}

const BOOKMARK_COLORS = [
  { name: 'Carmine Ribbon', hex: '#B85D57' },
  { name: 'Sage Ribbon', hex: '#6C8469' },
  { name: 'Indigo Ribbon', hex: '#4B5E82' },
  { name: 'Ochre Ribbon', hex: '#C48F45' },
  { name: 'Plum Ribbon', hex: '#765278' },
];

const SHAPE_COLORS = ['#2C2623', '#3B4D7A', '#5B3E85', '#9C3D35', '#48704C', '#C9822B'];

function renderShapeSvgContent(shape: PlacedShape) {
  const strokeDash = shape.dashed ? '6 5' : undefined;
  const fill =
    shape.fillColor && shape.fillColor !== 'transparent' ? shape.fillColor : 'none';
  const sw = shape.strokeWidth || 2.5;

  switch (shape.kind) {
    case 'rectangle':
      return (
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="4"
          fill={fill}
          stroke={shape.color}
          strokeWidth={sw}
          strokeDasharray={strokeDash}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'circle':
      return (
        <ellipse
          cx="50"
          cy="50"
          rx="46"
          ry="46"
          fill={fill}
          stroke={shape.color}
          strokeWidth={sw}
          strokeDasharray={strokeDash}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'diamond':
      return (
        <polygon
          points="50,4 96,50 50,96 4,50"
          fill={fill}
          stroke={shape.color}
          strokeWidth={sw}
          strokeDasharray={strokeDash}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'star':
      return (
        <polygon
          points="50,5 63,36 96,38 70,59 79,92 50,73 21,92 30,59 4,38 37,36"
          fill={fill}
          stroke={shape.color}
          strokeWidth={sw}
          strokeDasharray={strokeDash}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'arrow':
      return (
        <g
          fill="none"
          stroke={shape.color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line
            x1="6"
            y1="50"
            x2="92"
            y2="50"
            strokeDasharray={strokeDash}
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points="72,26 94,50 72,74"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    case 'line':
    default:
      return (
        <line
          x1="4"
          y1="50"
          x2="96"
          y2="50"
          stroke={shape.color}
          strokeWidth={sw}
          strokeDasharray={strokeDash}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      );
  }
}

export const PageCanvasSurface: React.FC<PageCanvasSurfaceProps> = ({
  page,
  notebookPaperStyle,
  notebookPageColor,
  notebookDefaultFont,
  isActivePage,
  isReadMode = false,
  toolMode,
  penConfig,
  soundEnabled,
  soundVolume,
  onActivatePage,
  onUpdatePage,
}) => {
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyAreaRef = useRef<HTMLDivElement | null>(null);
  const docTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [draftShape, setDraftShape] = useState<PlacedShape | null>(null);
  const [showBookmarkPopover, setShowBookmarkPopover] = useState(false);
  const [isEditingCustomDate, setIsEditingCustomDate] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const docState = getPageDocumentState(
    page,
    notebookDefaultFont || 'Caveat',
    penConfig.color || '#2C2623',
  );

  const drawingStrokeRef = useRef<PenStroke | null>(null);
  const isErasingRef = useRef(false);

  const shapeDraftStartRef = useRef<{
    startX: number;
    startY: number;
    kind: ShapeKind;
  } | null>(null);

  const photoInteractionRef = useRef<{
    type: 'move' | 'resize' | 'rotate';
    photoId: string;
    startClientX: number;
    startClientY: number;
    initialPhoto: PlacedPhoto;
    centerClientX: number;
    centerClientY: number;
    startAngleDeg: number;
  } | null>(null);

  const shapeInteractionRef = useRef<{
    type: 'move' | 'resize' | 'rotate';
    shapeId: string;
    startClientX: number;
    startClientY: number;
    initialShape: PlacedShape;
    centerClientX: number;
    centerClientY: number;
    startAngleDeg: number;
  } | null>(null);

  const renderStrokesToCanvas = useCallback(
    (extraStroke?: PenStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const allStrokes = extraStroke
        ? [...(page.strokes || []), extraStroke]
        : page.strokes || [];

      for (const stroke of allStrokes) {
        if (!stroke.points || stroke.points.length === 0) continue;

        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineCap = stroke.instrument === 'marker' ? 'square' : 'round';
        ctx.lineJoin = 'round';

        const baseOpacity =
          stroke.instrument === 'marker'
            ? Math.min(0.42, stroke.opacity * 0.45)
            : stroke.instrument === 'pencil'
              ? Math.min(0.78, stroke.opacity * 0.8)
              : stroke.opacity;
        ctx.globalAlpha = baseOpacity;

        if (stroke.points.length === 1) {
          const pt = stroke.points[0];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1.5, stroke.size * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }

        if (stroke.instrument === 'fountain') {
          for (let i = 1; i < stroke.points.length; i++) {
            const p0 = stroke.points[i - 1];
            const p1 = stroke.points[i];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const angle = Math.atan2(dy, dx);
            const nibFactor = 0.55 + Math.abs(Math.sin(angle - Math.PI / 4)) * 0.75;
            const pressureFactor = 0.6 + (p1.pressure || 0.5) * 0.7;
            ctx.lineWidth = Math.max(1.2, stroke.size * nibFactor * pressureFactor);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        } else {
          const widthMultiplier =
            stroke.instrument === 'marker'
              ? 2.6
              : stroke.instrument === 'finetip'
                ? 0.65
                : stroke.instrument === 'gel'
                  ? 1.15
                  : 1.0;
          ctx.lineWidth = Math.max(1, stroke.size * widthMultiplier);

          if (stroke.instrument === 'pencil') {
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 0.8;
          }

          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length - 1; i++) {
            const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
          }
          const last = stroke.points[stroke.points.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        }

        ctx.restore();
      }
    },
    [page.strokes],
  );

  useEffect(() => {
    renderStrokesToCanvas(null);
  }, [renderStrokesToCanvas]);

  const getNormalizedCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 1000;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 1300;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      pressure: Number(pressure.toFixed(2)),
    };
  };

  const eraseStrokesNearPoint = (pt: StrokePoint) => {
    const eraseRadius = Math.max(18, penConfig.size * 3.5);
    const remaining = (page.strokes || []).filter((stroke) => {
      return !stroke.points.some((sp) => Math.hypot(sp.x - pt.x, sp.y - pt.y) <= eraseRadius);
    });
    if (remaining.length !== (page.strokes || []).length) {
      soundEngine.playEraser(soundEnabled, soundVolume);
      onUpdatePage({ ...page, strokes: remaining }, true);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadMode || e.button === 2) return;
    onActivatePage();
    setSelectedPhotoId(null);
    setSelectedShapeId(null);

    if (toolMode === 'shape') {
      const rect = e.currentTarget.getBoundingClientRect();
      const startX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const startY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      const kind: ShapeKind = penConfig.activeShapeKind || 'rectangle';
      shapeDraftStartRef.current = { startX, startY, kind };
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

      const initialDraft: PlacedShape = {
        id: `sh-${Date.now()}`,
        kind,
        x: startX,
        y: startY,
        width: 18,
        height: kind === 'line' || kind === 'arrow' ? 6 : 14,
        color: docState.color || penConfig.color || '#2C2623',
        fillColor: penConfig.shapeFilled
          ? `${docState.color || penConfig.color || '#2C2623'}1A`
          : 'transparent',
        strokeWidth: Math.max(2, Math.min(5, penConfig.size || 2.5)),
        dashed: Boolean(penConfig.shapeDashed),
        rotation: 0,
        layerOrder: (page.shapes?.length || 0) + 2,
        createdAt: Date.now(),
      };
      setDraftShape(initialDraft);
      return;
    }

    const isStylusPen = e.pointerType === 'pen';
    if (toolMode !== 'draw' && toolMode !== 'eraser' && !isStylusPen) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

    const pt = getNormalizedCanvasPoint(e);

    if (toolMode === 'eraser') {
      isErasingRef.current = true;
      eraseStrokesNearPoint(pt);
      return;
    }

    const newStroke: PenStroke = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instrument: penConfig.instrument,
      color: docState.color || penConfig.color,
      size: penConfig.size,
      opacity: penConfig.opacity,
      points: [pt],
      layerOrder: (page.strokes?.length || 0) + 1,
      createdAt: Date.now(),
    };
    drawingStrokeRef.current = newStroke;
    renderStrokesToCanvas(newStroke);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (shapeDraftStartRef.current && draftShape) {
      const rect = e.currentTarget.getBoundingClientRect();
      const curX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const curY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      const { startX, startY, kind } = shapeDraftStartRef.current;
      const minX = Math.min(startX, curX);
      const minY = Math.min(startY, curY);
      const w = Math.max(8, Math.abs(curX - startX));
      const h =
        kind === 'line' || kind === 'arrow'
          ? Math.max(5, Math.abs(curY - startY))
          : Math.max(8, Math.abs(curY - startY));
      setDraftShape((prev) =>
        prev
          ? {
              ...prev,
              x: minX,
              y: minY,
              width: w,
              height: h,
            }
          : null,
      );
      return;
    }

    if (isErasingRef.current) {
      const pt = getNormalizedCanvasPoint(e);
      eraseStrokesNearPoint(pt);
      return;
    }
    if (!drawingStrokeRef.current) return;
    const pt = getNormalizedCanvasPoint(e);
    const pts = drawingStrokeRef.current.points;
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) >= 2.2) {
      pts.push(pt);
      renderStrokesToCanvas(drawingStrokeRef.current);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (shapeDraftStartRef.current && draftShape) {
      shapeDraftStartRef.current = null;
      const finalized = clampShapeTransform(draftShape);
      setDraftShape(null);
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      soundEngine.playPenSelect(soundEnabled, soundVolume);
      const updatedShapes = [...(page.shapes || []), finalized];
      onUpdatePage({ ...page, shapes: updatedShapes }, true);
      setSelectedShapeId(finalized.id);
      return;
    }

    if (isErasingRef.current) {
      isErasingRef.current = false;
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }
    if (!drawingStrokeRef.current) return;
    const finished = drawingStrokeRef.current;
    drawingStrokeRef.current = null;
    try {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const updatedStrokes = [...(page.strokes || []), finished];
    onUpdatePage({ ...page, strokes: updatedStrokes }, true);
  };

  useEffect(() => {
    function onWinPointerMove(e: PointerEvent) {
      const container = bodyAreaRef.current || pageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      if (photoInteractionRef.current) {
        const inter = photoInteractionRef.current;
        const dxPct = ((e.clientX - inter.startClientX) / Math.max(1, rect.width)) * 100;
        const dyPct = ((e.clientY - inter.startClientY) / Math.max(1, rect.height)) * 100;

        const nextPhoto: PlacedPhoto = { ...inter.initialPhoto };
        if (inter.type === 'move') {
          nextPhoto.x = inter.initialPhoto.x + dxPct;
          nextPhoto.y = inter.initialPhoto.y + dyPct;
        } else if (inter.type === 'resize') {
          nextPhoto.width = inter.initialPhoto.width + dxPct * 1.15;
        } else if (inter.type === 'rotate') {
          const currentAngleDeg =
            (Math.atan2(e.clientY - inter.centerClientY, e.clientX - inter.centerClientX) * 180) /
            Math.PI;
          const deltaDeg = currentAngleDeg - inter.startAngleDeg;
          nextPhoto.rotation = inter.initialPhoto.rotation + deltaDeg;
        }

        const clamped = clampPhotoTransform(nextPhoto);
        const updatedPhotos = (page.photos || []).map((p) => (p.id === clamped.id ? clamped : p));
        onUpdatePage({ ...page, photos: updatedPhotos }, false);
      }

      if (shapeInteractionRef.current) {
        const inter = shapeInteractionRef.current;
        const dxPct = ((e.clientX - inter.startClientX) / Math.max(1, rect.width)) * 100;
        const dyPct = ((e.clientY - inter.startClientY) / Math.max(1, rect.height)) * 100;

        const nextShape: PlacedShape = { ...inter.initialShape };
        if (inter.type === 'move') {
          nextShape.x = inter.initialShape.x + dxPct;
          nextShape.y = inter.initialShape.y + dyPct;
        } else if (inter.type === 'resize') {
          nextShape.width = inter.initialShape.width + dxPct;
          nextShape.height = inter.initialShape.height + dyPct;
        } else if (inter.type === 'rotate') {
          const currentAngleDeg =
            (Math.atan2(e.clientY - inter.centerClientY, e.clientX - inter.centerClientX) * 180) /
            Math.PI;
          const deltaDeg = currentAngleDeg - inter.startAngleDeg;
          nextShape.rotation = inter.initialShape.rotation + deltaDeg;
        }

        const clamped = clampShapeTransform(nextShape);
        const updatedShapes = (page.shapes || []).map((s) => (s.id === clamped.id ? clamped : s));
        onUpdatePage({ ...page, shapes: updatedShapes }, false);
      }
    }

    function onWinPointerUp() {
      photoInteractionRef.current = null;
      shapeInteractionRef.current = null;
    }

    window.addEventListener('pointermove', onWinPointerMove);
    window.addEventListener('pointerup', onWinPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWinPointerMove);
      window.removeEventListener('pointerup', onWinPointerUp);
    };
  }, [page, onUpdatePage]);

  const handleTitleChange = (newTitle: string) => {
    if (isReadMode) return;
    const nextPage: NotebookPage = {
      ...page,
      title: newTitle,
    };
    nextPage.wordCount = calculatePageWordCount(nextPage);
    onUpdatePage(nextPage, false);
  };

  const handleEntryDateChange = (newDate: string) => {
    if (isReadMode) return;
    onUpdatePage({ ...page, entryDate: newDate }, true);
  };

  const handleDocumentTextChange = (newText: string) => {
    if (isReadMode) return;
    const nextPage = buildPageWithDocumentState(
      page,
      { text: newText },
      notebookDefaultFont || 'Caveat',
      penConfig.color || '#2C2623',
    );
    onUpdatePage(nextPage, false);
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isReadMode) return;
    onActivatePage();

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const rect = pageContainerRef.current?.getBoundingClientRect();
    const dropXPct = rect ? ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100 - 18 : 22;
    const dropYPct = rect ? ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100 - 14 : 36;

    const newPhotos: PlacedPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { dataUrl, aspectRatio } = await compressUploadedImageToDataUrl(files[i]);
        newPhotos.push(
          clampPhotoTransform({
            id: `ph-${Date.now()}-${i}`,
            dataUrl,
            caption: files[i].name.replace(/\.[^.]+$/, ''),
            x: dropXPct + i * 6,
            y: dropYPct + i * 6,
            width: 34,
            aspectRatio,
            rotation: i % 2 === 0 ? -2.5 : 2.5,
            hasBorder: true,
            hasTape: true,
            tapeColor: '#E8D8BE',
            layerOrder: (page.photos?.length || 0) + i + 2,
            createdAt: Date.now(),
          }),
        );
      } catch {
        // ignore invalid image
      }
    }

    if (newPhotos.length > 0) {
      soundEngine.playPhotoPlace(soundEnabled, soundVolume);
      onUpdatePage({ ...page, photos: [...(page.photos || []), ...newPhotos] }, true);
      setSelectedPhotoId(newPhotos[newPhotos.length - 1].id);
    }
  };

  const handleToggleBookmarkRibbon = (
    colorHex?: string,
    style?: BookmarkStyle,
    title?: string,
  ) => {
    const isCurrentlyBookmarked = Boolean(page.bookmarkColor && page.bookmarkStyle !== 'none');
    if (isCurrentlyBookmarked && !colorHex && !style && title === undefined) {
      onUpdatePage(
        {
          ...page,
          bookmarkTitle: '',
          bookmarkColor: '',
          bookmarkStyle: 'none',
        },
        true,
      );
      setShowBookmarkPopover(false);
      return;
    }

    onUpdatePage(
      {
        ...page,
        bookmarkTitle:
          title !== undefined
            ? title
            : page.bookmarkTitle || page.title || `Page ${page.pageNumber}`,
        bookmarkColor: colorHex || page.bookmarkColor || '#B85D57',
        bookmarkStyle: style || (page.bookmarkStyle === 'none' ? 'satin' : page.bookmarkStyle),
      },
      true,
    );
  };

  const effectivePaperStyle = notebookPaperStyle || page.paperStyle || 'ruled';
  const effectivePageColor = notebookPageColor || page.pageColor || '#FAF6F0';

  const paperClass =
    effectivePaperStyle === 'ruled'
      ? 'paper-ruled'
      : effectivePaperStyle === 'dotted'
        ? 'paper-dotted'
        : 'paper-blank';

  const hasBookmark = Boolean(page.bookmarkColor && page.bookmarkStyle !== 'none');
  const fontName = docState.fontFamily || notebookDefaultFont || 'Caveat';
  const isBanglaFont = [
    'Atma',
    'Galada',
    'Hind Siliguri',
    'Anek Bangla',
    'Noto Serif Bengali',
  ].includes(fontName);
  const activeHandFont = isBanglaFont
    ? `"${fontName}", 'Atma', 'Galada', 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', 'Noto Serif Bengali', 'Vrinda', cursive, sans-serif`
    : `"${fontName}", 'Atma', 'Galada', 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', cursive, sans-serif`;
  const activeInkColor = docState.color || penConfig.color || '#2C2623';
  const formattedDateDisplay = formatHandwrittenDate(page.entryDate);
  const allShapes = draftShape ? [...(page.shapes || []), draftShape] : page.shapes || [];

  return (
    <div
      ref={pageContainerRef}
      onClick={() => {
        onActivatePage();
      }}
      onDragOver={(e) => {
        if (isReadMode) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDropFiles}
      className={`relative w-full h-full flex flex-col select-none transition-shadow duration-150 ${paperClass}`}
      style={{
        backgroundColor: effectivePageColor,
        boxShadow: isActivePage
          ? 'inset 0 0 0 1.5px rgba(82, 64, 53, 0.18)'
          : 'inset 0 0 0 1px rgba(82, 64, 53, 0.08)',
      }}
    >
      {/* Subtle Vertical Margin Line on Ruled Paper */}
      {effectivePaperStyle === 'ruled' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-11 w-px z-10"
          style={{ backgroundColor: 'rgba(184, 93, 87, 0.2)' }}
        />
      )}

      {/* Physical Fabric Bookmark Ribbon Hanging from the Top Edge of the Page */}
      <div className="absolute -top-3 right-6 z-30 flex flex-col items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isReadMode) return;
            onActivatePage();
            if (!hasBookmark) {
              handleToggleBookmarkRibbon(
                '#B85D57',
                'satin',
                page.title || `Page ${page.pageNumber}`,
              );
            }
            setShowBookmarkPopover((prev) => !prev);
          }}
          aria-label="Bookmark"
          className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
        >
          <div
            className="w-6 transition-all duration-200 flex flex-col items-center justify-end pb-1.5 shadow-md"
            style={{
              height: hasBookmark ? '58px' : isReadMode ? '0px' : '20px',
              backgroundColor: hasBookmark ? page.bookmarkColor : 'rgba(138, 118, 98, 0.25)',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
            }}
          />
        </button>

        {showBookmarkPopover && !isReadMode && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2 w-52 p-2.5 rounded-lg border z-40 text-xs"
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: 'rgba(82, 64, 53, 0.2)',
              boxShadow: 'var(--shadow-book)',
              color: 'var(--ink-primary)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                Bookmark
              </span>
              <button
                type="button"
                onClick={() => setShowBookmarkPopover(false)}
                className="text-stone-500 hover:text-stone-800 px-1 cursor-pointer"
              >
                Done
              </button>
            </div>
            <input
              type="text"
              value={page.bookmarkTitle}
              onChange={(e) => handleToggleBookmarkRibbon(undefined, undefined, e.target.value)}
              placeholder={`Page ${page.pageNumber}`}
              className="w-full px-2 py-1 rounded border border-stone-300 bg-white/80 text-xs mb-2"
            />
            <div className="flex items-center justify-between mb-2">
              {BOOKMARK_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  aria-label={c.name}
                  onClick={() => handleToggleBookmarkRibbon(c.hex, undefined, undefined)}
                  className={`w-5 h-5 rounded-full border cursor-pointer ${
                    page.bookmarkColor === c.hex
                      ? 'scale-115 ring-2 ring-stone-700'
                      : 'border-stone-300'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            {hasBookmark && (
              <button
                type="button"
                onClick={() => handleToggleBookmarkRibbon()}
                className="w-full py-1 rounded text-red-700 hover:bg-red-50 border border-red-200 font-medium cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* PAGE HEADER: Straight Line for Title (low-opacity "Title" placeholder) + Handwritten Date Line */}
      <div
        className="px-10 sm:px-14 pt-6 pb-3 relative z-20 border-b"
        style={{
          backgroundColor: effectivePageColor,
          borderColor: 'rgba(82, 64, 53, 0.2)',
        }}
      >
        <div className="flex items-end justify-between gap-6">
          {/* 1. Straight Line for Title */}
          <div className="flex-1 min-w-0 border-b border-stone-800/35 pb-0.5">
            <input
              type="text"
              readOnly={isReadMode}
              value={page.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={isReadMode ? '' : 'Title'}
              aria-label={`Page ${page.pageNumber} Entry Title`}
              className="w-full bg-transparent border-none focus:outline-none placeholder:text-stone-600/30"
              style={{
                fontFamily: activeHandFont,
                fontSize: '30px',
                fontWeight: 600,
                color: activeInkColor,
                lineHeight: 1.15,
              }}
            />
          </div>

          {/* 2. Handwritten Date Line */}
          <div className="shrink-0 w-48 border-b border-stone-800/35 pb-0.5 relative flex items-end justify-between gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 pb-1 select-none">
              Date
            </span>

            {isEditingCustomDate && !isReadMode ? (
              <input
                type="text"
                autoFocus
                value={page.entryDate}
                onChange={(e) => handleEntryDateChange(e.target.value)}
                onBlur={() => setIsEditingCustomDate(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingCustomDate(false);
                }}
                placeholder="YYYY-MM-DD"
                aria-label={`Page ${page.pageNumber} Entry Date Input`}
                className="w-full bg-transparent border-none focus:outline-none text-right"
                style={{
                  fontFamily: activeHandFont,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: activeInkColor,
                  lineHeight: 1.15,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isReadMode) setIsEditingCustomDate(true);
                }}
                aria-label={`Page ${page.pageNumber} Handwritten Date`}
                className="flex-1 text-right whitespace-nowrap cursor-text focus:outline-none"
                style={{
                  fontFamily: activeHandFont,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: formattedDateDisplay ? activeInkColor : 'rgba(107, 93, 82, 0.3)',
                  lineHeight: 1.15,
                }}
              >
                {formattedDateDisplay || (isReadMode ? '' : 'Date')}
              </button>
            )}

            {!isReadMode && (
              <label className="relative p-1 text-stone-400 hover:text-stone-700 cursor-pointer shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
                <input
                  type="date"
                  aria-label={`Pick calendar date for Page ${page.pageNumber}`}
                  value={/^\d{4}-\d{2}-\d{2}$/.test(page.entryDate) ? page.entryDate : ''}
                  onChange={(e) => {
                    handleEntryDateChange(e.target.value);
                    setIsEditingCustomDate(false);
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Wide Google Docs-Style Continuous Page Body */}
      <div
        ref={bodyAreaRef}
        className="relative flex-1 w-full overflow-hidden"
        onClick={(e) => {
          onActivatePage();
          if (e.target === e.currentTarget) {
            setSelectedPhotoId(null);
            setSelectedShapeId(null);
            if (!isReadMode && toolMode === 'write') {
              docTextareaRef.current?.focus();
            }
          }
        }}
      >
        {isDragOver && !isReadMode && (
          <div className="absolute inset-3 z-40 rounded-lg border-2 border-dashed border-amber-800/50 bg-amber-50/60 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-medium text-stone-800">Drop Photo</span>
          </div>
        )}

        {/* 1. Continuous Full-Width Document Flow Editor (Fits Long Sentences) */}
        <textarea
          ref={docTextareaRef}
          readOnly={isReadMode}
          data-testid={`page-doc-editor-${page.pageNumber}`}
          value={docState.text}
          onChange={(e) => handleDocumentTextChange(e.target.value)}
          onFocus={() => {
            onActivatePage();
            setSelectedPhotoId(null);
            setSelectedShapeId(null);
          }}
          placeholder={isReadMode ? '' : 'Write...'}
          aria-label={`Page ${page.pageNumber} Continuous Document Editor`}
          className={`absolute inset-0 w-full max-w-none h-full bg-transparent border-none resize-none focus:outline-none overflow-y-auto px-12 sm:px-14 pt-[6px] pb-8 placeholder:text-stone-500/25 select-text ${
            !isReadMode && toolMode === 'write'
              ? 'z-15 pointer-events-auto cursor-text'
              : 'z-10 pointer-events-none'
          }`}
          style={{
            fontFamily: activeHandFont,
            fontSize: `${docState.fontSize || 24}px`,
            lineHeight: '32px',
            color: activeInkColor,
            textDecoration: docState.underlined ? 'underline' : 'none',
            textUnderlineOffset: '5px',
            textAlign: docState.align || 'left',
          }}
        />

        {/* 2. Freehand Handwriting & Shape Drawing Canvas */}
        <canvas
          ref={canvasRef}
          width={1000}
          height={1300}
          data-testid={`page-drawing-canvas-${page.pageNumber}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          className={`absolute inset-0 w-full h-full ${
            !isReadMode && (toolMode === 'draw' || toolMode === 'eraser' || toolMode === 'shape')
              ? 'z-25 cursor-crosshair pointer-events-auto'
              : 'z-12 pointer-events-none'
          }`}
          style={{
            touchAction:
              !isReadMode && (toolMode === 'draw' || toolMode === 'eraser' || toolMode === 'shape')
                ? 'none'
                : 'auto',
          }}
        />

        {/* 3. Interactive Per-Page Shapes Layer */}
        {allShapes.map((shape) => {
          const isShapeSelected = !isReadMode && selectedShapeId === shape.id;
          return (
            <div
              key={shape.id}
              data-testid={`placed-shape-${shape.id}`}
              style={{
                left: `${shape.x}%`,
                top: `${shape.y}%`,
                width: `${shape.width}%`,
                height: `${shape.height}%`,
                transform: `rotate(${shape.rotation || 0}deg)`,
                zIndex: (shape.layerOrder || 2) + 18,
              }}
              onClick={(e) => {
                if (isReadMode) return;
                e.stopPropagation();
                onActivatePage();
                if (toolMode === 'eraser') {
                  soundEngine.playEraser(soundEnabled, soundVolume);
                  const remaining = (page.shapes || []).filter((s) => s.id !== shape.id);
                  onUpdatePage({ ...page, shapes: remaining }, true);
                  return;
                }
                setSelectedShapeId(shape.id);
                setSelectedPhotoId(null);
              }}
              onPointerDown={(e) => {
                if (isReadMode || e.button === 2) return;
                if ((e.target as HTMLElement).dataset.handle) return;
                if (toolMode === 'eraser') return;
                e.stopPropagation();
                onActivatePage();
                setSelectedShapeId(shape.id);
                setSelectedPhotoId(null);
                const rect = e.currentTarget.getBoundingClientRect();
                shapeInteractionRef.current = {
                  type: 'move',
                  shapeId: shape.id,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  initialShape: { ...shape },
                  centerClientX: rect.left + rect.width / 2,
                  centerClientY: rect.top + rect.height / 2,
                  startAngleDeg: 0,
                };
              }}
              className={`group absolute select-none ${
                isReadMode ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'
              } ${isShapeSelected ? 'ring-1 ring-amber-800/60 rounded-xs' : ''}`}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                {renderShapeSvgContent(shape)}
              </svg>

              {isShapeSelected && (
                <>
                  <div
                    data-handle="shape-rotate"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parentEl = e.currentTarget.parentElement!;
                      const rect = parentEl.getBoundingClientRect();
                      const cx = rect.left + rect.width / 2;
                      const cy = rect.top + rect.height / 2;
                      const startAngleDeg =
                        (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
                      shapeInteractionRef.current = {
                        type: 'rotate',
                        shapeId: shape.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialShape: { ...shape },
                        centerClientX: cx,
                        centerClientY: cy,
                        startAngleDeg,
                      };
                    }}
                    className="absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-stone-800 text-amber-50 flex items-center justify-center shadow-md cursor-alias z-30"
                  >
                    <RotateCw className="w-3 h-3" />
                  </div>

                  <div
                    data-handle="shape-resize"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parentEl = e.currentTarget.parentElement!;
                      const rect = parentEl.getBoundingClientRect();
                      shapeInteractionRef.current = {
                        type: 'resize',
                        shapeId: shape.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialShape: { ...shape },
                        centerClientX: rect.left + rect.width / 2,
                        centerClientY: rect.top + rect.height / 2,
                        startAngleDeg: 0,
                      };
                    }}
                    className="absolute -bottom-3 -right-3 w-5 h-5 rounded-full bg-stone-800 text-amber-50 flex items-center justify-center shadow-md cursor-nwse-resize z-30"
                  >
                    <Maximize2 className="w-2.5 h-2.5 rotate-90" />
                  </div>

                  <div
                    data-handle="shape-toolbar"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/95 text-stone-100 text-[11px] shadow-md whitespace-nowrap z-30"
                  >
                    {SHAPE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Shape color ${hex}`}
                        onClick={() => {
                          const updated = (page.shapes || []).map((s) =>
                            s.id === shape.id
                              ? {
                                  ...s,
                                  color: hex,
                                  fillColor:
                                    s.fillColor !== 'transparent' ? `${hex}1F` : 'transparent',
                                }
                              : s,
                          );
                          onUpdatePage({ ...page, shapes: updated }, true);
                        }}
                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${
                          shape.color.toLowerCase() === hex.toLowerCase()
                            ? 'ring-1 ring-white scale-110'
                            : 'border-white/30'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <span className="text-stone-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (page.shapes || []).map((s) =>
                          s.id === shape.id ? { ...s, dashed: !s.dashed } : s,
                        );
                        onUpdatePage({ ...page, shapes: updated }, true);
                      }}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        shape.dashed ? 'bg-amber-700 text-white' : 'hover:bg-white/10'
                      }`}
                    >
                      Dashed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (page.shapes || []).map((s) =>
                          s.id === shape.id
                            ? {
                                ...s,
                                fillColor:
                                  s.fillColor === 'transparent' ? `${s.color}1F` : 'transparent',
                              }
                            : s,
                        );
                        onUpdatePage({ ...page, shapes: updated }, true);
                      }}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        shape.fillColor !== 'transparent'
                          ? 'bg-amber-700 text-white'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = clampShapeTransform({
                          ...shape,
                          id: `sh-${Date.now()}`,
                          x: shape.x + 5,
                          y: shape.y + 5,
                          createdAt: Date.now(),
                        });
                        onUpdatePage({ ...page, shapes: [...(page.shapes || []), copy] }, true);
                        setSelectedShapeId(copy.id);
                      }}
                      className="p-1 hover:bg-white/10 rounded cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete shape"
                      onClick={() => {
                        const remaining = (page.shapes || []).filter((s) => s.id !== shape.id);
                        onUpdatePage({ ...page, shapes: remaining }, true);
                        setSelectedShapeId(null);
                      }}
                      className="p-1 text-red-300 hover:text-red-200 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* 4. Freeform Printed Photographs Layer */}
        {(page.photos || []).map((photo) => {
          const isPhotoSelected = !isReadMode && selectedPhotoId === photo.id;
          return (
            <div
              key={photo.id}
              data-testid={`placed-photo-${photo.id}`}
              style={{
                left: `${photo.x}%`,
                top: `${photo.y}%`,
                width: `${photo.width}%`,
                transform: `rotate(${photo.rotation}deg)`,
                zIndex: (photo.layerOrder || 2) + 20,
              }}
              onClick={(e) => {
                if (isReadMode) return;
                e.stopPropagation();
                onActivatePage();
                setSelectedPhotoId(photo.id);
                setSelectedShapeId(null);
              }}
              onPointerDown={(e) => {
                if (isReadMode || e.button === 2) return;
                if ((e.target as HTMLElement).dataset.handle) return;
                e.stopPropagation();
                onActivatePage();
                setSelectedPhotoId(photo.id);
                setSelectedShapeId(null);
                const rect = e.currentTarget.getBoundingClientRect();
                photoInteractionRef.current = {
                  type: 'move',
                  photoId: photo.id,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  initialPhoto: { ...photo },
                  centerClientX: rect.left + rect.width / 2,
                  centerClientY: rect.top + rect.height / 2,
                  startAngleDeg: 0,
                };
              }}
              className={`group absolute select-none transition-shadow ${
                isReadMode ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'
              } ${photo.hasBorder ? 'p-2.5 pb-6 bg-[#FCFBF7]' : 'p-0'} ${
                isPhotoSelected ? 'ring-2 ring-amber-800/70' : ''
              }`}
            >
              <div
                className="w-full h-full relative"
                style={{
                  boxShadow: photo.hasBorder
                    ? '0 8px 20px rgba(36, 27, 20, 0.18), 0 2px 5px rgba(36, 27, 20, 0.1)'
                    : '0 4px 12px rgba(36, 27, 20, 0.16)',
                }}
              >
                {photo.hasTape && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-6 z-20 pointer-events-none"
                    style={{
                      backgroundColor: photo.tapeColor || '#E8D8BE',
                      opacity: 0.82,
                      transform: 'rotate(-2.5deg)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  />
                )}

                <img
                  src={photo.dataUrl}
                  alt={photo.caption || 'Attached journal photograph'}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-auto block object-cover pointer-events-none"
                  style={{ aspectRatio: `${photo.aspectRatio || 1.33}` }}
                />

                {photo.hasBorder && photo.caption && (
                  <div
                    className="mt-1.5 text-center text-stone-700 truncate px-1"
                    style={{
                      fontFamily: activeHandFont,
                      fontSize: '17px',
                    }}
                  >
                    {photo.caption}
                  </div>
                )}
              </div>

              {isPhotoSelected && (
                <>
                  <div
                    data-handle="rotate"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parentEl = e.currentTarget.parentElement!;
                      const rect = parentEl.getBoundingClientRect();
                      const cx = rect.left + rect.width / 2;
                      const cy = rect.top + rect.height / 2;
                      const startAngleDeg =
                        (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
                      photoInteractionRef.current = {
                        type: 'rotate',
                        photoId: photo.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialPhoto: { ...photo },
                        centerClientX: cx,
                        centerClientY: cy,
                        startAngleDeg,
                      };
                    }}
                    className="absolute -top-4 -right-4 w-7 h-7 rounded-full bg-stone-800 text-amber-50 flex items-center justify-center shadow-md cursor-alias z-30"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>

                  <div
                    data-handle="resize"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parentEl = e.currentTarget.parentElement!;
                      const rect = parentEl.getBoundingClientRect();
                      photoInteractionRef.current = {
                        type: 'resize',
                        photoId: photo.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialPhoto: { ...photo },
                        centerClientX: rect.left + rect.width / 2,
                        centerClientY: rect.top + rect.height / 2,
                        startAngleDeg: 0,
                      };
                    }}
                    className="absolute -bottom-3.5 -right-3.5 w-6 h-6 rounded-full bg-stone-800 text-amber-50 flex items-center justify-center shadow-md cursor-nwse-resize z-30"
                  >
                    <Maximize2 className="w-3 h-3 rotate-90" />
                  </div>

                  <div
                    data-handle="toolbar"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded bg-stone-900/90 text-stone-100 text-[11px] shadow-md whitespace-nowrap z-30"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (page.photos || []).map((p) =>
                          p.id === photo.id ? { ...p, hasTape: !p.hasTape } : p,
                        );
                        onUpdatePage({ ...page, photos: updated }, true);
                      }}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        photo.hasTape ? 'bg-amber-700 text-white' : 'hover:bg-stone-700'
                      }`}
                    >
                      Tape
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (page.photos || []).map((p) =>
                          p.id === photo.id ? { ...p, hasBorder: !p.hasBorder } : p,
                        );
                        onUpdatePage({ ...page, photos: updated }, true);
                      }}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        photo.hasBorder ? 'bg-amber-700 text-white' : 'hover:bg-stone-700'
                      }`}
                    >
                      Frame
                    </button>
                    <button
                      type="button"
                      aria-label="Remove photograph"
                      onClick={() => {
                        const updated = (page.photos || []).filter((p) => p.id !== photo.id);
                        onUpdatePage({ ...page, photos: updated }, true);
                        setSelectedPhotoId(null);
                      }}
                      className="p-1 text-red-300 hover:text-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Minimal Page Footer */}
      <div className="px-10 sm:px-14 py-1.5 flex items-center justify-between text-[11px] text-stone-400/80 z-20">
        <span className="font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(page.pageNumber).padStart(2, '0')}
        </span>

        <span className="font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {page.wordCount || 0} {page.wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  );
};
