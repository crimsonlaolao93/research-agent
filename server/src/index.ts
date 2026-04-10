import "./env";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import researchRouter from "./routes/research";

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === "production";

// In production the frontend is served from the same origin, so no CORS needed.
// In dev, allow the Vite dev server. CORS_ORIGIN can override either way.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? (isProd ? false : "http://localhost:5173"),
  })
);
app.use(express.json());

app.use("/api", researchRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve the built React app in production
if (isProd) {
  const clientDist = path.join(__dirname, "../../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // Catch-all: let React Router handle unknown paths
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn("[warn] client/dist not found — frontend will not be served");
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
