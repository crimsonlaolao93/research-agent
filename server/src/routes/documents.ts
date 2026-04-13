import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { vectorStore } from '../lib/vectorStore';
import { embedBatch, embeddingsAvailable } from '../lib/embeddings';
import { chunkText } from '../lib/chunker';

// pdf-parse v1 ships without type declarations
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/pdf' ||
      file.originalname.endsWith('.md');
    if (ok) {
      cb(null, true);
    } else {
      // Cast needed: @types/multer@2.1.0 conflates overload signatures in strict mode
      (cb as (err: Error) => void)(new Error('Only .txt, .md, and .pdf files are supported'));
    }
  },
});

async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  return buffer.toString('utf-8');
}

// GET /api/documents — list uploaded documents + RAG availability
router.get('/documents', (_req: Request, res: Response) => {
  res.json({
    available: embeddingsAvailable,
    documents: vectorStore.listDocuments(),
  });
});

// POST /api/documents/upload — ingest a document into the vector store
router.post('/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!embeddingsAvailable) {
    res.status(503).json({
      error: 'RAG is disabled — DEEPSEEK_API_KEY is required to enable document upload',
    });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  try {
    const text = await extractText(file.buffer, file.mimetype);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      res.status(400).json({ error: 'Could not extract usable text from this file' });
      return;
    }

    const embeddings = await embedBatch(chunks);

    const docId = crypto.randomUUID();
    vectorStore.addDocument(
      {
        id: docId,
        name: file.originalname,
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString(),
      },
      chunks.map((text, i) => ({ id: `${docId}-${i}`, text, embedding: embeddings[i] })),
    );

    res.json({ docId, name: file.originalname, chunkCount: chunks.length });
  } catch (err) {
    console.error('[documents] Upload error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

// DELETE /api/documents/:id — remove a document and all its chunks
router.delete('/documents/:id', (req: Request, res: Response) => {
  const id = req.params['id'];
  vectorStore.deleteDocument(Array.isArray(id) ? id[0] : id);
  res.json({ ok: true });
});

export default router;
