export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface Finding {
  question: string;
  answer: string;
  sources: Source[];
}

export interface Evaluation {
  score: number;
  completeness: string;
  strengths: string[];
  gaps: string[];
}

export interface ResearchResult {
  query: string;
  report: string;
  sources: Source[];
  evaluation: Evaluation;
}

export type EmitFn = (event: string, data: unknown) => void;

export interface TraceMessage {
  role: string;
  content: string;
}

export interface TraceEntry {
  phase: string;
  label: string;
  messages: TraceMessage[];
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
