import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN);

// sentence-transformers/all-MiniLM-L6-v2 produces 384-dim embeddings —
// same dimensionality as the previous local model so the DB schema is unchanged.
const MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export const embeddingsAvailable = !!process.env.HF_TOKEN;

export async function embedText(text: string): Promise<number[]> {
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  });
  // featureExtraction returns number[] | number[][] depending on input shape
  const flat = Array.isArray((result as number[][])[0])
    ? (result as number[][])[0]
    : (result as number[]);
  return flat;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: texts,
  });
  return result as number[][];
}
