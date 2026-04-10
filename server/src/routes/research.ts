import { Router, Request, Response } from "express";
import { planResearch } from "../agents/planner";
import { researchSubQuestion } from "../agents/researcher";
import { synthesizeReport } from "../agents/synthesizer";
import { evaluateReport } from "../agents/evaluator";
import { EmitFn } from "../types";

const router = Router();

router.get("/research", async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!query?.trim()) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

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
    // 1. Plan — break query into sub-questions
    const subQuestions = await planResearch(query, emit);

    // 2. Research all sub-questions in parallel
    const findings = await Promise.all(
      subQuestions.map((subQuestion) => researchSubQuestion(subQuestion, emit)),
    );

    // 3. Synthesize findings into a report
    const { report, sources } = await synthesizeReport(query, findings, emit);

    // 4. Evaluate the report
    const evaluation = await evaluateReport(query, report, emit);

    // 5. Send final result
    emit("result", { query, report, sources, evaluation });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("[research] Error:", error);
    emit("error", { message });
  } finally {
    res.end();
  }
});

export default router;
