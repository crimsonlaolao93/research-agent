export type AgentPhase =
  | "planning"
  | "researching"
  | "synthesizing"
  | "evaluating";

export interface StepEvent {
  phase: AgentPhase;
  message: string;
}

export interface SearchEvent {
  query: string;
  subQuestion: string;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
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

export interface ActivityItem {
  id: string;
  type: "step" | "search";
  data: StepEvent | SearchEvent;
  timestamp: Date;
}

export interface Session {
  id: string;
  query: string;
  timestamp: string; // ISO string
  result: ResearchResult;
  traces: TraceEntry[];
}

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
