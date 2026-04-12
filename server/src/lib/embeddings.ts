import OpenAI from 'openai';

// RAG is silently disabled when no key is provided so the rest of the app still works.
export const embeddingsAvailable = !!process.env.OPENAI_API_KEY;

// Lazily initialized — avoids a startup crash when OPENAI_API_KEY is not set.
let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_INPUT_CHARS = 8000; // well under the 8191 token limit

export async function embedText(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, MAX_INPUT_CHARS),
  });
  return response.data[0].embedding;
}

// Batch embed to reduce API round-trips during document ingestion
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, MAX_INPUT_CHARS)),
  });
  return response.data.map((d) => d.embedding);
}
