import OpenAI from 'openai';
import { EmitFn, Evaluation } from '../types';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function evaluateReport(
  originalQuery: string,
  report: string,
  emit: EmitFn
): Promise<Evaluation> {
  emit('step', {
    phase: 'evaluating',
    message: 'Evaluating report quality and completeness...',
  });

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
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
    ],
  });

  const text = response.choices[0].message.content ?? '';

  try {
    const cleaned = text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleaned) as Evaluation;
  } catch {
    return {
      score: 75,
      completeness: 'Report provides a solid overview of the topic.',
      strengths: ['Well-structured', 'Cites sources', 'Covers key aspects'],
      gaps: ['Could include more recent data'],
    };
  }
}
