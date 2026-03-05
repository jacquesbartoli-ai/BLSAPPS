import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyPassword } from "../services/auth.service.js";
import type { UserRole } from "../types/role.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/auth/login", async (req, res) => {
  const bodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload invalide." });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  const isPasswordValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  const role = user.role as UserRole;
  const accessToken = signAccessToken(user.id, role);
  const refreshToken = signRefreshToken(user.id, role);

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      role: user.role,
      fullName: user.fullName
    }
  });
});

export { router as publicRouter };
