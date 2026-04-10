import OpenAI from 'openai';
import { EmitFn, Finding, Source, TraceEntry } from '../types';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function synthesizeReport(
  originalQuery: string,
  findings: Finding[],
  emit: EmitFn,
  previousReport?: string,
  documentContext?: string,
): Promise<{ report: string; sources: Source[] }> {
  emit('step', {
    phase: 'synthesizing',
    message: previousReport
      ? 'Extending existing report with new findings...'
      : 'Synthesizing findings into a structured report...',
  });

  const findingsText = findings
    .map(f => `### Sub-question: ${f.question}\n\n${f.answer}`)
    .join('\n\n---\n\n');

  const allSources = findings.flatMap(f => f.sources);
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());

  const sourcesText = uniqueSources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n');

  const docSection = documentContext
    ? `\n\nAdditional context from user-uploaded documents (treat these as primary sources where relevant — cite by document name):\n\n${documentContext}`
    : '';

  const userContent = previousReport
    ? `You are a research analyst extending an existing report with new findings.

Original question: "${originalQuery}"

Existing report:
${previousReport}

New research findings:
${findingsText}

Available sources (new):
${sourcesText}

Rewrite the report incorporating the new findings. Retain valuable content from the existing report, integrate the new research, and update or expand sections as needed. Keep the same markdown format:
1. **Executive Summary** (updated to reflect all findings)
2. **Key Findings** (bullet points, including new ones)
3. **Detailed Analysis** (expanded sections with inline citations like [1], [2])
4. **Conclusion**${docSection}`
    : `You are a research analyst. Based on the research findings below, write a comprehensive, well-structured report that directly answers the original question.

Original question: "${originalQuery}"

Research findings:
${findingsText}

Available sources:
${sourcesText}${docSection}

Write a professional markdown report with:
1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (bullet points)
3. **Detailed Analysis** (organized sections with inline citations like [1], [2])
4. **Conclusion**

Be thorough, well-organized, and cite sources inline where relevant.`;

  const synthMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userContent },
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 4096,
    messages: synthMessages,
  });
  const latencyMs = Date.now() - start;

  const report = response.choices[0].message.content ?? '';

  emit('trace', {
    phase: 'synthesizing',
    label: 'Synthesizer',
    messages: synthMessages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    response: report,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs,
  } as TraceEntry);

  return { report, sources: uniqueSources };
}
