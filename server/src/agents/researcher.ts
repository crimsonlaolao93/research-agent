import OpenAI from 'openai';
import { webSearch } from '../tools/search';
import { EmitFn, Finding, Source } from '../types';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const SEARCH_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web to find current, accurate information on a topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up',
        },
      },
      required: ['query'],
    },
  },
};

export async function researchSubQuestion(subQuestion: string, emit: EmitFn): Promise<Finding> {
  emit('step', {
    phase: 'researching',
    message: `Researching: "${subQuestion}"`,
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Research the following question thoroughly using web search. Search multiple times with different queries to gather comprehensive information. When you have enough information, provide a detailed, well-sourced answer.

Question: ${subQuestion}`,
    },
  ];

  const allSources: Source[] = [];
  let finalAnswer = '';

  // Tool use loop — max 5 search iterations
  for (let i = 0; i < 5; i++) {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 2048,
      tools: [SEARCH_TOOL],
      messages,
    });

    const choice = response.choices[0];

    messages.push({
      role: 'assistant',
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    });

    if (choice.finish_reason === 'stop') {
      finalAnswer = choice.message.content ?? '';
      break;
    }

    if (choice.finish_reason !== 'tool_calls') break;

    const toolCalls = choice.message.tool_calls ?? [];

    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function' && toolCall.function.name === 'web_search') {
        const input = JSON.parse(toolCall.function.arguments) as { query: string };
        emit('search', { query: input.query, subQuestion });

        const { results, rawText } = await webSearch(input.query);
        allSources.push(...results);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: rawText,
        });
      }
    }
  }

  // Deduplicate sources by URL, keep top 8
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values()).slice(0, 8);

  return { question: subQuestion, answer: finalAnswer, sources: uniqueSources };
}
