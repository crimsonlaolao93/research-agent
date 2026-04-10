import { useEffect, useState } from "react";
import { TraceEntry, TraceMessage } from "../types";

interface Props {
  traces: TraceEntry[];
  onClose: () => void;
}

const PHASE_BADGE: Record<string, string> = {
  planning: "bg-purple-900 text-purple-300 border-purple-700",
  researching: "bg-blue-900 text-blue-300 border-blue-700",
  synthesizing: "bg-green-900 text-green-300 border-green-700",
  evaluating: "bg-yellow-900 text-yellow-300 border-yellow-700",
};

const ROLE_BADGE: Record<string, string> = {
  user: "text-blue-400",
  assistant: "text-green-400",
  tool: "text-yellow-400",
  system: "text-gray-400",
};

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function MessageBubble({ msg }: { msg: TraceMessage }) {
  const roleColor = ROLE_BADGE[msg.role] ?? "text-gray-400";
  return (
    <div className="space-y-0.5">
      <p className={`text-xs font-semibold uppercase tracking-wide ${roleColor}`}>
        {msg.role}
      </p>
      <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto">
        {msg.content || "(empty)"}
      </pre>
    </div>
  );
}

function TraceCard({ trace }: { trace: TraceEntry }) {
  const [messagesOpen, setMessagesOpen] = useState(false);
  const badgeClass = PHASE_BADGE[trace.phase] ?? "bg-gray-800 text-gray-300 border-gray-600";
  const totalTokens = trace.inputTokens + trace.outputTokens;

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 bg-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${badgeClass}`}>
            {trace.phase}
          </span>
          <span className="text-white text-sm font-medium">{trace.label}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400 font-mono">
          <span title="Latency">{formatLatency(trace.latencyMs)}</span>
          <span title={`${trace.inputTokens} in / ${trace.outputTokens} out`}>
            ↑{trace.inputTokens} ↓{trace.outputTokens}
            <span className="text-gray-600 ml-1">({totalTokens} total)</span>
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Prompt — collapsible */}
        <div>
          <button
            onClick={() => setMessagesOpen((o) => !o)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors mb-2"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${messagesOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium uppercase tracking-wide">
              Prompt ({trace.messages.length} message{trace.messages.length !== 1 ? "s" : ""})
            </span>
          </button>
          {messagesOpen && (
            <div className="space-y-3 pl-2 border-l border-gray-700">
              {trace.messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
            </div>
          )}
        </div>

        {/* Response — always visible */}
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Response</p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono bg-gray-950 rounded-lg p-3 max-h-64 overflow-y-auto">
            {trace.response || "(no text response)"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function TraceInspector({ traces, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl my-8">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-base">Trace Inspector</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Raw prompts and responses for each agent call
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Trace list */}
        <div className="p-6 space-y-4">
          {traces.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No traces yet — traces appear as each agent finishes.
            </p>
          ) : (
            traces.map((trace, i) => <TraceCard key={i} trace={trace} />)
          )}
        </div>
      </div>
    </div>
  );
}
