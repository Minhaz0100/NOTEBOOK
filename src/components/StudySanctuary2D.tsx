import React from 'react';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Calendar,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import type {
  BookshelfStyle,
  CoverAccent,
  CoverMaterial,
  Notebook,
  StudyViewMode,
  TableStyle,
  ThemeStyle,
} from '../types/journal';

interface StudySanctuary2DProps {
  viewMode: StudyViewMode;
  notebooks: Notebook[];
  tableStyle: TableStyle;
  bookshelfStyle: BookshelfStyle;
  theme: ThemeStyle;
  selectedArchivedId: string | null;
  onSelectViewMode: (mode: StudyViewMode) => void;
  onOpenNotebook: (notebookId: string) => void;
  onCustomizeNotebook: (notebookId: string) => void;
  onToggleArchiveNotebook: (notebookId: string, archived: boolean) => void;
  onSelectArchivedNotebook: (notebookId: string | null) => void;
  onCreateNotebookClick: () => void;
  onClearSamples?: () => void;
}

function getCoverTextureCSS(coverColor: string, material: CoverMaterial): React.CSSProperties {
  if (material === 'linen') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px),
        repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 4px)
      `,
    };
  }
  if (material === 'leather') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        radial-gradient(circle at 24% 22%, rgba(255,255,255,0.12) 0%, transparent 48%),
        radial-gradient(circle at 80% 78%, rgba(0,0,0,0.22) 0%, transparent 55%)
      `,
    };
  }
  if (material === 'kraft') {
    return {
      backgroundColor: coverColor,
      backgroundImage: `
        repeating-linear-gradient(28deg, rgba(82,60,40,0.06) 0px, rgba(82,60,40,0.06) 2px, transparent 2px, transparent 8px),
        repeating-linear-gradient(-35deg, rgba(255,250,240,0.07) 0px, rgba(255,250,240,0.07) 1px, transparent 1px, transparent 6px)
      `,
    };
  }
  return {
    backgroundColor: coverColor,
    backgroundImage: `
      repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 5px),
      repeating-linear-gradient(-45deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 5px)
    `,
  };
}

function CoverMotifIcon({ accent, title }: { accent: CoverAccent; title: string }) {
  if (accent === 'botanical') {
    return (
      <svg
        className="w-7 h-7 opacity-75"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 27V7" />
        <path d="M16 11C11 11 9 7 9 7C9 7 13 6 16 11Z" />
        <path d="M16 16C21 16 23 12 23 12C23 12 19 11 16 16Z" />
        <path d="M16 21C11 21 8 17 8 17C8 17 12 16 16 21Z" />
      </svg>
    );
  }
  if (accent === 'celestial') {
    return (
      <svg
        className="w-6 h-6 opacity-75"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M18.5 19.5A7.5 7.5 0 0 1 11 7a7.5 7.5 0 1 0 9.5 9.5 6.5 6.5 0 0 1-2 3Z" />
        <circle cx="20" cy="8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (accent === 'monogram') {
    const initial = (title.trim()[0] || 'D').toUpperCase();
    return (
      <span
        className="w-7 h-7 rounded-full border border-current/40 flex items-center justify-center text-xs font-serif font-semibold opacity-85"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {initial}
      </span>
    );
  }
  if (accent === 'minimal-frame') {
    return <span className="w-8 h-0.5 bg-current/40 rounded-full block" />;
  }
  return null;
}

export const StudySanctuary2D: React.FC<StudySanctuary2DProps> = ({
  viewMode,
  notebooks,
  tableStyle,
  bookshelfStyle,
  theme,
  onSelectViewMode,
  onOpenNotebook,
  onCustomizeNotebook,
  onToggleArchiveNotebook,
  onCreateNotebookClick,
  onClearSamples,
}) => {
  const activeNotebooks = notebooks.filter((n) => !n.archived);
  const archivedNotebooks = notebooks.filter((n) => n.archived);
  const hasSamples = notebooks.some((n) => n.isSample);

  const isEvening = theme === 'evening-study';
  const isSage = theme === 'soft-sage';

  // Background atmosphere colors
  const roomBackdrop = isEvening
    ? '#1E1A17'
    : isSage
      ? '#E9EFE7'
      : '#F4EFE6';

  // Desk surface finish based on tableStyle
  const deskSurfaceStyle: React.CSSProperties =
    tableStyle === 'walnut'
      ? {
          backgroundColor: isEvening ? '#2E231C' : '#dfd2c3',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(72, 50, 35, 0.04) 0px, rgba(72, 50, 35, 0.04) 2px, transparent 2px, transparent 14px)',
          borderColor: isEvening ? 'rgba(255,245,235,0.12)' : 'rgba(82,64,53,0.22)',
        }
      : tableStyle === 'modern'
        ? {
            backgroundColor: isEvening ? '#262422' : '#EFECE6',
            borderColor: isEvening ? 'rgba(255,255,255,0.12)' : 'rgba(82,64,53,0.16)',
          }
        : {
            backgroundColor: isEvening ? '#332922' : '#EAE0D2',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(120, 88, 58, 0.035) 0px, rgba(120, 88, 58, 0.035) 1px, transparent 1px, transparent 10px)',
            borderColor: isEvening ? 'rgba(255,245,235,0.14)' : 'rgba(82,64,53,0.18)',
          };

  // Bookshelf surface finish based on bookshelfStyle
  const shelfWoodColor =
    bookshelfStyle === 'dark'
      ? isEvening
        ? '#281F19'
        : '#5A4334'
      : bookshelfStyle === 'minimal'
        ? isEvening
          ? '#35312D'
          : '#D9CDBF'
        : isEvening
          ? '#32261E'
          : '#7B5E48';

  const showDeskSection = viewMode === 'desk' || viewMode === 'room';
  const showShelfSection = viewMode === 'bookshelf' || viewMode === 'room';

  return (
    <div
      className="w-full h-full overflow-y-auto pt-16 pb-12 px-4 sm:px-8 transition-colors duration-200"
      style={{
        backgroundColor: roomBackdrop,
        color: isEvening ? '#F5EFE6' : '#2C241E',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Minimal Sanctuary Header */}
        <section
          className="pt-2 flex items-center justify-between gap-4 border-b pb-4"
          style={{
            borderColor: isEvening ? 'rgba(255,245,235,0.12)' : 'rgba(82,64,53,0.14)',
          }}
        >
          <h1
            className="text-2xl sm:text-3xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {viewMode === 'desk'
              ? 'Writing Table'
              : viewMode === 'bookshelf'
                ? 'Bookshelf'
                : 'Study'}
          </h1>

          <div className="flex items-center gap-3">
            {hasSamples && onClearSamples && (
              <button
                type="button"
                onClick={onClearSamples}
                title="Clear sample notebooks"
                aria-label="Clear sample notebooks"
                className="p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer opacity-75 hover:opacity-100"
                style={{
                  borderColor: isEvening ? 'rgba(255,255,255,0.18)' : 'rgba(82,64,53,0.22)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quiet 2D Ceramic Tea Cup Illustration (No Text) */}
            <div
              className="hidden sm:flex items-center justify-center px-2.5 py-1.5 rounded-xl border select-none"
              style={{
                backgroundColor: isEvening ? 'rgba(255,255,255,0.04)' : 'rgba(250,246,240,0.75)',
                borderColor: isEvening ? 'rgba(255,255,255,0.1)' : 'rgba(82,64,53,0.14)',
              }}
              aria-hidden="true"
            >
              <svg className="w-6 h-6 text-amber-800/80" viewBox="0 0 36 36" fill="none">
                <path
                  d="M14 9C14 7 16 6 16 4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                <path
                  d="M20 10C20 8 22 7 22 5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                <ellipse cx="18" cy="28" rx="11" ry="2.5" fill="rgba(166,124,88,0.22)" />
                <path
                  d="M10 14H25V21C25 24.866 21.866 28 18 28H17C13.134 28 10 24.866 10 21V14Z"
                  fill="#FAF6F0"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M25 16H27.5C29.1569 16 30.5 17.3431 30.5 19C30.5 20.6569 29.1569 22 27.5 22H25"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* SECTION 1: 2D Tactile Writing Table */}
        {showDeskSection && (
          <section aria-label="Writing Table" className="space-y-3">
            {viewMode === 'room' && (
              <h2
                className="text-lg font-semibold opacity-85"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Table
              </h2>
            )}

            {/* Physical 2D Desk Mat Surface */}
            <div
              className="relative rounded-2xl border p-6 sm:p-8 transition-colors"
              style={{
                ...deskSurfaceStyle,
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              {/* Decorative 2D Fountain Pen on Desk Mat */}
              <div
                aria-hidden="true"
                className="pointer-events-none hidden lg:flex items-center gap-3 absolute top-4 right-6 opacity-60"
              >
                <div className="flex items-center">
                  <div className="w-24 h-2.5 rounded-l-full bg-[#3A281E] border border-black/20" />
                  <div className="w-3 h-2.5 bg-[#C8A464]" />
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[8px] border-l-[#C8A464]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {activeNotebooks.map((nb) => {
                  const isLightCover = nb.coverColor === '#EFE6D8' || nb.coverColor === '#C79B98';
                  const coverTextColor = isLightCover ? '#2C241E' : '#FAF6F0';
                  const stackLayers = Math.min(8, Math.max(3, Math.ceil((nb.pageCount || 1) / 2)));

                  return (
                    <article
                      key={nb.id}
                      className="group relative flex flex-col items-center"
                    >
                      {/* Physical 2D Notebook Cover Object */}
                      <div className="relative w-full max-w-[250px] aspect-[210/285] transition-transform duration-200 group-hover:-translate-y-1.5">
                        {/* Stacked Paper Edges Behind Cover */}
                        <div
                          className="absolute inset-0 rounded-r-xl rounded-l-sm bg-[#FAF6F0] border border-stone-400/50"
                          style={{
                            transform: `translate(${stackLayers}px, ${Math.ceil(stackLayers * 0.7)}px)`,
                            boxShadow: 'var(--shadow-book)',
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-r-xl rounded-l-sm bg-[#F3ECE0] border border-stone-400/40"
                          style={{
                            transform: `translate(${Math.ceil(stackLayers * 0.5)}px, ${Math.ceil(stackLayers * 0.35)}px)`,
                          }}
                        />

                        {/* Bookmark Ribbon Tail Peeking from Bottom of Book */}
                        {nb.bookmarkIds && nb.bookmarkIds.length > 0 && (
                          <div
                            className="absolute -bottom-3.5 right-8 w-4 h-6 z-0 shadow-xs"
                            style={{
                              backgroundColor: '#B85D57',
                              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                            }}
                          />
                        )}

                        {/* Main Clickable Front Cover Board */}
                        <button
                          type="button"
                          onClick={() => onOpenNotebook(nb.id)}
                          aria-label={`Open ${nb.title}`}
                          className="relative z-10 w-full h-full rounded-r-xl rounded-l-xs p-5 flex flex-col justify-between text-center border transition-shadow cursor-pointer focus:outline-none"
                          style={{
                            ...getCoverTextureCSS(nb.coverColor, nb.coverMaterial),
                            color: coverTextColor,
                            borderColor: 'rgba(35, 25, 18, 0.25)',
                          }}
                        >
                          {/* Leather Stitched Perimeter Trim */}
                          {nb.coverMaterial === 'leather' && (
                            <div
                              className="absolute inset-2.5 rounded-r-lg rounded-l-xs pointer-events-none"
                              style={{
                                border: `1.5px dashed ${
                                  isLightCover ? 'rgba(82,64,53,0.38)' : 'rgba(250,240,225,0.42)'
                                }`,
                              }}
                            />
                          )}

                          {/* Library Buckram Brass Corners */}
                          {nb.coverMaterial === 'buckram' && (
                            <>
                              <div
                                className="absolute top-0 right-0 w-5 h-5 rounded-tr-xl pointer-events-none"
                                style={{
                                  background:
                                    'linear-gradient(225deg, #C8A25A 50%, transparent 52%)',
                                }}
                              />
                              <div
                                className="absolute bottom-0 right-0 w-5 h-5 rounded-br-xl pointer-events-none"
                                style={{
                                  background:
                                    'linear-gradient(315deg, #C8A25A 50%, transparent 52%)',
                                }}
                              />
                            </>
                          )}

                          {/* Left Spine Physical Binding Detail */}
                          {nb.bindingStyle === 'spiral' && (
                            <div
                              aria-hidden="true"
                              className="absolute -left-2.5 top-4 bottom-4 flex flex-col justify-between pointer-events-none"
                            >
                              {Array.from({ length: 10 }).map((_, idx) => (
                                <div key={idx} className="flex items-center">
                                  <span
                                    className="w-4 h-1.5 rounded-full block shadow-2xs"
                                    style={{
                                      background:
                                        'linear-gradient(90deg, #6E5536, #DFC89C, #5E472B)',
                                    }}
                                  />
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-900/80 -ml-1 block" />
                                </div>
                              ))}
                            </div>
                          )}

                          {nb.bindingStyle === 'stitched' && (
                            <div
                              aria-hidden="true"
                              className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/20 rounded-l-xs flex flex-col justify-evenly items-center pointer-events-none"
                            >
                              {Array.from({ length: 6 }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className="w-2.5 h-0.5 bg-[#FAF6F0]/85 rounded-full block"
                                />
                              ))}
                            </div>
                          )}

                          {nb.bindingStyle === 'hardcover' && (
                            <div
                              aria-hidden="true"
                              className="absolute left-0 top-0 bottom-0 w-4 bg-black/28 rounded-l-xs border-r border-black/25 flex flex-col justify-evenly items-center pointer-events-none"
                            >
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className="w-full h-1.5 bg-gradient-to-b from-white/20 to-black/40 block"
                                />
                              ))}
                            </div>
                          )}

                          {nb.bindingStyle === 'softcover' && (
                            <>
                              <div
                                aria-hidden="true"
                                className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 rounded-l-xs pointer-events-none"
                              />
                              <div
                                aria-hidden="true"
                                className="absolute top-0 bottom-0 right-4 w-2.5 pointer-events-none"
                                style={{
                                  backgroundColor: isLightCover
                                    ? 'rgba(58, 46, 39, 0.78)'
                                    : 'rgba(28, 22, 18, 0.82)',
                                }}
                              />
                            </>
                          )}

                          {/* Top Cover Kicker */}
                          <div className="w-full pl-2 flex items-center justify-between text-[11px] opacity-80">
                            <span className="capitalize">{nb.notebookType}</span>
                            <span>
                              {nb.notebookType === 'daily' ? nb.journalYear : `${nb.pageCount}p`}
                            </span>
                          </div>

                          {/* Center Paper Bookplate Label */}
                          <div
                            className="mx-auto w-[88%] px-3.5 py-3 rounded-lg border flex flex-col items-center gap-1.5"
                            style={{
                              backgroundColor: isLightCover
                                ? 'rgba(255, 252, 247, 0.86)'
                                : 'rgba(250, 246, 240, 0.94)',
                              borderColor: 'rgba(82, 64, 53, 0.22)',
                              color: '#2C241E',
                            }}
                          >
                            <CoverMotifIcon accent={nb.coverAccent} title={nb.title} />
                            <h3
                              className="text-xl font-semibold leading-tight line-clamp-2"
                              style={{ fontFamily: `"${nb.defaultFontFamily || 'Caveat'}", 'Atma', 'Galada', 'Hind Siliguri', cursive, sans-serif` }}
                            >
                              {nb.title}
                            </h3>
                          </div>

                          {/* Bottom Cover Metadata */}
                          <div className="w-full pl-2 text-[11px] opacity-85 flex items-center justify-center gap-1.5">
                            <span className="capitalize">{nb.coverMaterial}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{nb.defaultPaperStyle}</span>
                          </div>
                        </button>
                      </div>

                      {/* Minimal Icon Bar Under Each Notebook */}
                      <div className="mt-3 flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => onCustomizeNotebook(nb.id)}
                          aria-label={`Settings for ${nb.title}`}
                          title="Settings"
                          className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleArchiveNotebook(nb.id, true)}
                          aria-label={`Archive ${nb.title}`}
                          title="Archive"
                          className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Clean 2D New Notebook Slot */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={onCreateNotebookClick}
                    aria-label="New Notebook"
                    className="w-full max-w-[250px] aspect-[210/285] rounded-r-xl rounded-l-xs border-2 border-dashed flex flex-col items-center justify-center gap-2.5 p-6 text-center transition-colors cursor-pointer hover:bg-black/[0.03]"
                    style={{
                      borderColor: isEvening ? 'rgba(255,245,235,0.22)' : 'rgba(82,64,53,0.28)',
                    }}
                  >
                    <span className="w-10 h-10 rounded-full bg-[#524035] text-[#FAF6F0] flex items-center justify-center shadow-xs">
                      <Plus className="w-5 h-5" />
                    </span>
                    <span
                      className="text-lg font-semibold"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      New Notebook
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: 2D Archive Bookshelf */}
        {showShelfSection && (
          <section aria-label="Bookshelf" className="space-y-3">
            {viewMode === 'room' && (
              <h2
                className="text-lg font-semibold opacity-85 pt-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Shelf
              </h2>
            )}

            <div
              className="rounded-2xl border p-6 sm:p-8 space-y-6"
              style={{
                backgroundColor: isEvening ? '#27211C' : '#EFE7DA',
                borderColor: isEvening ? 'rgba(255,245,235,0.12)' : 'rgba(82,64,53,0.2)',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              {archivedNotebooks.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p
                    className="text-xl opacity-75"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    No archived notebooks
                  </p>
                  {viewMode === 'bookshelf' && (
                    <button
                      type="button"
                      onClick={() => onSelectViewMode('desk')}
                      className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#524035] text-[#FAF6F0] text-xs font-medium cursor-pointer"
                    >
                      Table
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <div className="flex flex-wrap items-end gap-5 px-4">
                    {archivedNotebooks.map((nb) => {
                      const isLightCover =
                        nb.coverColor === '#EFE6D8' || nb.coverColor === '#C79B98';
                      const textColor = isLightCover ? '#2C241E' : '#FAF6F0';

                      return (
                        <div
                          key={nb.id}
                          className="group flex flex-col items-center"
                        >
                          <div
                            className="w-48 rounded-t-lg rounded-b-xs p-4 border flex flex-col justify-between transition-transform group-hover:-translate-y-1"
                            style={{
                              ...getCoverTextureCSS(nb.coverColor, nb.coverMaterial),
                              color: textColor,
                              borderColor: 'rgba(35, 25, 18, 0.28)',
                              minHeight: '200px',
                              boxShadow: 'var(--shadow-book)',
                            }}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-80">
                              <span className="capitalize">{nb.bindingStyle}</span>
                              <span>{nb.pageCount}p</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenNotebook(nb.id)}
                              className="my-2 px-2.5 py-2 rounded bg-white/90 text-[#2C241E] text-center cursor-pointer"
                            >
                              <div
                                className="text-xl font-semibold leading-tight truncate"
                                style={{
                                  fontFamily: `"${nb.defaultFontFamily || 'Caveat'}", 'Atma', 'Galada', 'Hind Siliguri', cursive, sans-serif`,
                                }}
                              >
                                {nb.title}
                              </div>
                              {nb.notebookType === 'daily' && (
                                <div className="text-[10px] text-stone-600 flex items-center justify-center gap-1 mt-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{nb.journalYear}</span>
                                </div>
                              )}
                            </button>

                            <div className="flex items-center justify-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => onOpenNotebook(nb.id)}
                                title="Open"
                                className="p-1.5 rounded bg-[#2C241E] text-[#FAF6F0] cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleArchiveNotebook(nb.id, false)}
                                title="Restore to Table"
                                className="p-1.5 rounded bg-white/85 text-[#2C241E] cursor-pointer"
                              >
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Settings for ${nb.title}`}
                                title="Settings"
                                onClick={() => onCustomizeNotebook(nb.id)}
                                className="p-1.5 rounded bg-white/75 text-[#2C241E] cursor-pointer"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2D Wooden Bookshelf Plank */}
                  <div
                    className="w-full h-5 rounded-md border-t border-white/15 shadow-md"
                    style={{ backgroundColor: shelfWoodColor }}
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
