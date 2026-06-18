import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import prisma from "./lib/prisma";
import { authRouter } from "./modules/auth/auth.controller";

const env = getEnv();
const app = express();

// ─── Middleware ──────────────────────────────────────────
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ─── Healthcheck ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);

// ─── Error handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────
async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    app.listen(env.PORT, () => {
      console.log(`API running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
