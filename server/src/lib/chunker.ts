/**
 * Splits text into overlapping chunks, preferring to break at paragraph or
 * sentence boundaries so each chunk is semantically coherent.
 */
export function chunkText(
  text: string,
  maxChars = 800,
  overlap = 150,
): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= maxChars) {
    return normalized.length > 30 ? [normalized] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + maxChars;

    if (end >= normalized.length) {
      chunks.push(normalized.slice(start).trim());
      break;
    }

    // Prefer paragraph boundary
    const paraBreak = normalized.lastIndexOf("\n\n", end);
    if (paraBreak > start + maxChars / 2) {
      end = paraBreak;
    } else {
      // Fall back to sentence boundary
      const sentenceBreak = normalized.lastIndexOf(". ", end);
      if (sentenceBreak > start + maxChars / 2) {
        end = sentenceBreak + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk);

    // Slide forward with overlap so context spans chunk boundaries
    start = end - overlap;
  }

  return chunks;
}
