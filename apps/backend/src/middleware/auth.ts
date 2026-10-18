import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    res.status(500).json({ error: "Server authentication secret is not configured" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser & { sub?: string };
    req.user = {
      id: decoded.id || decoded.sub || "",
      email: decoded.email,
      role: decoded.role || Role.USER,
      name: decoded.name,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden: Admin privileges required" });
    return;
  }
  next();
}
