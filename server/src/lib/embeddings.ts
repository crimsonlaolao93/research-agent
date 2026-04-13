import OpenAI from 'openai';

// RAG uses the same DEEPSEEK_API_KEY as the rest of the pipeline — no extra key needed.
export const embeddingsAvailable = !!process.env.DEEPSEEK_API_KEY;

// Lazily initialized — avoids a startup crash if the key is somehow absent.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _client;
}

const EMBEDDING_MODEL = 'deepseek-embedding-v2';
const MAX_INPUT_CHARS = 8000;

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
