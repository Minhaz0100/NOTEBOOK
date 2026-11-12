import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Circle,
  Compass,
  Diamond,
  Eraser,
  Feather,
  Highlighter,
  Image as ImageIcon,
  Languages,
  Minus,
  MoveRight,
  Palette,
  Pencil,
  PenTool,
  Plus,
  Redo2,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  TextSelect,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ActiveToolMode,
  PenConfig,
  PenInstrumentType,
  ShapeKind,
} from '../types/journal';
import type { PageDocumentState } from '../utils/journalLogic';

export type RadialSpokeId = 'write' | 'draw' | 'shape' | 'page' | 'photo' | 'eraser';

interface RadialMenuOrigin {
  x: number;
  y: number;
}

interface PenBoxTrayProps {
  radialOrigin: RadialMenuOrigin | null;
  isReadMode: boolean;
  toolMode: ActiveToolMode;
  penConfig: PenConfig;
  pageDocState: PageDocumentState;
  canUndo: boolean;
  canRedo: boolean;
  onCloseRadial: () => void;
  onOpenRadialAt: (origin: RadialMenuOrigin) => void;
  onChangeToolMode: (mode: ActiveToolMode) => void;
  onChangePenConfig: (patch: Partial<PenConfig>) => void;
  onUpdatePageDocStyle: (patch: Partial<PageDocumentState>) => void;
  onAddShapeToPage: (kind: ShapeKind) => void;
  onClearPageStrokes: () => void;
  onClearPageShapes: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUploadPhotoFile: (file: File) => void;
  onInsertStudioPhoto: (preset: 'sunset' | 'daisies' | 'windowCat' | 'botanical') => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon?: React.FC<{ className?: string }>;
  swatchColor?: string;
  isActive?: boolean;
  hasChildren?: boolean;
  onSelect: () => void;
}

const INK_PALETTE = [
  { id: 'ink-black', label: 'Espresso', hex: '#2C2623' },
  { id: 'ink-indigo', label: 'Indigo', hex: '#3B4D7A' },
  { id: 'ink-violet', label: 'Violet', hex: '#5B3E85' },
  { id: 'ink-red', label: 'Carmine', hex: '#9C3D35' },
  { id: 'ink-sage', label: 'Sage', hex: '#48704C' },
  { id: 'ink-rose', label: 'Rose', hex: '#C76574' },
  { id: 'ink-ochre', label: 'Ochre', hex: '#C9822B' },
];

export const ENGLISH_FONTS = [
  { id: 'font-caveat', name: 'Caveat', label: 'Caveat' },
  { id: 'font-kalam', name: 'Kalam', label: 'Kalam' },
  { id: 'font-patrick', name: 'Patrick Hand', label: 'Patrick' },
  { id: 'font-dancing', name: 'Dancing Script', label: 'Dancing' },
  { id: 'font-indie', name: 'Indie Flower', label: 'Indie' },
];

export const BANGLA_FONTS = [
  { id: 'font-atma', name: 'Atma', label: 'আত্মা' },
  { id: 'font-galada', name: 'Galada', label: 'গালাদা' },
  { id: 'font-siliguri', name: 'Hind Siliguri', label: 'শিলিগুড়ি' },
  { id: 'font-anek', name: 'Anek Bangla', label: 'অনেক' },
  { id: 'font-serif', name: 'Noto Serif Bengali', label: 'সেরিফ' },
];

const HANDWRITING_FONTS = [...ENGLISH_FONTS, ...BANGLA_FONTS];

const RING_1_SPOKES: Array<{
  id: RadialSpokeId;
  label: string;
  angleDeg: number;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'write', label: 'Write', angleDeg: -90, icon: Type },
  { id: 'draw', label: 'Sketch', angleDeg: -30, icon: PenTool },
  { id: 'shape', label: 'Shapes', angleDeg: 30, icon: Shapes },
  { id: 'page', label: 'Page', angleDeg: 90, icon: SlidersHorizontal },
  { id: 'photo', label: 'Photos', angleDeg: 150, icon: ImageIcon },
  { id: 'eraser', label: 'Eraser', angleDeg: -150, icon: Eraser },
];

export const PenBoxTray: React.FC<PenBoxTrayProps> = ({
  radialOrigin,
  isReadMode,
  toolMode,
  penConfig,
  pageDocState,
  canUndo,
  canRedo,
  onCloseRadial,
  onOpenRadialAt,
  onChangeToolMode,
  onChangePenConfig,
  onUpdatePageDocStyle,
  onAddShapeToPage,
  onClearPageStrokes,
  onClearPageShapes,
  onUndo,
  onRedo,
  onUploadPhotoFile,
  onInsertStudioPhoto,
}) => {
  const [activeRing1, setActiveRing1] = useState<RadialSpokeId | null>('write');
  const [activeRing2, setActiveRing2] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (isReadMode) {
    return null;
  }

  const activeColor = pageDocState.color || penConfig.color || '#2C2623';
  const activeFont = pageDocState.fontFamily || penConfig.fontFamily || 'Caveat';
  const activeFontSize = pageDocState.fontSize || penConfig.fontSize || 24;

  const handlePickColor = (hex: string) => {
    onChangePenConfig({ color: hex });
    onUpdatePageDocStyle({ color: hex });
  };

  // Ring 1 selection handler
  const handleSelectRing1 = (spokeId: RadialSpokeId) => {
    setActiveRing1(spokeId);
    setActiveRing2(null);
    if (spokeId === 'write') onChangeToolMode('write');
    if (spokeId === 'draw') onChangeToolMode('draw');
    if (spokeId === 'shape') onChangeToolMode('shape');
    if (spokeId === 'eraser') onChangeToolMode('eraser');
  };

  // Build Ring 2 items based on activeRing1
  const getRing2Items = (spoke: RadialSpokeId | null): SubMenuItem[] => {
    if (!spoke) return [];
    switch (spoke) {
      case 'write':
      case 'page':
        return [
          {
            id: 'font-en',
            label: 'English',
            icon: Type,
            hasChildren: true,
            isActive: activeRing2 === 'font-en' || activeRing2 === 'font',
            onSelect: () => setActiveRing2('font-en'),
          },
          {
            id: 'font-bn',
            label: 'বাংলা ফন্ট',
            icon: Languages,
            hasChildren: true,
            isActive: activeRing2 === 'font-bn',
            onSelect: () => setActiveRing2('font-bn'),
          },
          {
            id: 'ink',
            label: 'Color',
            icon: Palette,
            swatchColor: activeColor,
            hasChildren: true,
            isActive: activeRing2 === 'ink',
            onSelect: () => setActiveRing2('ink'),
          },
          {
            id: 'size',
            label: 'Size',
            icon: TextSelect,
            hasChildren: true,
            isActive: activeRing2 === 'size',
            onSelect: () => setActiveRing2('size'),
          },
          {
            id: 'align',
            label: 'Align',
            icon: AlignLeft,
            hasChildren: true,
            isActive: activeRing2 === 'align',
            onSelect: () => setActiveRing2('align'),
          },
        ];

      case 'draw':
        return [
          {
            id: 'pen-type',
            label: 'Pen',
            icon: Feather,
            hasChildren: true,
            isActive: activeRing2 === 'pen-type',
            onSelect: () => setActiveRing2('pen-type'),
          },
          {
            id: 'ink',
            label: 'Ink',
            icon: Palette,
            swatchColor: activeColor,
            hasChildren: true,
            isActive: activeRing2 === 'ink',
            onSelect: () => setActiveRing2('ink'),
          },
          {
            id: 'nib',
            label: 'Thickness',
            icon: SlidersHorizontal,
            hasChildren: true,
            isActive: activeRing2 === 'nib',
            onSelect: () => setActiveRing2('nib'),
          },
        ];

      case 'shape':
        return [
          {
            id: 'sh-rect',
            label: 'Box',
            icon: Square,
            isActive: penConfig.activeShapeKind === 'rectangle',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'rectangle' });
              onAddShapeToPage('rectangle');
              onCloseRadial();
            },
          },
          {
            id: 'sh-circle',
            label: 'Circle',
            icon: Circle,
            isActive: penConfig.activeShapeKind === 'circle',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'circle' });
              onAddShapeToPage('circle');
              onCloseRadial();
            },
          },
          {
            id: 'sh-line',
            label: 'Line',
            icon: Minus,
            isActive: penConfig.activeShapeKind === 'line',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'line' });
              onAddShapeToPage('line');
              onCloseRadial();
            },
          },
          {
            id: 'sh-arrow',
            label: 'Arrow',
            icon: MoveRight,
            isActive: penConfig.activeShapeKind === 'arrow',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'arrow' });
              onAddShapeToPage('arrow');
              onCloseRadial();
            },
          },
          {
            id: 'sh-diamond',
            label: 'Diamond',
            icon: Diamond,
            isActive: penConfig.activeShapeKind === 'diamond',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'diamond' });
              onAddShapeToPage('diamond');
              onCloseRadial();
            },
          },
          {
            id: 'sh-star',
            label: 'Star',
            icon: Star,
            isActive: penConfig.activeShapeKind === 'star',
            onSelect: () => {
              onChangePenConfig({ activeShapeKind: 'star' });
              onAddShapeToPage('star');
              onCloseRadial();
            },
          },
          {
            id: 'sh-style',
            label: 'Style',
            icon: Sparkles,
            hasChildren: true,
            isActive: activeRing2 === 'sh-style',
            onSelect: () => setActiveRing2('sh-style'),
          },
        ];

      case 'photo':
        return [
          {
            id: 'ph-upload',
            label: 'Upload',
            icon: Upload,
            onSelect: () => {
              fileInputRef.current?.click();
              onCloseRadial();
            },
          },
          {
            id: 'ph-sunset',
            label: 'Sunset',
            icon: ImageIcon,
            onSelect: () => {
              onInsertStudioPhoto('sunset');
              onCloseRadial();
            },
          },
          {
            id: 'ph-daisies',
            label: 'Daisies',
            icon: ImageIcon,
            onSelect: () => {
              onInsertStudioPhoto('daisies');
              onCloseRadial();
            },
          },
          {
            id: 'ph-cat',
            label: 'Cat',
            icon: ImageIcon,
            onSelect: () => {
              onInsertStudioPhoto('windowCat');
              onCloseRadial();
            },
          },
          {
            id: 'ph-leaf',
            label: 'Leaf',
            icon: ImageIcon,
            onSelect: () => {
              onInsertStudioPhoto('botanical');
              onCloseRadial();
            },
          },
        ];

      case 'eraser':
        return [
          {
            id: 'er-stroke',
            label: 'Eraser',
            icon: Eraser,
            isActive: toolMode === 'eraser',
            onSelect: () => {
              onChangeToolMode('eraser');
              onCloseRadial();
            },
          },
          {
            id: 'er-clear-ink',
            label: 'Clear Ink',
            icon: Trash2,
            onSelect: () => {
              onClearPageStrokes();
              onCloseRadial();
            },
          },
          {
            id: 'er-clear-shapes',
            label: 'Clear Shapes',
            icon: Trash2,
            onSelect: () => {
              onClearPageShapes();
              onCloseRadial();
            },
          },
        ];
    }
  };

  // Build Ring 3 items based on activeRing2
  const getRing3Items = (ring2Id: string | null): SubMenuItem[] => {
    if (!ring2Id) return [];
    switch (ring2Id) {
      case 'font':
      case 'font-en':
        return ENGLISH_FONTS.map((f) => ({
          id: f.id,
          label: f.label,
          icon: Type,
          isActive: activeFont === f.name,
          onSelect: () => {
            onChangePenConfig({ fontFamily: f.name });
            onUpdatePageDocStyle({ fontFamily: f.name });
            onCloseRadial();
          },
        }));

      case 'font-bn':
        return BANGLA_FONTS.map((f) => ({
          id: f.id,
          label: f.label,
          icon: Languages,
          isActive: activeFont === f.name,
          onSelect: () => {
            onChangePenConfig({ fontFamily: f.name });
            onUpdatePageDocStyle({ fontFamily: f.name });
            onCloseRadial();
          },
        }));

      case 'ink':
        return INK_PALETTE.map((ink) => ({
          id: ink.id,
          label: ink.label,
          swatchColor: ink.hex,
          isActive: activeColor.toLowerCase() === ink.hex.toLowerCase(),
          onSelect: () => {
            handlePickColor(ink.hex);
            onCloseRadial();
          },
        }));

      case 'size':
        return [
          {
            id: 'sz-20',
            label: 'Small',
            icon: TextSelect,
            isActive: activeFontSize <= 20,
            onSelect: () => {
              onChangePenConfig({ fontSize: 20 });
              onUpdatePageDocStyle({ fontSize: 20 });
              onCloseRadial();
            },
          },
          {
            id: 'sz-24',
            label: 'Medium',
            icon: TextSelect,
            isActive: activeFontSize > 20 && activeFontSize <= 25,
            onSelect: () => {
              onChangePenConfig({ fontSize: 24 });
              onUpdatePageDocStyle({ fontSize: 24 });
              onCloseRadial();
            },
          },
          {
            id: 'sz-28',
            label: 'Large',
            icon: TextSelect,
            isActive: activeFontSize > 25 && activeFontSize <= 29,
            onSelect: () => {
              onChangePenConfig({ fontSize: 28 });
              onUpdatePageDocStyle({ fontSize: 28 });
              onCloseRadial();
            },
          },
          {
            id: 'sz-32',
            label: 'Display',
            icon: TextSelect,
            isActive: activeFontSize >= 30,
            onSelect: () => {
              onChangePenConfig({ fontSize: 32 });
              onUpdatePageDocStyle({ fontSize: 32 });
              onCloseRadial();
            },
          },
        ];

      case 'align':
        return [
          {
            id: 'al-left',
            label: 'Left',
            icon: AlignLeft,
            isActive: pageDocState.align === 'left',
            onSelect: () => {
              onUpdatePageDocStyle({ align: 'left' });
              onCloseRadial();
            },
          },
          {
            id: 'al-center',
            label: 'Center',
            icon: AlignCenter,
            isActive: pageDocState.align === 'center',
            onSelect: () => {
              onUpdatePageDocStyle({ align: 'center' });
              onCloseRadial();
            },
          },
          {
            id: 'al-right',
            label: 'Right',
            icon: AlignRight,
            isActive: pageDocState.align === 'right',
            onSelect: () => {
              onUpdatePageDocStyle({ align: 'right' });
              onCloseRadial();
            },
          },
          {
            id: 'al-underline',
            label: 'Underline',
            icon: Underline,
            isActive: pageDocState.underlined,
            onSelect: () => {
              onUpdatePageDocStyle({ underlined: !pageDocState.underlined });
              onCloseRadial();
            },
          },
        ];

      case 'pen-type':
        return (
          [
            { id: 'fountain', label: 'Fountain', icon: Feather },
            { id: 'ballpoint', label: 'Ballpoint', icon: PenTool },
            { id: 'gel', label: 'Gel', icon: PenTool },
            { id: 'finetip', label: 'Fine-Tip', icon: Minus },
            { id: 'marker', label: 'Highlighter', icon: Highlighter },
            { id: 'pencil', label: 'Pencil', icon: Pencil },
          ] as Array<{ id: PenInstrumentType; label: string; icon: React.FC<{ className?: string }> }>
        ).map((inst) => ({
          id: inst.id,
          label: inst.label,
          icon: inst.icon,
          isActive: penConfig.instrument === inst.id,
          onSelect: () => {
            onChangePenConfig({ instrument: inst.id });
            onChangeToolMode('draw');
            onCloseRadial();
          },
        }));

      case 'nib':
        return [
          {
            id: 'nib-2',
            label: 'Fine',
            icon: Minus,
            isActive: penConfig.size <= 2,
            onSelect: () => {
              onChangePenConfig({ size: 2 });
              onCloseRadial();
            },
          },
          {
            id: 'nib-3.5',
            label: 'Medium',
            icon: Minus,
            isActive: penConfig.size > 2 && penConfig.size <= 4,
            onSelect: () => {
              onChangePenConfig({ size: 3.5 });
              onCloseRadial();
            },
          },
          {
            id: 'nib-5.5',
            label: 'Bold',
            icon: Plus,
            isActive: penConfig.size > 4 && penConfig.size <= 6,
            onSelect: () => {
              onChangePenConfig({ size: 5.5 });
              onCloseRadial();
            },
          },
          {
            id: 'nib-7.5',
            label: 'Broad',
            icon: Plus,
            isActive: penConfig.size > 6,
            onSelect: () => {
              onChangePenConfig({ size: 7.5 });
              onCloseRadial();
            },
          },
        ];

      case 'sh-style':
        return [
          {
            id: 'st-solid',
            label: 'Solid',
            icon: Minus,
            isActive: !penConfig.shapeDashed,
            onSelect: () => {
              onChangePenConfig({ shapeDashed: false });
              onCloseRadial();
            },
          },
          {
            id: 'st-dashed',
            label: 'Dashed',
            icon: Minus,
            isActive: Boolean(penConfig.shapeDashed),
            onSelect: () => {
              onChangePenConfig({ shapeDashed: true });
              onCloseRadial();
            },
          },
          {
            id: 'st-fill',
            label: 'Filled',
            icon: Square,
            isActive: Boolean(penConfig.shapeFilled),
            onSelect: () => {
              onChangePenConfig({ shapeFilled: true });
              onCloseRadial();
            },
          },
          {
            id: 'st-outline',
            label: 'Outline',
            icon: Square,
            isActive: !penConfig.shapeFilled,
            onSelect: () => {
              onChangePenConfig({ shapeFilled: false });
              onCloseRadial();
            },
          },
        ];

      default:
        return [];
    }
  };

  const ring1BaseAngle =
    RING_1_SPOKES.find((s) => s.id === activeRing1)?.angleDeg ?? -90;
  const ring2Items = getRing2Items(activeRing1);
  const ring3Items = getRing3Items(activeRing2);

  // Compute angles for Ring 2 items fanned out around ring1BaseAngle
  const getFanAngle = (baseAngle: number, index: number, total: number, stepDeg: number) => {
    if (total <= 1) return baseAngle;
    const startOffset = -((total - 1) * stepDeg) / 2;
    return baseAngle + startOffset + index * stepDeg;
  };

  const activeRing2Index = ring2Items.findIndex((i) => i.id === activeRing2);
  const ring2BaseAngle =
    activeRing2Index >= 0
      ? getFanAngle(ring1BaseAngle, activeRing2Index, ring2Items.length, 28)
      : ring1BaseAngle;

  const r1Radius = 74;
  const r2Radius = 146;
  const r3Radius = 216;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUploadPhotoFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Quiet Minimal Trigger Icon in Top-Left (for touch devices or one-click access) */}
      <button
        type="button"
        data-testid="radial-menu-trigger"
        aria-label="Tools"
        title="Tools (or right-click anywhere)"
        onClick={() => {
          const cx = typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 520;
          const cy = typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 440;
          onOpenRadialAt({ x: cx, y: cy });
        }}
        className="fixed left-4 top-14 z-30 w-9 h-9 rounded-full bg-[#FAF6F0]/90 hover:bg-[#FAF6F0] border border-stone-300/80 shadow-xs flex items-center justify-center text-stone-800 cursor-pointer transition-transform hover:scale-105"
      >
        <Compass className="w-4 h-4" />
      </button>

      {/* Right-Click Concentric Expanding Radial Menu (Borderless Icons + Text) */}
      {radialOrigin && (
        <div
          data-testid="radial-tool-menu"
          className="fixed inset-0 z-50 select-none"
          onClick={onCloseRadial}
          onContextMenu={(e) => {
            e.preventDefault();
            const clampedX = Math.max(240, Math.min(window.innerWidth - 240, e.clientX));
            const clampedY = Math.max(240, Math.min(window.innerHeight - 240, e.clientY));
            onOpenRadialAt({ x: clampedX, y: clampedY });
          }}
        >
          {/* Soft subtle backdrop blur only around the radial origin */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${radialOrigin.x}px`,
              top: `${radialOrigin.y}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-0 h-0 flex items-center justify-center"
          >
            {/* Ambient radial glow (no circle borders or pie lines) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute w-[440px] h-[440px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(250, 246, 240, 0.94) 0%, rgba(244, 239, 230, 0.82) 48%, rgba(244, 239, 230, 0) 72%)',
              }}
            />

            {/* CENTER HUB: Undo / Close / Redo */}
            <div className="relative z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FAF6F0]/95 shadow-sm">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo"
                className="p-1 text-stone-700 hover:text-stone-950 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onCloseRadial}
                aria-label="Close"
                title="Close"
                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-700 hover:text-stone-950 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo"
                className="p-1 text-stone-700 hover:text-stone-950 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* RING 1: Primary Tools (Expanding from Center, Borderless Icons + Text) */}
            {RING_1_SPOKES.map((spoke) => {
              const rad = (spoke.angleDeg * Math.PI) / 180;
              const rx = Math.cos(rad) * r1Radius;
              const ry = Math.sin(rad) * r1Radius;
              const Icon = spoke.icon;
              const isSelected = activeRing1 === spoke.id;

              return (
                <button
                  key={spoke.id}
                  type="button"
                  data-testid={`radial-spoke-${spoke.id}`}
                  onMouseEnter={() => handleSelectRing1(spoke.id)}
                  onClick={() => handleSelectRing1(spoke.id)}
                  style={
                    {
                      '--rx': `${rx.toFixed(1)}px`,
                      '--ry': `${ry.toFixed(1)}px`,
                    } as React.CSSProperties
                  }
                  className={`radial-item-bloom absolute z-25 px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                      : 'text-stone-800 hover:bg-[#EFE7DA]/90'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                    {spoke.label}
                  </span>
                </button>
              );
            })}

            {/* RING 2: Sub-Menu Arc (Expands outward from selected Ring 1 item) */}
            {ring2Items.map((item, idx) => {
              const angleDeg = getFanAngle(ring1BaseAngle, idx, ring2Items.length, 28);
              const rad = (angleDeg * Math.PI) / 180;
              const rx = Math.cos(rad) * r2Radius;
              const ry = Math.sin(rad) * r2Radius;
              const Icon = item.icon;
              const isSelected = Boolean(item.isActive);

              return (
                <button
                  key={`${activeRing1}-${item.id}`}
                  type="button"
                  data-testid={`radial-r2-${item.id}`}
                  onMouseEnter={() => {
                    if (item.hasChildren) {
                      setActiveRing2(item.id);
                    }
                  }}
                  onClick={item.onSelect}
                  style={
                    {
                      '--rx': `${rx.toFixed(1)}px`,
                      '--ry': `${ry.toFixed(1)}px`,
                    } as React.CSSProperties
                  }
                  className={`radial-item-bloom absolute z-25 px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                      : 'bg-[#FAF6F0]/90 text-stone-800 hover:bg-[#EFE7DA]'
                  }`}
                >
                  {item.swatchColor ? (
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: item.swatchColor }}
                    />
                  ) : Icon ? (
                    <Icon className="w-4 h-4" />
                  ) : null}
                  <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* RING 3: Deep Leaf Options Arc (Expands outward from selected Ring 2 item) */}
            {ring3Items.map((leaf, idx) => {
              const angleDeg = getFanAngle(ring2BaseAngle, idx, ring3Items.length, 21);
              const rad = (angleDeg * Math.PI) / 180;
              const rx = Math.cos(rad) * r3Radius;
              const ry = Math.sin(rad) * r3Radius;
              const Icon = leaf.icon;
              const isSelected = Boolean(leaf.isActive);

              const matchingFont = HANDWRITING_FONTS.find((f) => f.id === leaf.id);
              const leafFontStyle = matchingFont
                ? `"${matchingFont.name}", 'Atma', 'Galada', 'Hind Siliguri', cursive, sans-serif`
                : undefined;

              return (
                <button
                  key={`${activeRing2}-${leaf.id}`}
                  type="button"
                  data-testid={`radial-r3-${leaf.id}`}
                  onClick={leaf.onSelect}
                  style={
                    {
                      '--rx': `${rx.toFixed(1)}px`,
                      '--ry': `${ry.toFixed(1)}px`,
                      fontFamily: leafFontStyle,
                    } as React.CSSProperties
                  }
                  className={`radial-item-bloom absolute z-25 px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#524035] text-[#FAF6F0] shadow-xs'
                      : 'bg-[#FAF6F0]/95 text-stone-800 hover:bg-[#EFE7DA]'
                  }`}
                >
                  {leaf.swatchColor ? (
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: leaf.swatchColor }}
                    />
                  ) : Icon ? (
                    <Icon className="w-3.5 h-3.5" />
                  ) : null}
                  <span
                    className="text-[11px] font-medium leading-none whitespace-nowrap"
                    style={{ fontFamily: leafFontStyle }}
                  >
                    {leaf.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
