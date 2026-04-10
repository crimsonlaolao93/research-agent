import { useEffect } from "react";
import { Session } from "../types";

interface Props {
  sessions: Session[];
  onRestore: (session: Session) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function SessionHistory({ sessions, onRestore, onDelete, onClearAll, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-base">Research History</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Last {sessions.length} session{sessions.length !== 1 ? "s" : ""} — click any to restore
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="p-4 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">
              No saved sessions yet — completed research runs will appear here.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-start gap-3 p-3 rounded-xl border border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 transition-all cursor-pointer"
                onClick={() => { onRestore(session); onClose(); }}
              >
                {/* Score badge */}
                <div className="shrink-0 text-center mt-0.5">
                  <span className={`text-sm font-bold ${scoreColor(session.result.evaluation.score)}`}>
                    {session.result.evaluation.score}
                  </span>
                  <p className="text-gray-700 text-xs leading-none">/100</p>
                </div>

                {/* Query + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                    {session.query}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {timeAgo(session.timestamp)} · {session.result.sources.length} sources · {session.traces.length} traces
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
