import { pool } from "./db";

export interface DocumentMeta {
  id: string;
  name: string;
  chunkCount: number;
  uploadedAt: string;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  embedding?: number[];
}

interface IVectorStore {
  addDocument(
    meta: DocumentMeta,
    chunks: Array<{ id: string; text: string; embedding: number[] }>,
  ): Promise<void>;
  search(queryEmbedding: number[], topK?: number, threshold?: number): Promise<DocumentChunk[]>;
  deleteDocument(docId: string): Promise<void>;
  listDocuments(): Promise<DocumentMeta[]>;
  getChunkCount(): Promise<number>;
}

// ─── pgvector backend ────────────────────────────────────────────────────────

function toVec(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

class PgVectorStore implements IVectorStore {
  async addDocument(
    meta: DocumentMeta,
    chunks: Array<{ id: string; text: string; embedding: number[] }>,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO documents (id, name, chunk_count, uploaded_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [meta.id, meta.name, meta.chunkCount, meta.uploadedAt],
      );
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO document_chunks (id, doc_id, doc_name, text, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [chunk.id, meta.id, meta.name, chunk.text, toVec(chunk.embedding)],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async search(queryEmbedding: number[], topK = 5, threshold = 0.25): Promise<DocumentChunk[]> {
    const result = await pool.query<DocumentChunk>(
      `SELECT id,
              doc_id   AS "docId",
              doc_name AS "docName",
              text
       FROM   document_chunks
       WHERE  1 - (embedding <=> $1::vector) >= $2
       ORDER  BY embedding <=> $1::vector
       LIMIT  $3`,
      [toVec(queryEmbedding), threshold, topK],
    );
    return result.rows;
  }

  async deleteDocument(docId: string): Promise<void> {
    // Chunks removed automatically via ON DELETE CASCADE
    await pool.query("DELETE FROM documents WHERE id = $1", [docId]);
  }

  async listDocuments(): Promise<DocumentMeta[]> {
    const result = await pool.query<DocumentMeta>(
      `SELECT id,
              name,
              chunk_count AS "chunkCount",
              uploaded_at AS "uploadedAt"
       FROM   documents
       ORDER  BY uploaded_at DESC`,
    );
    return result.rows;
  }

  async getChunkCount(): Promise<number> {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM document_chunks",
    );
    return parseInt(result.rows[0].count, 10);
  }
}

// ─── In-memory fallback (no DATABASE_URL) ───────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class InMemoryVectorStore implements IVectorStore {
  private chunks: (DocumentChunk & { embedding: number[] })[] = [];
  private docs: Map<string, DocumentMeta> = new Map();

  async addDocument(
    meta: DocumentMeta,
    chunks: Array<{ id: string; text: string; embedding: number[] }>,
  ): Promise<void> {
    this.docs.set(meta.id, meta);
    for (const chunk of chunks) {
      this.chunks.push({ ...chunk, docId: meta.id, docName: meta.name });
    }
  }

  async search(queryEmbedding: number[], topK = 5, threshold = 0.25): Promise<DocumentChunk[]> {
    return this.chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk }) => chunk);
  }

  async deleteDocument(docId: string): Promise<void> {
    this.chunks = this.chunks.filter((c) => c.docId !== docId);
    this.docs.delete(docId);
  }

  async listDocuments(): Promise<DocumentMeta[]> {
    return Array.from(this.docs.values());
  }

  async getChunkCount(): Promise<number> {
    return this.chunks.length;
  }
}

// ─── Export the appropriate backend ─────────────────────────────────────────

const usePg = !!process.env.DATABASE_URL;

if (!usePg) {
  console.warn(
    "[vectorStore] DATABASE_URL not set — using in-memory store. " +
      "Documents will not persist across restarts.",
  );
}

export const vectorStore: IVectorStore = usePg
  ? new PgVectorStore()
  : new InMemoryVectorStore();
