import { Router, type Request, type RequestHandler, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db";
import type { User } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";

export const authRouter = Router();

const oauthSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  name: z.string().trim().max(100).nullish(),
  image: z.string().url().max(2048).nullish(),
  provider: z.string().trim().min(1).max(50),
});

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      next(error as Error);
    });
  };
}

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new HttpError(500, "AUTH_SECRET is not configured");
  return secret;
}

function issueAuthToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    requireSecret(),
    { expiresIn: "7d" }
  );
}

function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// OAuth callback bridge: NextAuth exchanges a verified provider profile for a
// backend access token. Only the Next.js server may call this endpoint.
authRouter.post(
  "/oauth",
  asyncRoute(async (req, res) => {
    const provided = req.header("x-internal-secret");
    if (!provided || provided !== requireSecret()) {
      throw new HttpError(401, "Unauthorized");
    }

    const parsed = oauthSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Data permintaan tidak valid");
    }

    const { email, name, image, provider } = parsed.data;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        ...(name ? { name } : {}),
        ...(image ? { image } : {}),
      },
      create: {
        email,
        name: name || email.split("@")[0],
        image: image || null,
      },
    });

    console.log(`[auth] OAuth sign-in via ${provider}: ${email}`);
    res.json({ token: issueAuthToken(user), user: publicUser(user) });
  })
);

// Get current logged-in user profile
authRouter.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});
