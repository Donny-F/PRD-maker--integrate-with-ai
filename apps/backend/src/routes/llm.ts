import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { encryptApiKey, decryptApiKey } from "../utils/crypto";

export const llmRouter = Router();

// Public: Get all active LLM configurations (no encrypted keys exposed)
llmRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const models = await prisma.llmConfig.findMany({
    where: { isActive: true },
    select: {
      id: true,
      provider: true,
      displayName: true,
      modelIdentifier: true,
      baseUrl: true,
      isActive: true,
      encryptedApiKey: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const formatted = models.map((m) => ({
    id: m.id,
    provider: m.provider,
    displayName: m.displayName,
    modelIdentifier: m.modelIdentifier,
    baseUrl: m.baseUrl,
    isActive: m.isActive,
    hasApiKey: Boolean(m.encryptedApiKey),
  }));

  res.json({ models: formatted });
});

// Admin: Get all LLM configs with masked API key info
llmRouter.get("/admin", authMiddleware, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const configs = await prisma.llmConfig.findMany({
    orderBy: { createdAt: "asc" },
  });

  const formatted = configs.map((c) => {
    let maskedKey = "";
    if (c.encryptedApiKey) {
      try {
        const decrypted = decryptApiKey(c.encryptedApiKey);
        maskedKey =
          decrypted.length > 8
            ? `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`
            : "********";
      } catch {
        maskedKey = "Invalid Key";
      }
    }

    return {
      id: c.id,
      provider: c.provider,
      displayName: c.displayName,
      modelIdentifier: c.modelIdentifier,
      baseUrl: c.baseUrl,
      isActive: c.isActive,
      hasApiKey: Boolean(c.encryptedApiKey),
      maskedApiKey: maskedKey,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  res.json({ configs: formatted });
});

// Admin: Create new LLM config
llmRouter.post("/admin", authMiddleware, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { provider, displayName, modelIdentifier, baseUrl, apiKey, isActive } = req.body;

  if (!provider || !displayName || !modelIdentifier || !baseUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const encryptedApiKey = apiKey ? encryptApiKey(apiKey) : null;

  const config = await prisma.llmConfig.create({
    data: {
      provider,
      displayName,
      modelIdentifier,
      baseUrl,
      encryptedApiKey,
      isActive: isActive ?? true,
    },
  });

  res.status(201).json({
    config: {
      id: config.id,
      provider: config.provider,
      displayName: config.displayName,
      modelIdentifier: config.modelIdentifier,
      baseUrl: config.baseUrl,
      isActive: config.isActive,
    },
  });
});

// Admin: Update LLM config
llmRouter.put("/admin/:id", authMiddleware, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { provider, displayName, modelIdentifier, baseUrl, apiKey, isActive } = req.body;

  const existing = await prisma.llmConfig.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "LLM configuration not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (provider !== undefined) updateData.provider = provider;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (modelIdentifier !== undefined) updateData.modelIdentifier = modelIdentifier;
  if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (apiKey !== undefined) {
    updateData.encryptedApiKey = apiKey ? encryptApiKey(apiKey) : null;
  }

  const updated = await prisma.llmConfig.update({
    where: { id },
    data: updateData,
  });

  res.json({
    config: {
      id: updated.id,
      provider: updated.provider,
      displayName: updated.displayName,
      modelIdentifier: updated.modelIdentifier,
      baseUrl: updated.baseUrl,
      isActive: updated.isActive,
      hasApiKey: Boolean(updated.encryptedApiKey),
    },
  });
});

// Admin: Delete LLM config
llmRouter.delete("/admin/:id", authMiddleware, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await prisma.llmConfig.delete({ where: { id } });
  res.json({ success: true, message: "LLM configuration deleted" });
});
