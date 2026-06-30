import argon2 from "argon2";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { getEnv } from "../../config/env";
import { createError } from "../../middleware/error-handler";
import type { User, UserRole } from "@mantenti/types";

interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export function generateAccessToken(payload: TokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

function sanitizeUser(user: { id: string; username: string; fullName: string; role: UserRole; createdAt: Date; updatedAt: Date }): User {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw createError(401, "Invalid credentials");
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw createError(401, "Invalid credentials");
  }

  const payload: TokenPayload = { userId: user.id, username: user.username, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError(404, "User not found");
  }
  return { user: sanitizeUser(user) };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  // Re-read user from DB to get fresh role (bounds demotion window to access token TTL)
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw createError(401, "User not found");
  }

  const newAccessToken = generateAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });
  return { accessToken: newAccessToken };
}
