import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Cloud,
  LogOut,
  Palette,
  RotateCcw,
  Trash2,
  User as UserIcon,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AnimationMode,
  BindingStyle,
  BookshelfStyle,
  CoverAccent,
  CoverMaterial,
  Notebook,
  NotebookType,
  PaperStyle,
  SyncStatus,
  TableStyle,
  ThemeStyle,
  UserProfile,
} from '../types/journal';

export const COVER_SWATCHES = [
  { name: 'Warm Ivory Linen', hex: '#EFE6D8' },
  { name: 'Botanical Sage', hex: '#6C7D65' },
  { name: 'Sienna Leather', hex: '#8B5A47' },
  { name: 'Dusty Rose', hex: '#C79B98' },
  { name: 'Muted Slate Blue', hex: '#5D7082' },
  { name: 'Walnut Espresso', hex: '#4B382C' },
];

export const PAGE_COLOR_SWATCHES = [
  { name: 'Warm Cream', hex: '#FAF6F0' },
  { name: 'Blush Parchment', hex: '#F9ECE6' },
  { name: 'Soft Meadow', hex: '#ECF2E8' },
  { name: 'Mist Blue', hex: '#EAF0F6' },
  { name: 'Lavender Ivory', hex: '#F1ECF6' },
];

function getCoverMaterialStyle(coverColor: string, material: CoverMaterial): React.CSSProperties {
  if (material === 'linen') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 4px),
        repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 4px)
      `,
    };
  }
  if (material === 'leather') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        radial-gradient(circle at 20% 25%, rgba(255,255,255,0.12) 0%, transparent 45%),
        radial-gradient(circle at 80% 75%, rgba(0,0,0,0.22) 0%, transparent 50%),
        repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 6px)
      `,
      boxShadow: 'inset 0 0 18px rgba(0,0,0,0.35), 0 14px 28px rgba(28, 20, 14, 0.25)',
    };
  }
  if (material === 'kraft') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        repeating-linear-gradient(28deg, rgba(82,60,40,0.07) 0px, rgba(82,60,40,0.07) 2px, transparent 2px, transparent 9px),
        repeating-linear-gradient(-35deg, rgba(255,250,240,0.08) 0px, rgba(255,250,240,0.08) 1px, transparent 1px, transparent 7px)
      `,
    };
  }
  return {
    backgroundColor: coverColor,
    backgroundImage: `
      repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 5px),
      repeating-linear-gradient(-45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 5px)
    `,
  };
}

export const NotebookCoverPreviewCard: React.FC<{
  title: string;
  description: string;
  notebookType: NotebookType;
  journalYear: number;
  coverColor: string;
  coverMaterial: CoverMaterial;
  bindingStyle: BindingStyle;
  defaultPaperStyle: PaperStyle;
  compact?: boolean;
}> = ({
  title,
  description,
  notebookType,
  journalYear,
  coverColor,
  coverMaterial,
  bindingStyle,
  defaultPaperStyle,
  compact = false,
}) => {
  const isLightCover = coverColor === '#EFE6D8' || coverColor === '#C79B98';
  const textColor = isLightCover ? '#362B24' : '#FAF6F0';

  return (
    <div
      className={`relative ${compact ? 'w-36 h-48 p-3' : 'w-44 h-60 p-4'} rounded-r-xl rounded-l-xs flex flex-col items-center justify-between text-center shadow-lg transition-all select-none overflow-visible`}
      style={{
        ...getCoverMaterialStyle(coverColor, coverMaterial),
        color: textColor,
        border: '1px solid rgba(0,0,0,0.22)',
      }}
    >
      {/* Material-specific physical details */}
      {coverMaterial === 'leather' && (
        <div
          className="absolute inset-2 rounded-r-lg rounded-l-xs pointer-events-none"
          style={{
            border: `1.5px dashed ${isLightCover ? 'rgba(82,64,53,0.42)' : 'rgba(250,240,225,0.45)'}`,
          }}
        />
      )}
      {coverMaterial === 'buckram' && (
        <>
          <div
            className="absolute top-0 right-0 w-5 h-5 rounded-tr-xl pointer-events-none"
            style={{
              background: 'linear-gradient(225deg, #C8A25A 50%, transparent 52%)',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded-br-xl pointer-events-none"
            style={{
              background: 'linear-gradient(315deg, #C8A25A 50%, transparent 52%)',
            }}
          />
        </>
      )}

      {/* Binding-specific physical hardware */}
      {bindingStyle === 'spiral' && (
        <div className="absolute -left-2.5 top-3 bottom-3 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: compact ? 7 : 9 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <span className="w-4 h-1.5 rounded-full bg-gradient-to-r from-amber-900 via-amber-500 to-amber-800 block shadow-xs" />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-900/75 -ml-1 block" />
            </div>
          ))}
        </div>
      )}

      {bindingStyle === 'stitched' && (
        <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/22 rounded-l-xs flex flex-col justify-evenly items-center pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-full flex flex-col items-center gap-0.5">
              <span className="w-3 h-1 bg-[#E8DCC8] rounded-xs block shadow-2xs" />
              <span className="w-2.5 h-0.5 bg-amber-100/90 rotate-12 block" />
            </div>
          ))}
        </div>
      )}

      {bindingStyle === 'hardcover' && (
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/28 rounded-l-xs border-r border-black/30 flex flex-col justify-evenly items-center pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-full h-1.5 bg-gradient-to-b from-white/25 via-black/20 to-black/45 block"
            />
          ))}
        </div>
      )}

      {bindingStyle === 'softcover' && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/18 rounded-l-xs pointer-events-none" />
          <div
            className="absolute top-0 bottom-0 right-3.5 w-2.5 pointer-events-none shadow-xs"
            style={{
              backgroundColor: isLightCover ? '#3A2E27' : '#231C18',
            }}
          />
        </>
      )}

      <div className="text-[10px] uppercase tracking-widest opacity-80 mt-2 pl-2">
        {notebookType === 'daily' ? `${journalYear} Journal` : `${coverMaterial} cover`}
      </div>

      <div className="px-3 py-2 rounded-md bg-white/12 border border-current/15 backdrop-blur-[1px] max-w-[90%] ml-1">
        <div
          className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold leading-tight break-words`}
          style={{ fontFamily: 'var(--font-hand-caveat)' }}
        >
          {title.trim() || 'Untitled NOTE BOOK'}
        </div>
        {description && (
          <div className="text-[10px] opacity-85 mt-1 line-clamp-2">{description}</div>
        )}
      </div>

      <div className="text-[10px] opacity-80 mb-1 capitalize pl-1">
        {bindingStyle} · {defaultPaperStyle}
      </div>
    </div>
  );
};

interface CreateNotebookModalProps {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    notebookType: NotebookType;
    journalYear: number;
    coverColor: string;
    coverMaterial: CoverMaterial;
    coverAccent: CoverAccent;
    bindingStyle: BindingStyle;
    defaultPaperStyle: PaperStyle;
  }) => void;
}

export const CreateNotebookModal: React.FC<CreateNotebookModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notebookType, setNotebookType] = useState<NotebookType>('daily');
  const [journalYear, setJournalYear] = useState<number>(2026);
  const [coverColor, setCoverColor] = useState<string>('#EFE6D8');
  const [coverMaterial, setCoverMaterial] = useState<CoverMaterial>('linen');
  const [coverAccent] = useState<CoverAccent>('botanical');
  const [bindingStyle, setBindingStyle] = useState<BindingStyle>('spiral');
  const [defaultPaperStyle, setDefaultPaperStyle] = useState<PaperStyle>('ruled');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a title for your notebook.');
      return;
    }
    onCreate({
      title: trimmed,
      description: description.trim(),
      notebookType,
      journalYear,
      coverColor,
      coverMaterial,
      coverAccent,
      bindingStyle,
      defaultPaperStyle,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Create a New Physical Notebook"
        className="w-full max-w-2xl rounded-xl p-6 border my-auto"
        style={{
          backgroundColor: '#FAF6F0',
          borderColor: 'rgba(82, 64, 53, 0.25)',
          boxShadow: 'var(--shadow-lifted)',
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-stone-300/80">
          <div>
            <h2
              className="text-2xl font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Place a New Notebook on Your Desk
            </h2>
            <p className="text-xs text-stone-600">
              Choose its purpose, tactile cover texture, and physical binding
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Create Notebook Dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Form Inputs */}
          <div className="md:col-span-7 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                1. Notebook Title
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g., Morning Reflections 2027"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-900"
                />
              </label>
              {errorMsg && <p className="text-red-700 text-xs mt-1">{errorMsg}</p>}
            </div>

            <div>
              <span className="block font-semibold text-stone-800 mb-1.5">2. Notebook Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'daily', label: 'Daily Journal', sub: 'Date & Calendar' },
                    { id: 'free', label: 'Free Writing', sub: 'Unrestricted pages' },
                    { id: 'notes', label: 'Personal Notes', sub: 'Ideas & thoughts' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNotebookType(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      notebookType === t.id
                        ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                        : 'bg-white/80 text-stone-800 border-stone-300 hover:bg-stone-200/50'
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-[10px] opacity-80">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {notebookType === 'daily' && (
              <div>
                <label className="flex items-center justify-between font-semibold text-stone-800">
                  <span>Journal Calendar Year</span>
                  <select
                    value={journalYear}
                    onChange={(e) => setJournalYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div>
              <span className="block font-semibold text-stone-800 mb-1.5">
                3. Cover Color &amp; Textured Material
              </span>
              <div className="flex items-center gap-2.5 mb-2">
                {COVER_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    aria-label={sw.name}
                    title={sw.name}
                    onClick={() => setCoverColor(sw.hex)}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      coverColor === sw.hex
                        ? 'scale-115 ring-2 ring-stone-800'
                        : 'border-stone-400/60'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'linen', label: 'Woven Linen' },
                    { id: 'leather', label: 'Pebbled Leather' },
                    { id: 'kraft', label: 'Organic Kraft' },
                    { id: 'buckram', label: 'Library Buckram' },
                  ] as const
                ).map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setCoverMaterial(mat.id)}
                    className={`py-1.5 px-1 rounded border text-[11px] font-medium cursor-pointer ${
                      coverMaterial === mat.id
                        ? 'bg-stone-800 text-amber-50 border-stone-800'
                        : 'bg-white/70 text-stone-700 border-stone-300'
                    }`}
                  >
                    {mat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block font-semibold text-stone-800">
                <span>4. Physical Binding</span>
                <select
                  value={bindingStyle}
                  onChange={(e) => setBindingStyle(e.target.value as BindingStyle)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="spiral">Twin-Wire Spiral Rings</option>
                  <option value="stitched">Saddle-Stitched Threads</option>
                  <option value="hardcover">Raised-Cord Hardcover</option>
                  <option value="softcover">Elastic-Band Softcover</option>
                </select>
              </label>

              <label className="block font-semibold text-stone-800">
                <span>Paper Ruling</span>
                <select
                  value={defaultPaperStyle}
                  onChange={(e) => setDefaultPaperStyle(e.target.value as PaperStyle)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="ruled">Ruled Horizontal Lines</option>
                  <option value="dotted">Dotted Grid</option>
                  <option value="blank">Blank Unruled Paper</option>
                </select>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-stone-800">
                <span>5. Optional Cover Note</span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A quiet place for daily gratitude..."
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Live Physical Notebook Cover Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-between p-4 rounded-xl bg-[#EAE0D2]/70 border border-stone-300/70">
            <div className="my-auto py-2">
              <NotebookCoverPreviewCard
                title={title}
                description={description}
                notebookType={notebookType}
                journalYear={journalYear}
                coverColor={coverColor}
                coverMaterial={coverMaterial}
                bindingStyle={bindingStyle}
                defaultPaperStyle={defaultPaperStyle}
              />
            </div>

            <div className="w-full flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-200/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#524035] hover:bg-[#3f3128] text-[#FAF6F0] text-xs font-semibold cursor-pointer"
              >
                Create Notebook
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface NotebookSettingsModalProps {
  notebook: Notebook;
  onClose: () => void;
  onSaveNotebook: (patch: Partial<Notebook>) => void;
  onToggleArchive: () => void;
  onDeleteNotebook: () => void;
}

export const NotebookSettingsModal: React.FC<NotebookSettingsModalProps> = ({
  notebook,
  onClose,
  onSaveNotebook,
  onToggleArchive,
  onDeleteNotebook,
}) => {
  const [title, setTitle] = useState(notebook.title);
  const [description, setDescription] = useState(notebook.description);
  const [coverColor, setCoverColor] = useState(notebook.coverColor);
  const [coverMaterial, setCoverMaterial] = useState<CoverMaterial>(notebook.coverMaterial);
  const [coverAccent, setCoverAccent] = useState<CoverAccent>(notebook.coverAccent);
  const [bindingStyle, setBindingStyle] = useState<BindingStyle>(notebook.bindingStyle);
  const [defaultPaperStyle, setDefaultPaperStyle] = useState<PaperStyle>(
    notebook.defaultPaperStyle,
  );
  const [defaultFontFamily, setDefaultFontFamily] = useState(notebook.defaultFontFamily);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Individual Notebook Settings"
        className="w-full max-w-2xl rounded-xl p-6 border my-auto"
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
              Notebook Customization
            </h2>
            <p className="text-xs text-stone-600">
              Applies only to &ldquo;{notebook.title}&rdquo;
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Notebook Settings"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 space-y-4 text-xs">
            <label className="block font-semibold text-stone-800">
              <span>Notebook Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-900"
              />
            </label>

            <label className="block font-semibold text-stone-800">
              <span>Cover Subtitle / Note</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
              />
            </label>

            <div>
              <span className="block font-semibold text-stone-800 mb-1.5">Cover Color</span>
              <div className="flex items-center gap-2.5">
                {COVER_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    aria-label={sw.name}
                    onClick={() => setCoverColor(sw.hex)}
                    className={`w-6 h-6 rounded-full border cursor-pointer ${
                      coverColor === sw.hex ? 'scale-115 ring-2 ring-stone-800' : 'border-stone-400'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block font-semibold text-stone-800">
                <span>Physical Binding Style</span>
                <select
                  value={bindingStyle}
                  onChange={(e) => setBindingStyle(e.target.value as BindingStyle)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="spiral">Twin-Wire Spiral Rings</option>
                  <option value="stitched">Saddle-Stitched Spine</option>
                  <option value="hardcover">Raised-Cord Hardcover</option>
                  <option value="softcover">Elastic-Band Softcover</option>
                </select>
              </label>

              <label className="block font-semibold text-stone-800">
                <span>Cover Material Texture</span>
                <select
                  value={coverMaterial}
                  onChange={(e) => setCoverMaterial(e.target.value as CoverMaterial)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="linen">Woven Crosshatch Linen</option>
                  <option value="leather">Pebbled Stitched Leather</option>
                  <option value="kraft">Organic Speckled Kraft</option>
                  <option value="buckram">Library Cornered Buckram</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block font-semibold text-stone-800">
                <span>Cover Motif</span>
                <select
                  value={coverAccent}
                  onChange={(e) => setCoverAccent(e.target.value as CoverAccent)}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="botanical">Botanical Plant</option>
                  <option value="minimal-frame">Minimal Frame</option>
                  <option value="celestial">Celestial Moon</option>
                  <option value="monogram">Initial Monogram</option>
                  <option value="none">Plain Unadorned</option>
                </select>
              </label>

              <label className="block font-semibold text-stone-800">
                <span>Default Paper</span>
                <select
                  value={defaultPaperStyle}
                  onChange={(e) => setDefaultPaperStyle(e.target.value as PaperStyle)}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="ruled">Ruled Lines</option>
                  <option value="dotted">Dotted Grid</option>
                  <option value="blank">Blank Paper</option>
                </select>
              </label>

              <label className="block font-semibold text-stone-800">
                <span>Default Font</span>
                <select
                  value={defaultFontFamily}
                  onChange={(e) => setDefaultFontFamily(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <optgroup label="English Handwriting Fonts">
                    <option value="Caveat">Caveat (Cursive)</option>
                    <option value="Kalam">Kalam (Casual)</option>
                    <option value="Patrick Hand">Patrick Hand (Neat)</option>
                    <option value="Dancing Script">Dancing Script (Artistic)</option>
                    <option value="Indie Flower">Indie Flower (Doodle)</option>
                  </optgroup>
                  <optgroup label="বাংলা ফন্ট (Bangla Fonts)">
                    <option value="Atma">Atma · আত্মা (হস্তলিপি)</option>
                    <option value="Galada">Galada · গালাদা (কুরসিভ)</option>
                    <option value="Hind Siliguri">Hind Siliguri · শিলিগুড়ি (মডার্ন)</option>
                    <option value="Anek Bangla">Anek Bangla · অনেক বাংলা</option>
                    <option value="Noto Serif Bengali">Noto Serif · সেরিফ (বই)</option>
                  </optgroup>
                </select>
              </label>
            </div>
          </div>

          {/* Right Live Tactile Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#EAE0D2]/70 border border-stone-300/70">
            <NotebookCoverPreviewCard
              title={title}
              description={description}
              notebookType={notebook.notebookType}
              journalYear={notebook.journalYear || 2026}
              coverColor={coverColor}
              coverMaterial={coverMaterial}
              bindingStyle={bindingStyle}
              defaultPaperStyle={defaultPaperStyle}
              compact
            />
            <span className="text-[11px] text-stone-600 mt-3">
              Live Binding &amp; Texture Preview
            </span>
          </div>
        </div>

        {/* Archive to Bookshelf or Delete Notebook */}
        <div className="mt-5 pt-3 border-t border-stone-300/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={onToggleArchive}
            className="px-3 py-1.5 rounded-lg border border-stone-400/70 hover:bg-stone-200/60 text-stone-800 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            {notebook.archived ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>Restore to Writing Desk</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Move to Archive Bookshelf</span>
              </>
            )}
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-lg text-red-700 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Book</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onDeleteNotebook}
                className="px-2.5 py-1 rounded bg-red-700 text-white font-semibold cursor-pointer"
              >
                Confirm Permanent Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded border border-stone-300 text-stone-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-stone-300/80 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-200/60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveNotebook({
                title: title.trim() || notebook.title,
                description: description.trim(),
                coverColor,
                coverMaterial,
                coverAccent,
                bindingStyle,
                defaultPaperStyle,
                defaultFontFamily,
              });
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-[#524035] hover:bg-[#3f3128] text-[#FAF6F0] font-semibold cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

interface AppSettingsModalProps {
  profile: UserProfile;
  userEmail: string | null;
  syncStatus: SyncStatus;
  initialTab?: 'appearance' | 'room' | 'account' | 'sound';
  onClose: () => void;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  profile,
  userEmail,
  syncStatus,
  initialTab = 'appearance',
  onClose,
  onUpdateProfile,
  onSignInWithGoogle,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'room' | 'account' | 'sound'>(
    initialTab,
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Application and Study Room Settings"
        className="w-full max-w-3xl rounded-2xl border overflow-hidden flex flex-col md:flex-row my-auto"
        style={{
          backgroundColor: '#FAF6F0',
          borderColor: 'rgba(82, 64, 53, 0.25)',
          boxShadow: 'var(--shadow-lifted)',
          minHeight: '440px',
        }}
      >
        {/* Left Sidebar matching the reference Settings screen */}
        <aside className="w-full md:w-52 p-5 bg-[#EFE6D8] border-b md:border-b-0 md:border-r border-stone-300/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-stone-900">Settings</h2>
            </div>

            <nav className="grid grid-cols-2 md:grid-cols-1 gap-1.5 text-xs">
              {(
                [
                  { id: 'appearance', label: 'Appearance', icon: Palette },
                  { id: 'room', label: 'Study Sanctuary', icon: RotateCcw },
                  { id: 'sound', label: 'Sounds & Motion', icon: Volume2 },
                  { id: 'account', label: 'Account & Profile', icon: UserIcon },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 font-medium transition-colors cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-[#DECBB6] text-stone-900'
                        : 'text-stone-700 hover:bg-stone-300/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2 rounded-lg border border-stone-400/60 text-xs font-medium text-stone-800 hover:bg-stone-300/40 cursor-pointer hidden md:block"
          >
            Done
          </button>
        </aside>

        {/* Main Settings Content Panel */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              <div className="sm:col-span-7 space-y-4 text-xs">
                <h3 className="text-base font-semibold text-stone-900">
                  Customize Your Journal Defaults
                </h3>

                <div>
                  <span className="block text-stone-700 font-medium mb-1.5">Default Pen Color</span>
                  <div className="flex items-center gap-2">
                    {[
                      '#2C2623',
                      '#3B4D7A',
                      '#5B3E85',
                      '#48704C',
                      '#C76574',
                      '#9C3D35',
                      '#C9822B',
                    ].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Default pen color ${hex}`}
                        onClick={() => onUpdateProfile({ defaultPenColor: hex })}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                          profile.defaultPenColor === hex
                            ? 'scale-115 ring-2 ring-stone-800'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-stone-700 font-medium mb-1.5">Default Page Color</span>
                  <div className="flex items-center gap-2">
                    {PAGE_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        aria-label={sw.name}
                        title={sw.name}
                        onClick={() => onUpdateProfile({ defaultPageColor: sw.hex })}
                        className={`w-8 h-8 rounded-lg border cursor-pointer ${
                          profile.defaultPageColor === sw.hex
                            ? 'ring-2 ring-stone-800 border-stone-800'
                            : 'border-stone-300'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-stone-700 font-medium mb-1">
                    English Handwriting Fonts
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {['Caveat', 'Kalam', 'Patrick Hand', 'Dancing Script', 'Indie Flower'].map(
                      (fn) => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => onUpdateProfile({ defaultFontFamily: fn })}
                          style={{ fontFamily: `"${fn}", cursive`, fontSize: '15px' }}
                          className={`py-1.5 px-2 rounded-lg border text-center cursor-pointer ${
                            profile.defaultFontFamily === fn
                              ? 'bg-stone-800 text-amber-50 border-stone-800'
                              : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          Aa · {fn.split(' ')[0]}
                        </button>
                      ),
                    )}
                  </div>

                  <span className="block text-stone-700 font-medium mb-1">
                    বাংলা ফন্ট (Bangla Fonts)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { name: 'Atma', label: 'আত্মা' },
                      { name: 'Galada', label: 'গালাদা' },
                      { name: 'Hind Siliguri', label: 'শিলিগুড়ি' },
                      { name: 'Anek Bangla', label: 'অনেক' },
                      { name: 'Noto Serif Bengali', label: 'সেরিফ' },
                    ].map((bf) => (
                      <button
                        key={bf.name}
                        type="button"
                        onClick={() => onUpdateProfile({ defaultFontFamily: bf.name })}
                        style={{ fontFamily: `"${bf.name}", 'Atma', 'Galada', cursive, sans-serif`, fontSize: '15px' }}
                        className={`py-1.5 px-2 rounded-lg border text-center cursor-pointer ${
                          profile.defaultFontFamily === bf.name
                            ? 'bg-stone-800 text-amber-50 border-stone-800'
                            : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        অ · {bf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Taped Paper Note Preview Card matching the reference image */}
              <div className="sm:col-span-5 flex justify-center pt-2">
                <div
                  className="relative w-48 h-56 rounded-lg p-5 flex flex-col justify-between items-center text-center paper-ruled border border-stone-300/80"
                  style={{
                    backgroundColor: profile.defaultPageColor || '#FAF6F0',
                    boxShadow: 'var(--shadow-book)',
                  }}
                >
                  <div
                    className="absolute -top-3 right-6 w-14 h-5 rotate-6"
                    style={{ backgroundColor: '#E6D6BA', opacity: 0.85 }}
                  />
                  <p
                    className="mt-4 leading-snug"
                    style={{
                      fontFamily: `"${profile.defaultFontFamily || 'Caveat'}", 'Atma', 'Galada', 'Hind Siliguri', cursive, sans-serif`,
                      fontSize: '24px',
                      color: profile.defaultPenColor || '#2C2623',
                    }}
                  >
                    {['Atma', 'Galada', 'Hind Siliguri', 'Anek Bangla', 'Noto Serif Bengali'].includes(profile.defaultFontFamily) ? (
                      <>
                        আমার নোটবুক,
                        <br />
                        আমার অনুভূতি ♡
                      </>
                    ) : (
                      <>
                        Your journal,
                        <br />
                        your style ♡
                      </>
                    )}
                  </p>
                  <span className="text-[11px] text-stone-400">Live Paper Preview</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'room' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-base font-semibold text-stone-900 mb-1">
                  Study Sanctuary &amp; Surfaces
                </h3>
                <p className="text-stone-600">
                  Customize your writing table surface, archive bookshelf finish, and room atmosphere.
                </p>
              </div>

              <div>
                <span className="block font-semibold text-stone-800 mb-2">Writing Table Style</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'oak', label: 'Natural Oak Desk', sub: 'Warm honey grain' },
                      { id: 'walnut', label: 'Dark Polished Walnut', sub: 'Rich heirloom finish' },
                      { id: 'modern', label: 'Minimal Modern Table', sub: 'Light ash & brass' },
                    ] as const
                  ).map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => onUpdateProfile({ tableStyle: tb.id as TableStyle })}
                      className={`p-3 rounded-xl border text-left cursor-pointer ${
                        profile.tableStyle === tb.id
                          ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                          : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-200/50'
                      }`}
                    >
                      <div className="font-semibold">{tb.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{tb.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block font-semibold text-stone-800 mb-2">
                  Archive Bookshelf Style
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'classic', label: 'Classic Wooden', sub: 'Traditional study shelves' },
                      { id: 'dark', label: 'Dark Traditional', sub: 'Deep walnut library' },
                      { id: 'minimal', label: 'Minimal Elegant', sub: 'Light architectural birch' },
                    ] as const
                  ).map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() => onUpdateProfile({ bookshelfStyle: bs.id as BookshelfStyle })}
                      className={`p-3 rounded-xl border text-left cursor-pointer ${
                        profile.bookshelfStyle === bs.id
                          ? 'bg-[#524035] text-[#FAF6F0] border-[#524035]'
                          : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-200/50'
                      }`}
                    >
                      <div className="font-semibold">{bs.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{bs.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block font-semibold text-stone-800 mb-2">
                  Study Atmosphere
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'warm-ivory', label: 'Warm Morning Light' },
                      { id: 'soft-sage', label: 'Botanical Sage Study' },
                      { id: 'evening-study', label: 'Quiet Evening Lamp' },
                    ] as const
                  ).map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => onUpdateProfile({ theme: th.id as ThemeStyle })}
                      className={`py-2.5 px-3 rounded-lg border font-medium cursor-pointer ${
                        profile.theme === th.id
                          ? 'bg-stone-800 text-amber-50 border-stone-800'
                          : 'bg-white text-stone-800 border-stone-300'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-base font-semibold text-stone-900 mb-1">
                  Natural Sounds &amp; Motion Preferences
                </h3>
                <p className="text-stone-600">
                  Control subtle paper page-turn sounds and gentle transitions.
                </p>
              </div>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-stone-300 cursor-pointer">
                <div>
                  <div className="font-semibold text-stone-900">Physical Paper &amp; Pen Sounds</div>
                  <div className="text-stone-500">
                    Subtle rustle when turning pages, opening covers, or placing photos
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.soundEnabled}
                  onChange={(e) => onUpdateProfile({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-stone-800"
                />
              </label>

              <label className="block p-3.5 rounded-xl bg-white border border-stone-300">
                <div className="flex justify-between font-semibold text-stone-900 mb-2">
                  <span>Sound Volume</span>
                  <span>{Math.round(profile.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={profile.soundVolume}
                  onChange={(e) => onUpdateProfile({ soundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-stone-800 cursor-pointer"
                />
              </label>

              <div>
                <span className="block font-semibold text-stone-800 mb-2">
                  Animation &amp; Reduced-Motion Mode
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'full', label: 'Gentle Transitions', sub: 'Calm paper fade' },
                      { id: 'reduced', label: 'Reduced Motion', sub: 'Minimal transitions' },
                      { id: 'none', label: 'Instant (No Motion)', sub: 'Zero transition delay' },
                    ] as const
                  ).map((am) => (
                    <button
                      key={am.id}
                      type="button"
                      onClick={() => onUpdateProfile({ animationMode: am.id as AnimationMode })}
                      className={`p-3 rounded-xl border text-left cursor-pointer ${
                        profile.animationMode === am.id
                          ? 'bg-stone-800 text-amber-50 border-stone-800'
                          : 'bg-white text-stone-800 border-stone-300'
                      }`}
                    >
                      <div className="font-semibold">{am.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{am.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-5 text-xs">
              <div>
                <h3 className="text-base font-semibold text-stone-900 mb-1">
                  Writer Profile &amp; Google Cloud Synchronization
                </h3>
                <p className="text-stone-600">
                  Sign in with Google to synchronize your notebooks, photographs, and reading room
                  across devices.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-stone-300 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#524035] text-[#FAF6F0] flex items-center justify-center font-semibold text-sm shrink-0">
                    {(userEmail || profile.displayName || 'D')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">
                      {userEmail ? profile.displayName : 'Local Reading Room (Guest Writer)'}
                    </div>
                    <div className="text-stone-500">
                      {userEmail || 'Sign in with Google to back up & sync across devices'}
                    </div>
                  </div>
                </div>

                {userEmail ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignInWithGoogle}
                    className="px-4 py-2 rounded-lg bg-[#524035] hover:bg-[#3f3128] text-[#FAF6F0] font-semibold cursor-pointer"
                  >
                    Sign In with Google
                  </button>
                )}
              </div>

              <label className="block p-3.5 rounded-xl bg-white border border-stone-300">
                <span className="block font-semibold text-stone-800 mb-1">Writer Display Name</span>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => onUpdateProfile({ displayName: e.target.value })}
                  placeholder="Your name on bookplates..."
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900"
                />
              </label>

              <div className="p-4 rounded-xl bg-white/70 border border-stone-300/80 flex items-center gap-3">
                <Cloud className="w-5 h-5 text-stone-700 shrink-0" />
                <div>
                  <div className="font-semibold text-stone-800">
                    Synchronization Status: <span className="capitalize">{syncStatus}</span>
                  </div>
                  <div className="text-stone-600 mt-0.5">
                    NOTE BOOK automatically saves every paragraph, stylus stroke, photograph position,
                    and bookmark ribbon as you write.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 mt-4 border-t border-stone-300/70 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                onUpdateProfile({
                  tableStyle: 'oak',
                  bookshelfStyle: 'classic',
                  theme: 'warm-ivory',
                  defaultPenColor: '#2C2623',
                  defaultPageColor: '#FAF6F0',
                  defaultFontFamily: 'Caveat',
                })
              }
              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600 hover:bg-stone-200/50 cursor-pointer"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#524035] hover:bg-[#3f3128] text-[#FAF6F0] text-xs font-semibold cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
