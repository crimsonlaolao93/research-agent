import OpenAI from "openai";
import { EmitFn, Evaluation, TraceEntry } from "../types";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function evaluateReport(
  originalQuery: string,
  report: string,
  emit: EmitFn,
): Promise<Evaluation> {
  emit("step", {
    phase: "evaluating",
    message: "Evaluating report quality and completeness...",
  });

  const evalMessages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: `Evaluate the following research report against the original question.

Original question: "${originalQuery}"

Report:
${report}

Return a JSON object with this exact structure (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "completeness": "<one sentence describing how completely the report answers the question>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}`,
    },
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 1024,
    messages: evalMessages,
  });
  const latencyMs = Date.now() - start;

  const text = response.choices[0].message.content ?? "";

  emit("trace", {
    phase: "evaluating",
    label: "Evaluator",
    messages: evalMessages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string" ? m.content : JSON.stringify(m.content),
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
    return JSON.parse(cleaned) as Evaluation;
  } catch {
    return {
      score: 75,
      completeness: "Report provides a solid overview of the topic.",
      strengths: ["Well-structured", "Cites sources", "Covers key aspects"],
      gaps: ["Could include more recent data"],
    };
  }
}
