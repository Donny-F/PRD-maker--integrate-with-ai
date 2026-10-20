import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { authMiddleware, AuthenticatedUser } from "../middleware/auth";
import {
  LlmQuotaExhaustedError,
  generateClarifications,
  streamPRDDocument,
  generateDiagramData,
  streamPRDRevision,
} from "../services/llm";
import { Prisma, Role } from "@prisma/client";

export const projectsRouter = Router();

// Helper to authenticate SSE requests which may pass token via query parameter ?token=...
function authenticateSseRequest(req: Request): AuthenticatedUser | null {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser & { sub?: string };
    return {
      id: decoded.id || decoded.sub || "",
      email: decoded.email,
      role: decoded.role || Role.USER,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

// List all projects for current user
projectsRouter.get("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const projects = await prisma.project.findMany({
    // where: req.user!.role === Role.ADMIN ? {} : { userId },
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        select: {
          id: true,
          versionNumber: true,
          createdAt: true,
          revisionPrompt: true,
        },
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  res.json({ projects });
});

// Create new project. Clarifications are written together with the project so
// no project row exists until the AI step that produced them has succeeded.
projectsRouter.post("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { title, initialPrompt, clarifications } = req.body;
  if (!title || !initialPrompt) {
    res.status(400).json({ error: "Title and initialPrompt are required" });
    return;
  }
  if (clarifications !== undefined && !Array.isArray(clarifications)) {
    res.status(400).json({ error: "clarifications must be an array" });
    return;
  }

  const project = await prisma.project.create({
    data: {
      userId: req.user!.id,
      title: title.trim(),
      initialPrompt: initialPrompt.trim(),
      clarifications: clarifications ?? [],
    },
  });

  res.status(201).json({ project });
});

// Step 2 preview: generate clarification questions without persisting a project.
// Decoupled from project creation so a provider failure leaves no orphan project.
projectsRouter.post(
  "/clarifications",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { initialPrompt, llmConfigId } = req.body;
    if (!initialPrompt || typeof initialPrompt !== "string") {
      res.status(400).json({ error: "initialPrompt is required" });
      return;
    }

    try {
      const clarifications = await generateClarifications(
        initialPrompt.trim(),
        llmConfigId,
        `user:${req.user!.id}`
      );
      res.json(clarifications);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate clarifications";
      res.status(err instanceof LlmQuotaExhaustedError ? 402 : 500).json({ error: message });
    }
  }
);

// Get single project with versions and current version data
projectsRouter.get("/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.userId !== req.user!.id && req.user!.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden: Not your project" });
    return;
  }

  const currentVersion =
    project.versions.find((v) => v.id === project.currentVersionId) ||
    project.versions[0] ||
    null;

  res.json({
    project: {
      ...project,
      currentVersion,
    },
  });
});

// Step 3: Stream PRD via SSE
projectsRouter.get("/:id/stream-prd", async (req: Request, res: Response): Promise<void> => {
  const user = authenticateSseRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized SSE request" });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const llmConfigId = typeof req.query.llmConfigId === "string" ? req.query.llmConfigId : undefined;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.userId !== user.id && user.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const clarifications = project.clarifications as Array<{ question: string; answer: string }> | null;

    let accumulatedContent = "";

    await streamPRDDocument(
      {
        initialPrompt: project.initialPrompt,
        clarifications,
        llmConfigId,
        sessionKey: `project:${project.id}`,
      },
      (chunk) => {
        accumulatedContent += chunk;
        sendEvent("chunk", { text: chunk });
      }
    );

    // Initial empty diagram structure until Step 4 is executed
    const initialDiagram = { nodes: [], edges: [] };

    // Save as Version 1
    const version = await prisma.projectVersion.upsert({
      where: {
        projectId_versionNumber: {
          projectId: project.id,
          versionNumber: 1,
        },
      },
      update: {
        prdContent: accumulatedContent,
      },
      create: {
        projectId: project.id,
        versionNumber: 1,
        prdContent: accumulatedContent,
        diagramData: initialDiagram,
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        currentVersionId: version.id,
      },
    });

    sendEvent("done", {
      versionId: version.id,
      versionNumber: version.versionNumber,
      prdContent: accumulatedContent,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate PRD";
    sendEvent("error", { error: message });
    res.end();
  }
});

// Step 4: Generate Diagram Data (Nodes & Edges) with Zod validation
projectsRouter.post(
  "/:id/generate-diagram",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { llmConfigId } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: "desc" } },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (project.userId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const currentVersion =
      project.versions.find((v) => v.id === project.currentVersionId) ||
      project.versions[0];

    if (!currentVersion || !currentVersion.prdContent) {
      res.status(400).json({ error: "PRD content is missing for current version" });
      return;
    }

    try {
      const diagramData = await generateDiagramData(
        currentVersion.prdContent,
        llmConfigId,
        `project:${project.id}`
      );

      const updatedVersion = await prisma.projectVersion.update({
        where: { id: currentVersion.id },
        data: {
          diagramData: diagramData as unknown as Prisma.InputJsonValue,
        },
      });

      res.json({
        diagramData,
        version: updatedVersion,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate diagram";
      res.status(err instanceof LlmQuotaExhaustedError ? 402 : 500).json({ error: message });
    }
  }
);

// Step 5: Stream PRD Revision via SSE and sync diagram as new version
projectsRouter.get("/:id/stream-revision", async (req: Request, res: Response): Promise<void> => {
  const user = authenticateSseRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized SSE request" });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const revisionPrompt = typeof req.query.revisionPrompt === "string" ? req.query.revisionPrompt : "";
  const llmConfigId = typeof req.query.llmConfigId === "string" ? req.query.llmConfigId : undefined;

  if (!revisionPrompt) {
    res.status(400).json({ error: "revisionPrompt query parameter is required" });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.userId !== user.id && user.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const currentVersion =
    project.versions.find((v) => v.id === project.currentVersionId) ||
    project.versions[0];

  if (!currentVersion) {
    res.status(400).json({ error: "No baseline version found to revise" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let revisedPrd = "";

    await streamPRDRevision(
      {
        currentPrd: currentVersion.prdContent,
        revisionPrompt,
        llmConfigId,
        sessionKey: `project:${project.id}`,
      },
      (chunk) => {
        revisedPrd += chunk;
        sendEvent("chunk", { text: chunk });
      }
    );

    sendEvent("status", { message: "Menyinkronkan bagan diagram..." });

    const newDiagram = await generateDiagramData(
      revisedPrd,
      llmConfigId,
      `project:${project.id}`
    );

    const highestVersion = project.versions[0]?.versionNumber || 1;
    const nextVersionNumber = highestVersion + 1;

    const newVersion = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: nextVersionNumber,
        revisionPrompt,
        prdContent: revisedPrd,
        diagramData: newDiagram as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        currentVersionId: newVersion.id,
      },
    });

    sendEvent("done", {
      version: newVersion,
      diagramData: newDiagram,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process revision";
    sendEvent("error", { error: message });
    res.end();
  }
});

// Step 5: Rollback / Revert to a past version (Linear audit trail snapshot)
projectsRouter.post("/:id/revert", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { targetVersionNumber } = req.body;

  if (typeof targetVersionNumber !== "number") {
    res.status(400).json({ error: "targetVersionNumber must be a number" });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.userId !== req.user!.id && req.user!.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const targetVersion = project.versions.find((v) => v.versionNumber === targetVersionNumber);
  if (!targetVersion) {
    res.status(404).json({ error: `Version ${targetVersionNumber} not found` });
    return;
  }

  const highestVersionNumber = project.versions[0]?.versionNumber || 1;
  const newVersionNumber = highestVersionNumber + 1;

  // PRD Rule: "Saat pengguna memilih kembali (rollback) ke versi sebelumnya (misal kembali ke v1),
  // sistem membuat snapshot versi baru (misal v3) dengan payload identik v1 bertanda Reverted from v1,
  // menjaga riwayat revisi tetap linear tanpa menghapus histori."
  const snapshotVersion = await prisma.projectVersion.create({
    data: {
      projectId: project.id,
      versionNumber: newVersionNumber,
      revisionPrompt: `Reverted from v${targetVersionNumber}`,
      prdContent: targetVersion.prdContent,
      diagramData: targetVersion.diagramData as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      currentVersionId: snapshotVersion.id,
    },
  });

  res.json({
    message: `Successfully rolled back to v${targetVersionNumber} as v${newVersionNumber}`,
    version: snapshotVersion,
  });
});

// Delete project
projectsRouter.delete("/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.userId !== req.user!.id && req.user!.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await prisma.project.delete({ where: { id } });
  res.json({ success: true, message: "Project deleted successfully" });
});
