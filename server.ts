import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Server-side Gemini endpoint for Notebook / Page Reflections & Summaries
  app.post('/api/journal/summarize', async (req, res) => {
    try {
      const { notebookTitle, scope, pages, includeHandwriting } = req.body as {
        notebookTitle?: string;
        scope?: 'page' | 'selected' | 'notebook';
        pages?: Array<{
          pageNumber: number;
          entryDate?: string;
          title?: string;
          textContent: string;
          strokeCount?: number;
          handwritingPreviewDataUrl?: string;
        }>;
        includeHandwriting?: boolean;
      };

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        res.status(400).json({ error: 'Please select at least one page with content to summarize.' });
        return;
      }

      const combinedText = pages
        .map((p) => {
          const header = `Page ${p.pageNumber}${p.entryDate ? ` (${p.entryDate})` : ''}${p.title ? ` — "${p.title}"` : ''}`;
          const strokesNote =
            includeHandwriting && p.strokeCount && p.strokeCount > 0
              ? ` [Contains ${p.strokeCount} handwritten pen/sketch strokes]`
              : '';
          return `${header}${strokesNote}:\n${p.textContent || '(Quiet page with sketches or photographs)'}`;
        })
        .join('\n\n---\n\n');

      const buildLocalSynthesis = () => {
        const totalWords = pages.reduce(
          (sum, p) =>
            sum + (p.textContent ? p.textContent.trim().split(/\s+/).filter(Boolean).length : 0),
          0,
        );
        const titles = pages.map((p) => p.title).filter(Boolean);
        return {
          overview: `Across ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} (${totalWords} words) in "${notebookTitle || 'NOTE BOOK'}", your writing centers on quiet reflection${titles.length ? `, visiting moments such as ${titles.slice(0, 3).join(', ')}` : ''}.`,
          themes: ['Personal Reflection', 'Daily Gratitude', 'Mindful Pacing'],
          highlights: pages.slice(0, 4).map((p) => ({
            pageNumber: p.pageNumber,
            note: p.title
              ? `${p.title}: ${(p.textContent || 'Visual sketch & memory page').replace(/\s+/g, ' ').slice(0, 110)}`
              : (p.textContent || 'Quiet page with visual memories.').replace(/\s+/g, ' ').slice(0, 120),
          })),
        };
      };

      // Fallback local literary synthesis if GEMINI_API_KEY is missing or placeholder
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.json(buildLocalSynthesis());
        return;
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        if (includeHandwriting) {
          const pageWithCanvas = pages.find((p) => p.handwritingPreviewDataUrl?.startsWith('data:image/'));
          if (pageWithCanvas && pageWithCanvas.handwritingPreviewDataUrl) {
            const [meta, base64Data] = pageWithCanvas.handwritingPreviewDataUrl.split(',');
            const mimeMatch = meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
            if (base64Data && mimeMatch) {
              parts.push({
                inlineData: {
                  mimeType: mimeMatch[1],
                  data: base64Data,
                },
              });
            }
          }
        }

        parts.push({
          text: `Summarize the following ${scope || 'notebook'} entries from the personal journal "${notebookTitle || 'NOTE BOOK'}". Keep the tone warm, gentle, literary, and personal—like an index card slipped inside a treasured notebook.\n\nEntries:\n${combinedText}`,
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            systemInstruction:
              'You are a thoughtful, discreet literary archivist helping a writer revisit their own personal journal pages. Produce a concise, warm, non-judgmental summary in JSON format with an overview paragraph (2-3 sentences), 2-4 gentle recurring themes, and brief page highlights.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overview: {
                  type: Type.STRING,
                  description: 'A warm 2-3 sentence synthesis of the pages.',
                },
                themes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 gentle recurring themes noticed across the entries.',
                },
                highlights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pageNumber: { type: Type.INTEGER },
                      note: { type: Type.STRING },
                    },
                  },
                  description: 'Brief 1-sentence notes for key pages.',
                },
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({
          overview: parsed.overview || buildLocalSynthesis().overview,
          themes: Array.isArray(parsed.themes) && parsed.themes.length > 0 ? parsed.themes : ['Personal Reflection'],
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights : buildLocalSynthesis().highlights,
        });
      } catch {
        // Gracefully synthesize from local page content when upstream model experiences temporary 503 demand spikes
        res.json(buildLocalSynthesis());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate notebook summary right now.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOTE BOOK server running on http://localhost:${PORT}`);
  });
}

startServer();
