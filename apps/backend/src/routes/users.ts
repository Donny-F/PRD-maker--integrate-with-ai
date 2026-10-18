import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { Prisma, Role } from "@prisma/client";

export const usersRouter = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  _count: { select: { projects: true } },
} satisfies Prisma.UserSelect;

type UserWithCount = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function serializeUser(user: UserWithCount) {
  const { _count, ...rest } = user;
  return { ...rest, projectCount: _count.projects };
}

// Admin first, then regular users. Sorting happens in memory rather than via
// Prisma's enum ordering so it does not depend on the Role enum declaration
// order; Array.prototype.sort is stable, preserving createdAt asc per role.
const rolePriority: Record<Role, number> = {
  [Role.ADMIN]: 0,
  [Role.USER]: 1,
};

// Admin: List all users with their current role
usersRouter.get("/", authMiddleware, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: userSelect,
  });

  users.sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

  res.json({ users: users.map(serializeUser) });
});

// Admin: Promote a user to ADMIN or demote an admin to USER
usersRouter.patch("/:id/role", authMiddleware, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { role } = req.body as { role?: unknown };

  if (role !== Role.ADMIN && role !== Role.USER) {
    res.status(400).json({ error: "Role harus ADMIN atau USER" });
    return;
  }

  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (targetId === req.user!.id) {
    res.status(400).json({ error: "Tidak dapat mengubah role akun Anda sendiri" });
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });

  if (!target) {
    res.status(404).json({ error: "Pengguna tidak ditemukan" });
    return;
  }

  if (target.role === role) {
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: targetId },
      select: userSelect,
    });
    res.json({ user: serializeUser(current) });
    return;
  }

  if (target.role === Role.ADMIN && role === Role.USER) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Minimal harus tersisa satu akun admin" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: userSelect,
  });

  res.json({ user: serializeUser(updated) });
});
