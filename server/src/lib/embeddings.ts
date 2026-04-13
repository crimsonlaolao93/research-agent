import { pipeline, env } from "@xenova/transformers";

// Cache models in /tmp so Railway's read-only app filesystem isn't an issue.
env.cacheDir = "/tmp/.transformers-cache";

// Local model — no API key required. Downloads ~23 MB on first use, then cached.
const MODEL = "Xenova/all-MiniLM-L6-v2"; // 384-dim sentence embeddings
const MAX_INPUT_CHARS = 8000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _extractor: any = null;

async function getExtractor() {
  if (!_extractor) {
    _extractor = await pipeline("feature-extraction", MODEL);
  }
  return _extractor;
}

// Always available — no external API dependency.
export const embeddingsAvailable = true;

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text.slice(0, MAX_INPUT_CHARS), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

// Batch embed for efficient document ingestion
export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedText(t)));
}
