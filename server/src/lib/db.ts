import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway Postgres requires SSL in production
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    // Enable pgvector extension (requires it to be installed on the Postgres server)
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        chunk_count INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id        TEXT PRIMARY KEY,
        doc_id    TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        doc_name  TEXT NOT NULL,
        text      TEXT NOT NULL,
        embedding vector(384) NOT NULL
      )
    `);

    // HNSW index for fast approximate nearest-neighbour search
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding
        ON document_chunks USING hnsw (embedding vector_cosine_ops)
    `);

    console.log("[db] Schema ready");
  } finally {
    client.release();
  }
}
