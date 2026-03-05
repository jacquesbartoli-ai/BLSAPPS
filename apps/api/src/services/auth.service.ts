import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../types/role.js";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string, role: UserRole) {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"]
  });
}

export function signRefreshToken(userId: string, role: UserRole) {
  return jwt.sign({ role }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"]
  });
}
