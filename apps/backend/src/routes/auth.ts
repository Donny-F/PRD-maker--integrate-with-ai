import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { Role } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";

export const authRouter = Router();

// Dev Mode Credentials Login
authRouter.post("/dev-login", async (req: Request, res: Response): Promise<void> => {
  const { email, role, name } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const userRole = role === "ADMIN" ? Role.ADMIN : Role.USER;

  // Find or create user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: userRole,
      ...(name ? { name } : {}),
    },
    create: {
      email,
      name: name || (userRole === Role.ADMIN ? "Admin User" : "Demo User"),
      role: userRole,
    },
  });

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    res.status(500).json({ error: "AUTH_SECRET is not configured" });
    return;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

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
