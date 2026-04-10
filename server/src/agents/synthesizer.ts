import OpenAI from 'openai';
import { EmitFn, Finding, Source } from '../types';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function synthesizeReport(
  originalQuery: string,
  findings: Finding[],
  emit: EmitFn
): Promise<{ report: string; sources: Source[] }> {
  emit('step', {
    phase: 'synthesizing',
    message: 'Synthesizing findings into a structured report...',
  });

  const findingsText = findings
    .map(f => `### Sub-question: ${f.question}\n\n${f.answer}`)
    .join('\n\n---\n\n');

  const allSources = findings.flatMap(f => f.sources);
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());

  const sourcesText = uniqueSources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n');

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a research analyst. Based on the research findings below, write a comprehensive, well-structured report that directly answers the original question.

Original question: "${originalQuery}"

Research findings:
${findingsText}

Available sources:
${sourcesText}

Write a professional markdown report with:
1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (bullet points)
3. **Detailed Analysis** (organized sections with inline citations like [1], [2])
4. **Conclusion**

Be thorough, well-organized, and cite sources inline where relevant.`,
      },
    ],
  });

  const report = response.choices[0].message.content ?? '';

  return { report, sources: uniqueSources };
}
