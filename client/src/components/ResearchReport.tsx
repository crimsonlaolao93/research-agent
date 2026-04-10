import { useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResearchResult } from "../types";

interface Props {
  result: ResearchResult;
  onFollowUp: (query: string) => void;
  isLoading: boolean;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toSafeFilename(query: string) {
  return query.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
}

export default function ResearchReport({ result, onFollowUp, isLoading }: Props) {
  const { query, report, sources, evaluation } = result;
  const [followUp, setFollowUp] = useState("");

  const handleFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (followUp.trim() && !isLoading) {
      onFollowUp(followUp.trim());
      setFollowUp("");
    }
  };
  const scoreColor =
    evaluation.score >= 80
      ? "#4ade80"
      : evaluation.score >= 60
        ? "#facc15"
        : "#f87171";

  const handleMarkdownExport = () => {
    const sourcesList = sources
      .map((s, i) => `[${i + 1}] [${s.title}](${s.url})\n    ${s.snippet}`)
      .join("\n\n");

    const md = [
      `# Research Report: ${query}`,
      "",
      report,
      "",
      "---",
      "",
      "## Sources",
      "",
      sourcesList,
      "",
      "---",
      "",
      "## Quality Evaluation",
      "",
      `**Score:** ${evaluation.score}/100`,
      "",
      `**Completeness:** ${evaluation.completeness}`,
      "",
      "**Strengths:**",
      evaluation.strengths.map((s) => `- ${s}`).join("\n"),
      "",
      "**Gaps:**",
      evaluation.gaps.map((g) => `- ${g}`).join("\n"),
    ].join("\n");

    downloadFile(md, `${toSafeFilename(query)}.md`, "text/markdown");
  };

  const handleJsonExport = () => {
    downloadFile(
      JSON.stringify(result, null, 2),
      `${toSafeFilename(query)}.json`,
      "application/json"
    );
  };

  const handlePdfExport = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Export toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-xs">Research complete</p>
        <div className="flex gap-2">
          <button
            onClick={handleMarkdownExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors border border-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Markdown
          </button>
          <button
            onClick={handleJsonExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors border border-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors border border-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

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

      {/* Follow-up */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <p className="text-gray-500 text-xs mb-3">Ask a follow-up — the agent will build on this research</p>
        <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
          <input
            type="text"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="e.g. Now focus on the regulatory implications..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !followUp.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? "Researching..." : "Follow up"}
          </button>
        </form>
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
