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
