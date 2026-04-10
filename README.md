# Research Agent

An AI-powered research tool that takes a question and produces a comprehensive, cited report. A multi-agent pipeline breaks the question into sub-topics, searches the web for each one, synthesizes the findings, and evaluates the result — all streamed live to the browser.

![Research Agent UI](https://placehold.co/800x400?text=Research+Agent)

## How it works

```
User query
    │
    ▼
┌─────────────┐
│   Planner   │  Breaks the query into 3–5 focused sub-questions
└──────┬──────┘
       │
       ├──────────────────────┐ (parallel)
       ▼                      ▼
┌────────────┐          ┌────────────┐
│ Researcher │  . . .   │ Researcher │  Each calls DeepSeek with web_search
│ sub-Q #1  │          │ sub-Q #N  │  tool until it has enough information
└─────┬──────┘          └─────┬──────┘
      └──────────┬────────────┘
                 ▼
        ┌─────────────┐
        │ Synthesizer │  Merges all findings into a structured markdown report
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  Evaluator  │  Scores the report and identifies strengths / gaps
        └─────────────┘
```

Sub-questions are researched in parallel with `Promise.all`, so total research time scales with the slowest sub-question rather than the sum of all of them. Progress is streamed to the browser in real time via **Server-Sent Events (SSE)**, so you can watch each agent step and web search as they happen.

## Tech stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express, TypeScript, tsx |
| LLM      | DeepSeek (`deepseek-chat`) via OpenAI-compatible API |
| Search   | Tavily Web Search API |
| Streaming | Server-Sent Events (SSE) |

## Getting started

### Prerequisites

- Node.js 18+
- A [DeepSeek API key](https://platform.deepseek.com/)
- A [Tavily API key](https://tavily.com/)

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd research-agent

# Install all dependencies (client + server via npm workspaces)
npm install
```

### Configuration

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

```env
DEEPSEEK_API_KEY=your-deepseek-api-key
TAVILY_API_KEY=your-tavily-api-key
PORT=3001
```

### Running locally

```bash
npm run dev
```

This starts both servers concurrently:

- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:3001

## Project structure

```
research-agent/
├── client/                  # React frontend
│   └── src/
│       ├── App.tsx          # SSE connection + state management
│       ├── components/
│       │   ├── ResearchInput.tsx     # Query input + example prompts
│       │   ├── AgentActivityFeed.tsx # Live streaming activity log
│       │   └── ResearchReport.tsx   # Markdown report + sources + score
│       └── types/
└── server/                  # Express backend
    └── src/
        ├── index.ts         # Server entry point
        ├── routes/
        │   └── research.ts  # SSE endpoint — orchestrates the pipeline
        ├── agents/
        │   ├── planner.ts   # Decomposes query into sub-questions
        │   ├── researcher.ts # Web search tool-use loop per sub-question
        │   ├── synthesizer.ts # Merges findings into a report
        │   └── evaluator.ts  # Scores and critiques the report
        └── tools/
            └── search.ts    # Tavily web search wrapper
```

## API

### `GET /api/research?q=<query>`

Returns an SSE stream. Events:

| Event    | Payload | Description |
|----------|---------|-------------|
| `step`   | `{ phase, message }` | Agent phase update |
| `search` | `{ query, subQuestion }` | A web search was issued |
| `result` | `{ query, report, sources, evaluation }` | Final report |
| `error`  | `{ message }` | Pipeline error |
