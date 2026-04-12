import { useState, FormEvent } from "react";

interface Props {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  "What are the latest advances in quantum computing?",
  "How does CRISPR gene editing work and what are its applications?",
  "What is the current state of large language models?",
  "What are the most promising approaches to carbon capture technology?",
  "How do transformer neural networks work?",
  "What is the economic impact of automation on the labor market?",
  "How does mRNA vaccine technology work?",
  "What are the key differences between AGI and current AI systems?",
  "What is the state of nuclear fusion energy research?",
  "How does the global supply chain for semiconductors work?",
  "What are the long-term effects of social media on mental health?",
  "How does zero-knowledge proof cryptography work?",
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function ResearchInput({ onSubmit, isLoading }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions] = useState(() => pickRandom(EXAMPLE_QUERIES, 3));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-white font-semibold text-base mb-1">
        What would you like to research?
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        The agent will plan, search the web, and synthesize a full report.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your research question..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? "Researching..." : "Research"}
        </button>
      </form>
      {!isLoading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
