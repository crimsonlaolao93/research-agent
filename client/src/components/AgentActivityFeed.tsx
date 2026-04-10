import { useEffect, useRef } from "react";
import { ActivityItem, StepEvent, SearchEvent, AgentPhase, TraceEntry } from "../types";

interface Props {
  activity: ActivityItem[];
  isRunning: boolean;
  traces: TraceEntry[];
  onOpenTraces: () => void;
}

const PHASE_ORDER: AgentPhase[] = ["planning", "researching", "synthesizing", "evaluating"];

const PHASE_LABEL: Record<AgentPhase, string> = {
  planning: "Planning",
  researching: "Researching",
  synthesizing: "Synthesizing",
  evaluating: "Evaluating",
};

const PHASE_COLOR: Record<AgentPhase, string> = {
  planning: "text-purple-400",
  researching: "text-blue-400",
  synthesizing: "text-green-400",
  evaluating: "text-yellow-400",
};

const PHASE_BAR: Record<AgentPhase, string> = {
  planning: "bg-purple-500",
  researching: "bg-blue-500",
  synthesizing: "bg-green-500",
  evaluating: "bg-yellow-500",
};

function fmtLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface PhaseMetric {
  latencyMs: number;   // wall-clock: max for parallel phases, sum otherwise
  inputTokens: number;
  outputTokens: number;
  count: number;
  parallel: boolean;
}

function aggregateTraces(traces: TraceEntry[]): Partial<Record<AgentPhase, PhaseMetric>> {
  const map: Partial<Record<AgentPhase, PhaseMetric>> = {};
  for (const t of traces) {
    const phase = t.phase as AgentPhase;
    if (!map[phase]) {
      map[phase] = { latencyMs: 0, inputTokens: 0, outputTokens: 0, count: 0, parallel: false };
    }
    const entry = map[phase]!;
    entry.inputTokens += t.inputTokens;
    entry.outputTokens += t.outputTokens;
    entry.count++;
    // Researcher sub-questions run in parallel — wall-clock ≈ max, not sum
    if (phase === "researching") {
      entry.latencyMs = Math.max(entry.latencyMs, t.latencyMs);
      entry.parallel = entry.count > 1;
    } else {
      entry.latencyMs += t.latencyMs;
    }
  }
  return map;
}

function RunMetrics({ traces }: { traces: TraceEntry[] }) {
  const metrics = aggregateTraces(traces);
  const phases = PHASE_ORDER.filter((p) => metrics[p]);
  if (phases.length === 0) return null;

  const maxLatency = Math.max(...phases.map((p) => metrics[p]!.latencyMs));
  const totalIn = phases.reduce((s, p) => s + metrics[p]!.inputTokens, 0);
  const totalOut = phases.reduce((s, p) => s + metrics[p]!.outputTokens, 0);
  const hasParallel = phases.some((p) => metrics[p]!.parallel);

  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">
        Run Metrics
      </p>
      <div className="space-y-2.5">
        {phases.map((phase) => {
          const m = metrics[phase]!;
          const barPct = maxLatency > 0 ? (m.latencyMs / maxLatency) * 100 : 0;
          return (
            <div key={phase}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium w-24 shrink-0 ${PHASE_COLOR[phase]}`}>
                  {PHASE_LABEL[phase]}
                  {m.parallel && <span className="text-gray-600 ml-0.5">*</span>}
                </span>
                <span className="text-gray-400 text-xs font-mono w-10 shrink-0">
                  {fmtLatency(m.latencyMs)}
                </span>
                <span className="text-gray-600 text-xs font-mono ml-auto">
                  ↑{fmtTokens(m.inputTokens)} ↓{fmtTokens(m.outputTokens)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${PHASE_BAR[phase]}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-800">
        <span className="text-gray-600 text-xs">Total tokens</span>
        <span className="text-gray-400 text-xs font-mono">
          ↑{fmtTokens(totalIn)} ↓{fmtTokens(totalOut)}
          <span className="text-gray-600 ml-1">({fmtTokens(totalIn + totalOut)})</span>
        </span>
      </div>
      {hasParallel && (
        <p className="text-gray-700 text-xs mt-1.5">* ran in parallel — latency = slowest sub-question</p>
      )}
    </div>
  );
}

export default function AgentActivityFeed({ activity, isRunning, traces, onOpenTraces }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium text-sm">Agent Activity</h3>
          {isRunning && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Live</span>
            </span>
          )}
        </div>
        {traces.length > 0 && (
          <button
            onClick={onOpenTraces}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-colors border border-gray-700"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
            </svg>
            Traces ({traces.length})
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
        {activity.length === 0 && (
          <p className="text-gray-600 text-xs">Waiting for agent to start...</p>
        )}
        {activity.map((item) => (
          <div key={item.id} className="text-xs">
            {item.type === "step" ? (
              <StepItem data={item.data as StepEvent} />
            ) : (
              <SearchItem data={item.data as SearchEvent} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!isRunning && traces.length > 0 && <RunMetrics traces={traces} />}
    </div>
  );
}

function StepItem({ data }: { data: StepEvent }) {
  return (
    <div className="flex gap-2 items-start py-1">
      <span className={`font-mono font-semibold shrink-0 ${PHASE_COLOR[data.phase]}`}>
        [{PHASE_LABEL[data.phase]}]
      </span>
      <span className="text-gray-300 leading-relaxed">{data.message}</span>
    </div>
  );
}

function SearchItem({ data }: { data: SearchEvent }) {
  return (
    <div className="flex gap-2 items-start py-0.5 pl-3 ml-1 border-l border-gray-700">
      <span className="text-gray-600 shrink-0">search</span>
      <span className="text-gray-400 italic truncate">{data.query}</span>
    </div>
  );
}
