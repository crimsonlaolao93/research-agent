import { useState, useRef } from "react";
import ResearchInput from "./components/ResearchInput";
import AgentActivityFeed from "./components/AgentActivityFeed";
import ResearchReport from "./components/ResearchReport";
import TraceInspector from "./components/TraceInspector";
import { ActivityItem, ResearchResult, TraceEntry } from "./types";

type AppState = "idle" | "running" | "done" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const resultReceived = useRef(false);

  const handleResearch = (query: string) => {
    setState("running");
    setActivity([]);
    setResult(null);
    setError(null);
    setTraces([]);
    setInspectorOpen(false);
    resultReceived.current = false;

    const url = `/api/research?q=${encodeURIComponent(query)}`;
    const eventSource = new EventSource(url);

    const addActivity = (
      type: "step" | "search",
      data: ActivityItem["data"],
    ) => {
      setActivity((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type, data, timestamp: new Date() },
      ]);
    };

    eventSource.addEventListener("step", (e: MessageEvent) => {
      addActivity("step", JSON.parse(e.data));
    });

    eventSource.addEventListener("search", (e: MessageEvent) => {
      addActivity("search", JSON.parse(e.data));
    });

    eventSource.addEventListener("trace", (e: MessageEvent) => {
      setTraces((prev) => [...prev, JSON.parse(e.data) as TraceEntry]);
    });

    eventSource.addEventListener("result", (e: MessageEvent) => {
      resultReceived.current = true;
      setResult(JSON.parse(e.data) as ResearchResult);
      setState("done");
      eventSource.close();
    });

    let serverErrorReceived = false;

    eventSource.addEventListener("error", (e: MessageEvent) => {
      serverErrorReceived = true;
      const data = JSON.parse(e.data ?? "{}") as { message?: string };
      setError(data.message ?? "An error occurred");
      setState("error");
      eventSource.close();
    });

    // onerror fires on connection failure or when the stream closes naturally
    eventSource.onerror = () => {
      if (!resultReceived.current && !serverErrorReceived) {
        setError("Connection lost. Please try again.");
        setState("error");
      }
      eventSource.close();
    };
  };

  const isActive = state === "running" || state === "done" || state === "error";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">R</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-none">
              Research Agent
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              AI-powered multi-step research
            </p>
          </div>
        </div>
      </header>

      {inspectorOpen && (
        <TraceInspector traces={traces} onClose={() => setInspectorOpen(false)} />
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <ResearchInput
          onSubmit={handleResearch}
          isLoading={state === "running"}
        />

        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Activity feed — left column */}
            <div className="lg:col-span-1">
              <AgentActivityFeed
                activity={activity}
                isRunning={state === "running"}
                traces={traces}
                onOpenTraces={() => setInspectorOpen(true)}
              />
            </div>

            {/* Report — right columns */}
            <div className="lg:col-span-2">
              {error && (
                <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
                  {error}
                </div>
              )}
              {result && <ResearchReport result={result} />}
              {state === "running" && !result && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 text-sm">
                      Generating report...
                    </p>
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
