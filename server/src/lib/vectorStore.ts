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
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class VectorStore {
  private chunks: DocumentChunk[] = [];
  private docs: Map<string, DocumentMeta> = new Map();

  addDocument(
    meta: DocumentMeta,
    chunks: Array<{ id: string; text: string; embedding: number[] }>,
  ) {
    this.docs.set(meta.id, meta);
    for (const chunk of chunks) {
      this.chunks.push({ ...chunk, docId: meta.id, docName: meta.name });
    }
  }

  // Returns top-K chunks above a relevance threshold, sorted by score
  search(
    queryEmbedding: number[],
    topK = 5,
    threshold = 0.25,
  ): DocumentChunk[] {
    if (this.chunks.length === 0) return [];
    return this.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(chunk.embedding, queryEmbedding),
      }))
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk }) => chunk);
  }

  deleteDocument(docId: string) {
    this.chunks = this.chunks.filter((c) => c.docId !== docId);
    this.docs.delete(docId);
  }

  listDocuments(): DocumentMeta[] {
    return Array.from(this.docs.values());
  }

  get chunkCount() {
    return this.chunks.length;
  }
}

// Singleton — shared across all requests. In production, replace with a
// persistent vector DB (e.g. pgvector, Qdrant, Chroma) so data survives restarts.
export const vectorStore = new VectorStore();
