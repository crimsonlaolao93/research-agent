import { useEffect, useRef } from "react";
import { ActivityItem, StepEvent, SearchEvent, AgentPhase } from "../types";

interface Props {
  activity: ActivityItem[];
  isRunning: boolean;
}

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

export default function AgentActivityFeed({ activity, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white font-medium text-sm">Agent Activity</h3>
        {isRunning && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs">Live</span>
          </span>
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
    </div>
  );
}

function StepItem({ data }: { data: StepEvent }) {
  return (
    <div className="flex gap-2 items-start py-1">
      <span
        className={`font-mono font-semibold shrink-0 ${PHASE_COLOR[data.phase]}`}
      >
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
