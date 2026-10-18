import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth";
import { llmRouter } from "./routes/llm";
import { projectsRouter } from "./routes/projects";

const app = express();
const port = Number(process.env.PORT) || 5000;
const origin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(helmet());
app.use(
  cors({
    origin: [origin, "http://localhost:3000"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/llms", llmRouter);
app.use("/api/v1/projects", projectsRouter);

// Global Error Handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`🚀 PRD Maker Backend running on http://localhost:${port}`);
});

export default app;
