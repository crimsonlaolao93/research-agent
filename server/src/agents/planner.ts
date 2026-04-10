import OpenAI from "openai";
import { EmitFn, TraceEntry } from "../types";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function planResearch(
  query: string,
  emit: EmitFn,
  previousReport?: string,
): Promise<string[]> {
  emit("step", {
    phase: "planning",
    message: previousReport
      ? "Identifying gaps to research for follow-up..."
      : "Breaking down research question into sub-topics...",
  });

  const userContent = previousReport
    ? `You are a research planner. The following research has already been done:

---
${previousReport.slice(0, 2000)}${previousReport.length > 2000 ? "\n... [truncated]" : ""}
---

For this follow-up question: "${query}"

Identify 3-5 specific sub-questions to research that focus on aspects NOT already covered in the existing research above.

Respond with ONLY a JSON array of strings (the sub-questions), no explanation or markdown. Example:
["What is X?", "How does Y work?", "What are the implications of Z?"]`
    : `You are a research planner. Break down the following research question into 3-5 specific sub-questions that, when answered together, will provide a comprehensive answer to the main question.

Research question: "${query}"

Respond with ONLY a JSON array of strings (the sub-questions), no explanation or markdown. Example:
["What is X?", "How does Y work?", "What are the implications of Z?"]`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "user", content: userContent },
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 1024,
    messages,
  });
  const latencyMs = Date.now() - start;

  const text = response.choices[0].message.content ?? "[]";

  emit("trace", {
    phase: "planning",
    label: "Planner",
    messages: messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
    response: text,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs,
  } as TraceEntry);

  try {
    const cleaned = text
      .trim()
      .replace(/^```json?\n?/, "")
      .replace(/\n?```$/, "");
    const subQuestions: string[] = JSON.parse(cleaned);
    emit("step", {
      phase: "planning",
      message: `Identified ${subQuestions.length} research sub-topics`,
    });
    return subQuestions;
  } catch {
    return [query];
  }
}
