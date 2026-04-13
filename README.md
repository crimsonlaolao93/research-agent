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
        │ Synthesizer │  Streams the report token-by-token to the browser
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  Evaluator  │  Scores the report and identifies strengths / gaps
        └─────────────┘
```

Sub-questions are researched in parallel with `Promise.all`, so total research time scales with the slowest sub-question rather than the sum of all of them. Progress is streamed to the browser in real time via **Server-Sent Events (SSE)** — agent steps, web searches, and report tokens all arrive as they happen.

## Features

### Streaming report rendering

The synthesizer streams its output token-by-token. The report appears word-by-word in the browser as DeepSeek writes it — no waiting for the full generation to complete before seeing anything. A pulsing **Writing...** indicator shows while the stream is active, then the full report view (with sources, quality score, and export buttons) takes over once generation finishes.

### Knowledge base (RAG)

Upload `.txt`, `.md`, or `.pdf` files (up to 10 MB each) to a collapsible **Knowledge Base** panel. Documents are chunked, embedded using a local ONNX model (`all-MiniLM-L6-v2` via `@xenova/transformers`), and stored in an in-memory vector store. On the next research query the top-5 most relevant passages are retrieved and injected into the synthesizer prompt as primary sources. No API key required — embeddings run entirely in-process.

### Session history

Completed research sessions are saved to browser `localStorage` automatically. The **History** button in the header opens a panel listing all past sessions. Clicking any session restores its report and traces instantly without re-running the pipeline.

### Follow-up queries

A follow-up input below each report lets you ask a related question. The agent receives the existing report as context and focuses its new research on aspects not already covered, then merges the new findings into an updated report.

### Report export

Three download options appear above every completed report:

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

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS             |
| Backend    | Node.js, Express, TypeScript, tsx                    |
| LLM        | DeepSeek (`deepseek-chat`) via OpenAI-compatible API |
| Embeddings | Local ONNX model via `@xenova/transformers` (no API key) |
| Vector DB  | pgvector (PostgreSQL) with in-memory fallback        |
| Search     | Tavily Web Search API                                |
| Streaming  | Server-Sent Events (SSE)                             |

## Getting started

### Prerequisites

- Node.js 18+
- A [DeepSeek API key](https://platform.deepseek.com/) — used for planning, research, synthesis, and evaluation
- A [Tavily API key](https://tavily.com/)
- (Optional) A PostgreSQL database with the [pgvector extension](https://github.com/pgvector/pgvector) — for persistent document storage across restarts

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

# Optional — enables persistent vector storage via pgvector.
# Without this, an in-memory store is used (documents lost on restart).
# DATABASE_URL=postgresql://user:password@localhost:5432/research_agent
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
│       ├── App.tsx          # SSE connection, state management, streaming report
│       ├── components/
│       │   ├── ResearchInput.tsx     # Query input + randomised example prompts
│       │   ├── AgentActivityFeed.tsx # Live activity log + run metrics panel
│       │   ├── ResearchReport.tsx    # Markdown report + sources + export buttons
│       │   ├── DocumentPanel.tsx     # Knowledge base upload and management
│       │   ├── SessionHistory.tsx    # Past sessions sidebar
│       │   └── TraceInspector.tsx    # Modal showing raw prompts/responses per agent
│       ├── hooks/
│       │   └── useSessionHistory.ts  # localStorage persistence for sessions
│       └── types/
└── server/                  # Express backend
    └── src/
        ├── index.ts         # Server entry point, static file serving in production
        ├── routes/
        │   ├── research.ts  # SSE endpoint — orchestrates the pipeline
        │   └── documents.ts # Document upload, listing, and deletion endpoints
        ├── agents/
        │   ├── planner.ts      # Decomposes query into sub-questions
        │   ├── researcher.ts   # Web search tool-use loop per sub-question
        │   ├── synthesizer.ts  # Streams report tokens, merges findings
        │   └── evaluator.ts    # Scores and critiques the report
        ├── lib/
        │   ├── db.ts           # pg Pool + initDb() — schema creation for pgvector
        │   ├── vectorStore.ts  # Dual-backend: pgvector (DATABASE_URL) or in-memory fallback
        │   ├── embeddings.ts   # Local ONNX embeddings via @xenova/transformers
        │   └── chunker.ts      # Document text chunking for ingestion
        └── tools/
            └── search.ts    # Tavily web search wrapper
```

## API

### `POST /api/research`

Body: `{ "query": string, "previousReport"?: string }`

Returns an SSE stream. Events:

| Event          | Payload                                                                      | Description                                  |
| -------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `step`         | `{ phase, message }`                                                         | Agent phase update                           |
| `search`       | `{ query, subQuestion }`                                                     | A web search was issued                      |
| `report_chunk` | `{ text }`                                                                   | A token chunk from the streaming synthesizer |
| `trace`        | `{ phase, label, messages, response, inputTokens, outputTokens, latencyMs }` | Raw LLM call data                            |
| `result`       | `{ query, report, sources, evaluation }`                                     | Final assembled report                       |
| `error`        | `{ message }`                                                                | Pipeline error                               |

### `GET /api/documents`

Returns `{ available: boolean, documents: DocumentMeta[] }`. `available` is always `true` — embeddings run locally via `@xenova/transformers` and require no API key.

### `POST /api/documents/upload`

Multipart form upload (`file` field). Accepts `.txt`, `.md`, `.pdf` up to 10 MB. Returns `{ docId, name, chunkCount }`.

### `DELETE /api/documents/:id`

Removes a document and all its chunks from the vector store.

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

**4a. (Recommended) Add a Postgres database for persistent document storage**

In your Railway project dashboard click **+ New** → **Database** → **Add PostgreSQL**. Railway automatically sets `DATABASE_URL` in your service's environment. The server will detect it and:

- Enable the `vector` extension on first startup
- Create the `documents` and `document_chunks` tables with an HNSW index
- Use pgvector for all document storage and similarity search

Without this step, uploaded documents are stored in memory and lost on each redeploy. No code changes are needed — the app switches backends automatically based on whether `DATABASE_URL` is present.

**4. Deploy**

Railway builds and deploys on every push to `main`. The build runs `npm install && npm run build` (compiles TypeScript and bundles React), then starts the server with `npm start`. Your app will be live at a `*.railway.app` URL.

### How the production build works

```
npm run build
  ├── server: tsc → server/dist/
  └── client: vite build → client/dist/

npm start
  └── node server/dist/index.js
        ├── serves /api/* routes (SSE pipeline + document endpoints)
        ├── serves client/dist/ as static files
        └── catch-all → client/dist/index.html
```

## Known limitations

- **Document persistence** — without `DATABASE_URL`, the in-memory vector store loses all uploaded documents on server restart. Add a Railway Postgres database (see deployment instructions) to persist documents across redeploys.
- **Session history** — stored in browser `localStorage` only; not synced across devices or users.
- **Self-evaluated quality score** — the evaluator uses the same model that wrote the report. Scores are optimistic by nature and should be treated as a rough guide rather than a reliable quality signal.
- **No authentication** — anyone with the URL can use your API keys. Add an auth layer before sharing the deployment publicly.
