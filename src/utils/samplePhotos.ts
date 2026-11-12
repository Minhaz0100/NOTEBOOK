import type { Notebook, NotebookPage } from '../types/journal';

let cachedPhotos: Record<string, string> | null = null;

/**
 * Generates high-craft procedural HTML5 Canvas DataURLs for instant studio prints and sample pages.
 * Ensures zero external image 404s.
 */
export function getStudioSamplePhotos(): Record<'sunset' | 'daisies' | 'windowCat' | 'botanical', string> {
  if (cachedPhotos) {
    return cachedPhotos as Record<'sunset' | 'daisies' | 'windowCat' | 'botanical', string>;
  }
  if (typeof document === 'undefined') {
    return { sunset: '', daisies: '', windowCat: '', botanical: '' };
  }

  // 1. Golden Sunset Horizon ("A Peaceful Day")
  const c1 = document.createElement('canvas');
  c1.width = 480;
  c1.height = 340;
  const ctx1 = c1.getContext('2d')!;
  const skyGrad = ctx1.createLinearGradient(0, 0, 0, 340);
  skyGrad.addColorStop(0, '#6B88B4');
  skyGrad.addColorStop(0.42, '#C7979E');
  skyGrad.addColorStop(0.75, '#F0B67F');
  skyGrad.addColorStop(1, '#F7D69C');
  ctx1.fillStyle = skyGrad;
  ctx1.fillRect(0, 0, 480, 340);

  // Soft clouds
  ctx1.fillStyle = 'rgba(255, 232, 204, 0.45)';
  for (let i = 0; i < 6; i++) {
    ctx1.beginPath();
    ctx1.ellipse(70 + i * 75, 110 + (i % 3) * 28, 85, 16, 0.05, 0, Math.PI * 2);
    ctx1.fill();
  }

  // Warm setting sun glow
  const sunGrad = ctx1.createRadialGradient(250, 235, 8, 250, 235, 110);
  sunGrad.addColorStop(0, 'rgba(255, 248, 210, 0.95)');
  sunGrad.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx1.fillStyle = sunGrad;
  ctx1.fillRect(0, 0, 480, 340);

  // Distant treeline silhouette
  ctx1.fillStyle = '#241F1C';
  ctx1.beginPath();
  ctx1.moveTo(0, 340);
  ctx1.lineTo(0, 275);
  for (let x = 0; x <= 480; x += 16) {
    const h = 268 - Math.sin(x * 0.05) * 18 - (x % 32 === 0 ? 22 : 4);
    ctx1.lineTo(x, h);
  }
  ctx1.lineTo(480, 340);
  ctx1.closePath();
  ctx1.fill();

  // 2. Sunlit Meadow Daisies ("Dream Big / Grateful")
  const c2 = document.createElement('canvas');
  c2.width = 480;
  c2.height = 340;
  const ctx2 = c2.getContext('2d')!;
  const meadowGrad = ctx2.createLinearGradient(0, 0, 0, 340);
  meadowGrad.addColorStop(0, '#78A8D6');
  meadowGrad.addColorStop(0.55, '#A7C7E7');
  meadowGrad.addColorStop(0.56, '#567844');
  meadowGrad.addColorStop(1, '#39522B');
  ctx2.fillStyle = meadowGrad;
  ctx2.fillRect(0, 0, 480, 340);

  const daisyPositions = [
    { x: 110, y: 210, r: 26 },
    { x: 195, y: 175, r: 32 },
    { x: 280, y: 225, r: 28 },
    { x: 365, y: 190, r: 30 },
    { x: 150, y: 275, r: 22 },
    { x: 245, y: 285, r: 24 },
  ];
  for (const d of daisyPositions) {
    // Stem
    ctx2.strokeStyle = '#334B25';
    ctx2.lineWidth = 3.5;
    ctx2.beginPath();
    ctx2.moveTo(d.x, d.y);
    ctx2.quadraticCurveTo(d.x - 10, d.y + 50, d.x - 4, 340);
    ctx2.stroke();

    // White petals
    ctx2.fillStyle = '#FCFBF7';
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      ctx2.save();
      ctx2.translate(d.x + Math.cos(ang) * (d.r * 0.55), d.y + Math.sin(ang) * (d.r * 0.55));
      ctx2.rotate(ang);
      ctx2.beginPath();
      ctx2.ellipse(0, 0, d.r * 0.48, d.r * 0.18, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    }
    // Golden center
    ctx2.fillStyle = '#E5A93B';
    ctx2.beginPath();
    ctx2.arc(d.x, d.y, d.r * 0.28, 0, Math.PI * 2);
    ctx2.fill();
  }

  // 3. Cozy Window & Sleeping Cat ("My Little Happiness")
  const c3 = document.createElement('canvas');
  c3.width = 480;
  c3.height = 340;
  const ctx3 = c3.getContext('2d')!;
  ctx3.fillStyle = '#D9C8B4';
  ctx3.fillRect(0, 0, 480, 340);
  // Warm sunbeam
  ctx3.fillStyle = 'rgba(255, 244, 214, 0.55)';
  ctx3.beginPath();
  ctx3.moveTo(80, 0);
  ctx3.lineTo(390, 0);
  ctx3.lineTo(460, 340);
  ctx3.lineTo(20, 340);
  ctx3.closePath();
  ctx3.fill();
  // Soft blanket
  ctx3.fillStyle = '#EFE7DA';
  ctx3.beginPath();
  ctx3.ellipse(240, 250, 175, 65, 0, 0, Math.PI * 2);
  ctx3.fill();
  // Sleeping Ginger/Tabby Cat curled up
  ctx3.fillStyle = '#B8845B';
  ctx3.beginPath();
  ctx3.ellipse(235, 225, 92, 54, -0.08, 0, Math.PI * 2);
  ctx3.fill();
  // Cat head
  ctx3.fillStyle = '#C6936A';
  ctx3.beginPath();
  ctx3.arc(170, 225, 38, 0, Math.PI * 2);
  ctx3.fill();
  // Ears
  ctx3.beginPath();
  ctx3.moveTo(142, 198);
  ctx3.lineTo(155, 172);
  ctx3.lineTo(172, 192);
  ctx3.fill();
  ctx3.beginPath();
  ctx3.moveTo(176, 192);
  ctx3.lineTo(194, 170);
  ctx3.lineTo(202, 198);
  ctx3.fill();
  // Peaceful closed eye
  ctx3.strokeStyle = '#3C281B';
  ctx3.lineWidth = 2.5;
  ctx3.beginPath();
  ctx3.arc(162, 230, 9, 0.15, Math.PI - 0.15);
  ctx3.stroke();

  // 4. Pressed Botanical Leaf Study
  const c4 = document.createElement('canvas');
  c4.width = 400;
  c4.height = 460;
  const ctx4 = c4.getContext('2d')!;
  ctx4.fillStyle = '#F3ECE0';
  ctx4.fillRect(0, 0, 400, 460);
  ctx4.strokeStyle = '#4B6043';
  ctx4.lineWidth = 3;
  ctx4.beginPath();
  ctx4.moveTo(200, 390);
  ctx4.quadraticCurveTo(195, 230, 210, 75);
  ctx4.stroke();
  for (let i = 0; i < 7; i++) {
    const y = 115 + i * 38;
    const dir = i % 2 === 0 ? 1 : -1;
    ctx4.fillStyle = i % 2 === 0 ? '#6A835E' : '#58704D';
    ctx4.beginPath();
    ctx4.ellipse(202 + dir * 42, y, 42, 16, dir * -0.45, 0, Math.PI * 2);
    ctx4.fill();
  }

  cachedPhotos = {
    sunset: c1.toDataURL('image/jpeg', 0.86),
    daisies: c2.toDataURL('image/jpeg', 0.86),
    windowCat: c3.toDataURL('image/jpeg', 0.86),
    botanical: c4.toDataURL('image/jpeg', 0.86),
  };

  return cachedPhotos as Record<'sunset' | 'daisies' | 'windowCat' | 'botanical', string>;
}

/**
 * Compresses a user-uploaded photograph file into an optimized JPEG DataURL
 * so multiple photos can be stored reliably in Cloud Firestore and local storage.
 */
export function compressUploadedImageToDataUrl(
  file: File,
  maxDimension = 720,
): Promise<{ dataUrl: string; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const aspect = img.width / Math.max(1, img.height);
        let targetW = img.width;
        let targetH = img.height;
        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW >= targetH) {
            targetW = maxDimension;
            targetH = Math.round(maxDimension / aspect);
          } else {
            targetH = maxDimension;
            targetW = Math.round(maxDimension * aspect);
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: String(reader.result), aspectRatio: Number(aspect.toFixed(2)) });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          dataUrl: compressed,
          aspectRatio: Number(aspect.toFixed(2)),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a clearly labeled, removable starter sample notebook inspired by the user's reference showcase
 * so first-time visitors or guest explorers can immediately experience turning pages, handwriting, and photos.
 */
export function createSampleStarterData(ownerId: string): {
  notebooks: Notebook[];
  pagesByNotebook: Record<string, NotebookPage[]>;
} {
  const nowIso = new Date().toISOString();
  const photos = getStudioSamplePhotos();

  const cleanOwner = (ownerId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'user';
  const dailyNotebookId = `sample-${cleanOwner}-daybook-2026`;
  const notesNotebookId = `sample-${cleanOwner}-field-notes`;
  const stitchedNotebookId = `sample-${cleanOwner}-travel-sketch`;
  const archivedNotebookId = `sample-${cleanOwner}-autumn-archive`;

  const notebooks: Notebook[] = [
    {
      id: dailyNotebookId,
      ownerId,
      title: 'NOTE BOOK',
      description: 'Your personal journal, anytime, anywhere. Feel free to edit or remove this sample notebook.',
      notebookType: 'daily',
      journalYear: 2026,
      coverColor: '#EFE6D8',
      coverMaterial: 'linen',
      coverAccent: 'botanical',
      bindingStyle: 'spiral',
      defaultPaperStyle: 'ruled',
      defaultPageColor: '#FAF6F0',
      defaultFontFamily: 'Caveat',
      pageCount: 4,
      lastOpenedPage: 1,
      lastViewedDate: '2026-11-08',
      archived: false,
      deskPositionX: -1.55,
      deskPositionZ: 0.42,
      deskRotationY: 0.05,
      bookmarkIds: ['page-1', 'page-2'],
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: notesNotebookId,
      ownerId,
      title: 'Botanical Sketches & Ideas',
      description: 'Freeform thoughts, pressed leaves, and quiet afternoon sketches.',
      notebookType: 'free',
      journalYear: 2026,
      coverColor: '#5B6D54',
      coverMaterial: 'leather',
      coverAccent: 'minimal-frame',
      bindingStyle: 'hardcover',
      defaultPaperStyle: 'dotted',
      defaultPageColor: '#FBF8F3',
      defaultFontFamily: 'Kalam',
      pageCount: 14,
      lastOpenedPage: 1,
      lastViewedDate: '',
      archived: false,
      deskPositionX: 0.12,
      deskPositionZ: 0.48,
      deskRotationY: -0.04,
      bookmarkIds: ['fn-page-1'],
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: stitchedNotebookId,
      ownerId,
      title: 'Quiet Reading Notes',
      description: 'Hand-stitched kraft notebook for book quotes and reflections.',
      notebookType: 'notes',
      journalYear: 2026,
      coverColor: '#C59B6D',
      coverMaterial: 'kraft',
      coverAccent: 'monogram',
      bindingStyle: 'stitched',
      defaultPaperStyle: 'blank',
      defaultPageColor: '#FAF6F0',
      defaultFontFamily: 'Patrick Hand',
      pageCount: 6,
      lastOpenedPage: 1,
      lastViewedDate: '',
      archived: false,
      deskPositionX: 1.65,
      deskPositionZ: 0.38,
      deskRotationY: 0.07,
      bookmarkIds: [],
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: archivedNotebookId,
      ownerId,
      title: 'Autumn Letters 2025',
      description: 'Archived reflections kept safely on the study bookshelf.',
      notebookType: 'notes',
      journalYear: 2025,
      coverColor: '#8B5A47',
      coverMaterial: 'buckram',
      coverAccent: 'celestial',
      bindingStyle: 'hardcover',
      defaultPaperStyle: 'ruled',
      defaultPageColor: '#F7F1E5',
      defaultFontFamily: 'Patrick Hand',
      pageCount: 18,
      lastOpenedPage: 1,
      lastViewedDate: '',
      archived: true,
      deskPositionX: 1.75,
      deskPositionZ: 0.4,
      deskRotationY: 0.06,
      bookmarkIds: [],
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const dailyPages: NotebookPage[] = [
    {
      id: 'page-1',
      notebookId: dailyNotebookId,
      ownerId,
      pageNumber: 1,
      entryDate: '2026-11-08',
      title: 'A Peaceful Day ♡',
      paperStyle: 'ruled',
      pageColor: '#FAF6F0',
      bookmarkTitle: 'Peaceful Sunset',
      bookmarkColor: '#B85D57',
      bookmarkStyle: 'satin',
      textBlocks: [
        {
          id: 'tb-sample-1',
          text: 'Today was such a calm day. I finally got some time for myself, read a good book, and enjoyed the little things. Life feels a bit brighter lately. Hopefully it stays this way! ♡',
          x: 7,
          y: 13,
          width: 85,
          fontFamily: 'Caveat',
          fontSize: 25,
          color: '#2E2740',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
        {
          id: 'tb-sample-2',
          text: 'Good Vibes ✨',
          x: 68,
          y: 66,
          width: 26,
          fontFamily: 'Caveat',
          fontSize: 26,
          color: '#3A3252',
          underlined: true,
          align: 'center',
          layerOrder: 3,
          createdAt: 2,
        },
      ],
      strokes: [],
      photos: photos.sunset
        ? [
            {
              id: 'ph-sample-1',
              dataUrl: photos.sunset,
              caption: 'Evening sky from the study window',
              x: 14,
              y: 48,
              width: 48,
              aspectRatio: 1.41,
              rotation: -4.5,
              hasBorder: true,
              hasTape: true,
              tapeColor: '#E8D8BE',
              layerOrder: 2,
              createdAt: 1,
            },
          ]
        : [],
      wordCount: 39,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'page-2',
      notebookId: dailyNotebookId,
      ownerId,
      pageNumber: 2,
      entryDate: '2026-11-09',
      title: 'Dream Big ✨',
      paperStyle: 'ruled',
      pageColor: '#FAF6F0',
      bookmarkTitle: 'Morning Reminders',
      bookmarkColor: '#6C8469',
      bookmarkStyle: 'linen',
      textBlocks: [
        {
          id: 'tb-sample-3',
          text: 'Just a little reminder to myself...\nDream big, work hard, and be kind.\nEverything will fall into place. ♡',
          x: 7,
          y: 13,
          width: 85,
          fontFamily: 'Caveat',
          fontSize: 25,
          color: '#2E2740',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
        {
          id: 'tb-sample-4',
          text: '☑ Be happy\n☑ Do my best\n☑ Take care ♡',
          x: 56,
          y: 52,
          width: 36,
          fontFamily: 'Caveat',
          fontSize: 23,
          color: '#4F436E',
          underlined: false,
          align: 'left',
          layerOrder: 3,
          createdAt: 2,
        },
      ],
      strokes: [],
      photos: photos.daisies
        ? [
            {
              id: 'ph-sample-2',
              dataUrl: photos.daisies,
              caption: 'Wild daisies in the morning light',
              x: 8,
              y: 49,
              width: 44,
              aspectRatio: 1.41,
              rotation: -5.2,
              hasBorder: true,
              hasTape: true,
              tapeColor: '#E8D8BE',
              layerOrder: 2,
              createdAt: 1,
            },
          ]
        : [],
      wordCount: 31,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'page-3',
      notebookId: dailyNotebookId,
      ownerId,
      pageNumber: 3,
      entryDate: '2026-11-07',
      title: 'My Little Happiness ♡',
      paperStyle: 'ruled',
      pageColor: '#FAF6F0',
      bookmarkTitle: '',
      bookmarkColor: '',
      bookmarkStyle: 'none',
      textBlocks: [
        {
          id: 'tb-sample-5',
          text: 'Spent the whole evening by the window with warm tea while the cat slept in a patch of late afternoon light. Sometimes the quietest hours are the ones worth remembering most.',
          x: 7,
          y: 14,
          width: 84,
          fontFamily: 'Caveat',
          fontSize: 25,
          color: '#2C2623',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
      strokes: [],
      photos: photos.windowCat
        ? [
            {
              id: 'ph-sample-3',
              dataUrl: photos.windowCat,
              caption: 'Afternoon nap in the sunbeam',
              x: 20,
              y: 48,
              width: 48,
              aspectRatio: 1.41,
              rotation: 3.2,
              hasBorder: true,
              hasTape: true,
              tapeColor: '#E8D8BE',
              layerOrder: 2,
              createdAt: 1,
            },
          ]
        : [],
      wordCount: 36,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'page-4',
      notebookId: dailyNotebookId,
      ownerId,
      pageNumber: 4,
      entryDate: '2026-11-10',
      title: '',
      paperStyle: 'ruled',
      pageColor: '#FAF6F0',
      bookmarkTitle: '',
      bookmarkColor: '',
      bookmarkStyle: 'none',
      textBlocks: [
        {
          id: 'tb-sample-6',
          text: 'Pick a pen from the simple stationery bar above, switch ink colors, sketch freely with your stylus or mouse, or place a photograph on this A4 page...',
          x: 7,
          y: 14,
          width: 84,
          fontFamily: 'Caveat',
          fontSize: 24,
          color: '#5C5248',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
      strokes: [],
      photos: [],
      wordCount: 28,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const fieldNotesPages: NotebookPage[] = [
    {
      id: 'fn-page-1',
      notebookId: notesNotebookId,
      ownerId,
      pageNumber: 1,
      entryDate: '',
      title: 'Pressed Leaves & Study Notes',
      paperStyle: 'dotted',
      pageColor: '#FBF8F3',
      bookmarkTitle: 'Leaf Specimen',
      bookmarkColor: '#4A6B53',
      bookmarkStyle: 'velvet',
      textBlocks: [
        {
          id: 'fn-tb-1',
          text: 'Collected along the old stone wall this morning. Notice how the olive-green veins hold the light against cream paper.',
          x: 8,
          y: 14,
          width: 82,
          fontFamily: 'Kalam',
          fontSize: 21,
          color: '#2C3B2B',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
      strokes: [],
      photos: photos.botanical
        ? [
            {
              id: 'fn-ph-1',
              dataUrl: photos.botanical,
              caption: 'Specimen No. 04 — Olive & Sage',
              x: 24,
              y: 40,
              width: 42,
              aspectRatio: 0.87,
              rotation: -2.5,
              hasBorder: true,
              hasTape: true,
              tapeColor: '#DFD2BC',
              layerOrder: 2,
              createdAt: 1,
            },
          ]
        : [],
      wordCount: 24,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'fn-page-2',
      notebookId: notesNotebookId,
      ownerId,
      pageNumber: 2,
      entryDate: '',
      title: 'Unruled Sketch Canvas',
      paperStyle: 'blank',
      pageColor: '#FBF8F3',
      bookmarkTitle: '',
      bookmarkColor: '',
      bookmarkStyle: 'none',
      textBlocks: [],
      strokes: [],
      photos: [],
      wordCount: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const archivePages: NotebookPage[] = [
    {
      id: 'arch-page-1',
      notebookId: archivedNotebookId,
      ownerId,
      pageNumber: 1,
      entryDate: '2025-10-14',
      title: 'October Rain on the Roof',
      paperStyle: 'ruled',
      pageColor: '#F7F1E5',
      bookmarkTitle: 'October Rain',
      bookmarkColor: '#8B453A',
      bookmarkStyle: 'satin',
      textBlocks: [
        {
          id: 'arch-tb-1',
          text: 'An older notebook stored on the study bookshelf. You can read through archived journals anytime or restore them to your active writing desk.',
          x: 8,
          y: 15,
          width: 82,
          fontFamily: 'Patrick Hand',
          fontSize: 23,
          color: '#3D2B24',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
      strokes: [],
      photos: [],
      wordCount: 28,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const stitchedPages: NotebookPage[] = [
    {
      id: 'st-page-1',
      notebookId: stitchedNotebookId,
      ownerId,
      pageNumber: 1,
      entryDate: '',
      title: 'Reading Room Reflections',
      paperStyle: 'blank',
      pageColor: '#FAF6F0',
      bookmarkTitle: 'Favorite Quote',
      bookmarkColor: '#C48F45',
      bookmarkStyle: 'linen',
      textBlocks: [
        {
          id: 'st-tb-1',
          text: '“A room without books is like a body without a soul.”\nSitting at the desk with warm tea and a hand-stitched kraft notebook.',
          x: 8,
          y: 15,
          width: 82,
          fontFamily: 'Patrick Hand',
          fontSize: 23,
          color: '#3D2B24',
          underlined: false,
          align: 'left',
          layerOrder: 1,
          createdAt: 1,
        },
      ],
      strokes: [],
      photos: [],
      wordCount: 24,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    notebooks,
    pagesByNotebook: {
      [dailyNotebookId]: dailyPages,
      [notesNotebookId]: fieldNotesPages,
      [stitchedNotebookId]: stitchedPages,
      [archivedNotebookId]: archivePages,
    },
  };
}
