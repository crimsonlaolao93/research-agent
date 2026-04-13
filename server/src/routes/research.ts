import { Router, Request, Response } from "express";
import { planResearch } from "../agents/planner";
import { researchSubQuestion } from "../agents/researcher";
import { synthesizeReport } from "../agents/synthesizer";
import { evaluateReport } from "../agents/evaluator";
import { EmitFn } from "../types";
import { vectorStore } from "../lib/vectorStore";
import { embedText, embeddingsAvailable } from "../lib/embeddings";

const router = Router();

async function runPipeline(
  query: string,
  previousReport: string | undefined,
  res: Response,
) {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const emit: EmitFn = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Retrieve relevant document chunks from the vector store (RAG)
    let documentContext: string | undefined;
    if (embeddingsAvailable && vectorStore.chunkCount > 0) {
      try {
        const queryEmbedding = await embedText(query);
        const chunks = vectorStore.search(queryEmbedding, 5);
        if (chunks.length > 0) {
          emit("step", {
            phase: "planning",
            message: `Found ${chunks.length} relevant passage${chunks.length > 1 ? "s" : ""} from uploaded documents`,
          });
          documentContext = chunks
            .map((c) => `[Source: ${c.docName}]\n${c.text}`)
            .join("\n\n---\n\n");
        }
      } catch (err) {
        // RAG failure must not break the main pipeline
        console.warn(
          "[research] RAG retrieval failed, continuing without:",
          err,
        );
      }
    }

    const subQuestions = await planResearch(query, emit, previousReport);

    const findings = await Promise.all(
      subQuestions.map((subQuestion) => researchSubQuestion(subQuestion, emit)),
    );

    const { report, sources } = await synthesizeReport(
      query,
      findings,
      emit,
      previousReport,
      documentContext,
    );

    const evaluation = await evaluateReport(query, report, emit);

    emit("result", { query, report, sources, evaluation });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("[research] Error:", error);
    emit("error", { message });
  } finally {
    res.end();
  }
}

// GET — new queries (keeps backward-compat, e.g. direct URL access)
router.get("/research", async (req: Request, res: Response) => {
  const query = (req.query.q as string)?.trim();
  if (!query) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }
  await runPipeline(query, undefined, res);
});

// POST — supports previousReport for follow-up queries
router.post("/research", async (req: Request, res: Response) => {
  const { query, previousReport } = req.body as {
    query?: string;
    previousReport?: string;
  };
  if (!query?.trim()) {
    res.status(400).json({ error: '"query" is required' });
    return;
  }
  await runPipeline(query.trim(), previousReport, res);
});

export default router;
