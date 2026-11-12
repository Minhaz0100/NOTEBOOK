export type NotebookType = 'daily' | 'free' | 'notes';

export type BindingStyle = 'spiral' | 'stitched' | 'hardcover' | 'softcover';

export type CoverMaterial = 'linen' | 'leather' | 'kraft' | 'buckram';

export type CoverAccent = 'botanical' | 'minimal-frame' | 'celestial' | 'monogram' | 'none';

export type PaperStyle = 'ruled' | 'dotted' | 'blank';

export type TableStyle = 'oak' | 'walnut' | 'modern';

export type BookshelfStyle = 'classic' | 'dark' | 'minimal';

export type ThemeStyle = 'warm-ivory' | 'soft-sage' | 'evening-study';

export type AnimationMode = 'full' | 'reduced' | 'none';

export type BookmarkStyle = 'satin' | 'linen' | 'velvet' | 'none';

export type PenInstrumentType =
  | 'fountain'
  | 'ballpoint'
  | 'gel'
  | 'finetip'
  | 'marker'
  | 'pencil';

export type ActiveToolMode = 'write' | 'draw' | 'shape' | 'eraser' | 'select';

export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow' | 'diamond' | 'star';

export type StudyViewMode = 'welcome' | 'room' | 'desk' | 'bookshelf' | 'notebook';

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error';

export interface UserProfile {
  uid: string;
  displayName: string;
  tableStyle: TableStyle;
  bookshelfStyle: BookshelfStyle;
  theme: ThemeStyle;
  soundEnabled: boolean;
  soundVolume: number;
  animationMode: AnimationMode;
  defaultPenColor: string;
  defaultPageColor: string;
  defaultFontFamily: string;
  hasSeenRoomIntro: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TypedTextBlock {
  id: string;
  text: string;
  x: number; // percentage 0..90 of page width
  y: number; // percentage 0..90 of page height
  width: number; // percentage 20..92 of page width
  fontFamily: string;
  fontSize: number; // px, e.g. 20..36
  color: string; // hex color preserved per block
  underlined: boolean;
  align: 'left' | 'center' | 'right';
  layerOrder: number;
  createdAt: number;
}

export interface PlacedShape {
  id: string;
  kind: ShapeKind;
  x: number; // percentage 2..90 of page width
  y: number; // percentage 2..90 of page height
  width: number; // percentage 6..88 of page width
  height: number; // percentage 4..85 of page height
  color: string; // stroke hex color
  fillColor: string; // 'transparent' or soft tint hex
  strokeWidth: number; // px 1.5..6
  dashed: boolean;
  rotation: number; // degrees
  layerOrder: number;
  createdAt: number;
}

export interface StrokePoint {
  x: number; // normalized 0..1000 canvas coordinate
  y: number; // normalized 0..1300 canvas coordinate
  pressure: number; // 0.1..1.0
}

export interface PenStroke {
  id: string;
  instrument: PenInstrumentType;
  color: string;
  size: number; // base width in px
  opacity: number; // 0.15..1.0
  points: StrokePoint[];
  layerOrder: number;
  createdAt: number;
}

export interface PlacedPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  x: number; // percentage 2..85
  y: number; // percentage 4..85
  width: number; // percentage 16..75
  aspectRatio: number; // width / height
  rotation: number; // degrees -180..180
  hasBorder: boolean;
  hasTape: boolean;
  tapeColor: string;
  layerOrder: number;
  createdAt: number;
}

export interface NotebookPage {
  id: string;
  notebookId: string;
  ownerId: string;
  pageNumber: number;
  entryDate: string; // YYYY-MM-DD for Daily Journal or ''
  title: string;
  paperStyle: PaperStyle;
  pageColor: string;
  bookmarkTitle: string;
  bookmarkColor: string;
  bookmarkStyle: BookmarkStyle;
  textBlocks: TypedTextBlock[];
  shapes?: PlacedShape[];
  strokes: PenStroke[];
  photos: PlacedPhoto[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  notebookType: NotebookType;
  journalYear: number;
  coverColor: string;
  coverMaterial: CoverMaterial;
  coverAccent: CoverAccent;
  bindingStyle: BindingStyle;
  defaultPaperStyle: PaperStyle;
  defaultPageColor: string;
  defaultFontFamily: string;
  pageCount: number;
  lastOpenedPage: number;
  lastViewedDate: string;
  archived: boolean;
  deskPositionX: number;
  deskPositionZ: number;
  deskRotationY: number;
  bookmarkIds: string[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PenConfig {
  instrument: PenInstrumentType;
  color: string;
  size: number;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  underlined: boolean;
  align: 'left' | 'center' | 'right';
  activeShapeKind?: ShapeKind;
  shapeDashed?: boolean;
  shapeFilled?: boolean;
}

export interface JournalSummaryResult {
  overview: string;
  themes: string[];
  highlights: Array<{
    pageNumber: number;
    note: string;
  }>;
}
