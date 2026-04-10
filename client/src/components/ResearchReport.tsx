import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResearchResult } from "../types";

interface Props {
  result: ResearchResult;
}

export default function ResearchReport({ result }: Props) {
  const { report, sources, evaluation } = result;
  const scoreColor =
    evaluation.score >= 80
      ? "#4ade80"
      : evaluation.score >= 60
        ? "#facc15"
        : "#f87171";

  return (
    <div className="space-y-4">
      {/* Quality evaluation card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm">Report Quality</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>
              {evaluation.score}
            </span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
        </div>
        <p className="text-gray-400 text-xs mb-4">{evaluation.completeness}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-green-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Strengths
            </p>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-1.5">
                  <span className="text-green-600">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Gaps
            </p>
            <ul className="space-y-1">
              {evaluation.gaps.map((g, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-1.5">
                  <span className="text-yellow-600">!</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-white font-medium text-sm mb-5">Research Report</h3>
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-a:text-blue-400 prose-code:text-gray-200 prose-code:bg-gray-800 prose-pre:bg-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        </div>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-white font-medium text-sm mb-3">
            Sources
            <span className="ml-2 text-gray-600 font-normal">
              ({sources.length})
            </span>
          </h3>
          <div className="space-y-3">
            {sources.map((source, i) => (
              <div key={source.url} className="flex gap-3 items-start">
                <span className="text-gray-600 text-xs shrink-0 mt-0.5 font-mono">
                  [{i + 1}]
                </span>
                <div className="min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium block truncate transition-colors"
                  >
                    {source.title}
                  </a>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                    {source.snippet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
