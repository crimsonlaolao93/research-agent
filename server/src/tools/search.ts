import { tavily } from "@tavily/core";
import { Source } from "../types";

let client: ReturnType<typeof tavily> | null = null;

function getClient() {
  if (!client) {
    client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  }
  return client;
}

export async function webSearch(
  query: string,
): Promise<{ results: Source[]; rawText: string }> {
  const response = await getClient().search(query, {
    maxResults: 5,
    searchDepth: "advanced",
    includeAnswer: true,
  });

  const sources: Source[] = response.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));

  const rawText = [
    response.answer ? `Summary: ${response.answer}` : "",
    ...response.results.map((r) => `[${r.title}](${r.url})\n${r.content}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { results: sources, rawText };
}
