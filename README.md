# Research Agent

An AI-powered research tool that takes a question and produces a comprehensive, cited report. A multi-agent pipeline breaks the question into sub-topics, searches the web for each one, synthesizes the findings, and evaluates the result — all streamed live to the browser.

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

## Features

### Report export
Once a report is complete, three download options appear above the report:
- **Markdown** — the full report, sources, and quality evaluation as a `.md` file
- **JSON** — the raw `ResearchResult` object as prettified `.json`
- **Print / PDF** — triggers the browser's native print dialog (save as PDF)

Filenames are derived from the query (e.g. `what-is-quantum-computing.md`).

### Trace inspector
Each agent call emits a structured `trace` event containing the raw prompt messages sent to the LLM, the raw response, token counts (input/output), and wall-clock latency. A **Traces** button appears in the activity feed once the first trace arrives. Clicking it opens a modal showing every agent call with:
- Collapsible prompt section (full conversation history, including tool calls and search results for the researcher)
- Raw LLM response
- Token counts and latency per call

This makes it straightforward to debug prompt failures and iterate on agent behaviour without touching backend logs.

### Run metrics
After a run completes, a **Run Metrics** panel appears at the bottom of the activity feed showing a per-phase breakdown of:
- **Latency** — wall-clock time per phase. For the researcher (parallel sub-questions) this is the max across sub-question traces, not the sum
- **Proportional bar** — instantly shows which agent is the bottleneck
- **Token counts** — input/output per phase in compact notation (e.g. `2.1k`)
- **Total tokens** — combined across the whole run

### Randomised example prompts
The query input shows 3 example prompts picked at random on each page load from a pool of 12 covering AI, biotech, energy, cryptography, economics, and more.

## Tech stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS |
| Backend   | Node.js, Express, TypeScript, tsx |
| LLM       | DeepSeek (`deepseek-chat`) via OpenAI-compatible API |
| Search    | Tavily Web Search API |
| Streaming | Server-Sent Events (SSE) |

## Getting started

### Prerequisites

- Node.js 18+
- A [DeepSeek API key](https://platform.deepseek.com/)
- A [Tavily API key](https://tavily.com/)

### Installation

```bash
git clone <your-repo-url>
cd research-agent
npm install
```

### Configuration

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

Starts both servers concurrently:

- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:3001

## Project structure

```
research-agent/
├── railway.toml             # Railway deployment config
├── client/                  # React frontend
│   └── src/
│       ├── App.tsx          # SSE connection, state management, trace collection
│       ├── components/
│       │   ├── ResearchInput.tsx     # Query input + randomised example prompts
│       │   ├── AgentActivityFeed.tsx # Live activity log + run metrics panel
│       │   ├── ResearchReport.tsx    # Markdown report + sources + export buttons
│       │   └── TraceInspector.tsx   # Modal showing raw prompts/responses per agent
│       └── types/
└── server/                  # Express backend
    └── src/
        ├── index.ts         # Server entry point, static file serving in production
        ├── routes/
        │   └── research.ts  # SSE endpoint — orchestrates the pipeline
        ├── agents/
        │   ├── planner.ts   # Decomposes query into sub-questions, emits trace
        │   ├── researcher.ts # Web search tool-use loop per sub-question, emits trace
        │   ├── synthesizer.ts # Merges findings into a report, emits trace
        │   └── evaluator.ts  # Scores and critiques the report, emits trace
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
| `trace`  | `{ phase, label, messages, response, inputTokens, outputTokens, latencyMs }` | Raw LLM call data |
| `result` | `{ query, report, sources, evaluation }` | Final report |
| `error`  | `{ message }` | Pipeline error |

## Deployment

The project is configured for deployment as a single service on [Railway](https://railway.app). The Express server serves the built React app in production, so there is no need for a separate frontend host or CORS configuration.

### Deploy to Railway

**1. Push to GitHub**
```bash
git add .
git commit -m "initial commit"
git push
```

**2. Create a Railway project**

Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**, then select this repository. Railway will detect `railway.toml` automatically.

**3. Set environment variables**

In Railway → your service → **Variables**:

```
DEEPSEEK_API_KEY   = your-key-here
TAVILY_API_KEY     = your-key-here
NODE_ENV           = production
```

> `PORT` is set automatically by Railway — do not add it manually.

**4. Deploy**

Railway builds and deploys on every push to `main`. The build runs `npm install && npm run build` (compiles TypeScript and bundles React), then starts the server with `npm start`. Your app will be live at a `*.railway.app` URL.

### How the production build works

```
npm run build
  ├── server: tsc → server/dist/
  └── client: vite build → client/dist/

npm start
  └── node server/dist/index.js
        ├── serves /api/* routes (SSE pipeline)
        ├── serves client/dist/ as static files
        └── catch-all → client/dist/index.html
```
