import { useState, useRef } from "react";
import DocumentPanel from "./components/DocumentPanel";
import ResearchInput from "./components/ResearchInput";
import AgentActivityFeed from "./components/AgentActivityFeed";
import ResearchReport from "./components/ResearchReport";
import TraceInspector from "./components/TraceInspector";
import SessionHistory from "./components/SessionHistory";
import { useSessionHistory } from "./hooks/useSessionHistory";
import { ActivityItem, ResearchResult, TraceEntry } from "./types";

type AppState = "idle" | "running" | "done" | "error";

// Parse a single SSE message block (separated by \n\n) into { event, data }
function parseSseMessage(block: string): { event: string; data: string } | null {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) data = line.slice(6);
  }
  return data ? { event, data } : null;
}

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { sessions, saveSession, deleteSession, clearAll } = useSessionHistory();
  const abortRef = useRef<AbortController | null>(null);

  const handleResearch = async (query: string, previousReport?: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("running");
    setActivity([]);
    setResult(null);
    setError(null);
    setTraces([]);
    setInspectorOpen(false);

    const addActivity = (type: "step" | "search", data: ActivityItem["data"]) => {
      setActivity((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type, data, timestamp: new Date() },
      ]);
    };

    let finalResult: ResearchResult | null = null;
    let finalTraces: TraceEntry[] = [];

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, previousReport }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const msg = parseSseMessage(part);
          if (!msg) continue;
          const data = JSON.parse(msg.data);

          switch (msg.event) {
            case "step":
              addActivity("step", data);
              break;
            case "search":
              addActivity("search", data);
              break;
            case "trace":
              finalTraces = [...finalTraces, data as TraceEntry];
              setTraces((prev) => [...prev, data as TraceEntry]);
              break;
            case "result":
              finalResult = data as ResearchResult;
              setResult(finalResult);
              setState("done");
              break;
            case "error":
              setError((data as { message: string }).message);
              setState("error");
              break;
          }
        }
      }

      // Auto-save on success
      if (finalResult) {
        saveSession(finalResult, finalTraces);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Connection lost. Please try again.");
      setState("error");
    }
  };

  const handleFollowUp = (followUpQuery: string) => {
    if (result) {
      handleResearch(followUpQuery, result.report);
    }
  };

  const handleRestore = (session: ReturnType<typeof useSessionHistory>["sessions"][number]) => {
    setState("done");
    setActivity([]);
    setResult(session.result);
    setTraces(session.traces);
    setError(null);
    setInspectorOpen(false);
  };

  const isActive = state === "running" || state === "done" || state === "error";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-base leading-none">Research Agent</h1>
              <p className="text-gray-500 text-xs mt-0.5">AI-powered multi-step research</p>
            </div>
          </div>

          {/* History button */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-colors border border-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
            {sessions.length > 0 && (
              <span className="bg-gray-700 text-gray-300 rounded-full px-1.5 py-0.5 text-xs leading-none">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Modals */}
      {inspectorOpen && (
        <TraceInspector traces={traces} onClose={() => setInspectorOpen(false)} />
      )}
      {historyOpen && (
        <SessionHistory
          sessions={sessions}
          onRestore={handleRestore}
          onDelete={deleteSession}
          onClearAll={clearAll}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <DocumentPanel />
        <ResearchInput onSubmit={(q) => handleResearch(q)} isLoading={state === "running"} />

        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Activity feed */}
            <div className="lg:col-span-1">
              <AgentActivityFeed
                activity={activity}
                isRunning={state === "running"}
                traces={traces}
                onOpenTraces={() => setInspectorOpen(true)}
              />
            </div>

            {/* Report */}
            <div className="lg:col-span-2">
              {error && (
                <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
                  {error}
                </div>
              )}
              {result && (
                <ResearchReport
                  result={result}
                  onFollowUp={handleFollowUp}
                  isLoading={state === "running"}
                />
              )}
              {state === "running" && !result && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 text-sm">Generating report...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
