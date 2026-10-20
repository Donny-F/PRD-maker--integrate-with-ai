import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth";
import { llmRouter } from "./routes/llm";
import { projectsRouter } from "./routes/projects";
import { usersRouter } from "./routes/users";

const app = express();
const port = Number(process.env.PORT);
const origin = process.env.CORS_ORIGIN || "";

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
app.use("/api/v1/users", usersRouter);

// Global Error Handler
// Log the full error server-side, but never expose internal details to clients.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`🚀 PRD Maker Backend running on http://localhost:${port}`);
});

export default app;
