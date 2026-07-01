import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { bootGuard } from "./middleware/boot-guard";
import prisma from "./lib/prisma";
import { authRouter } from "./modules/auth/auth.controller";
import { clientsRouter } from "./modules/clients/clients.controller";
import { equipmentRouter } from "./modules/equipment/equipment.controller";
import { actionTypesRouter } from "./modules/action-types/action-types.controller";
import { maintenancesRouter } from "./modules/maintenances/maintenances.controller";
import { attachmentsRouter } from "./modules/attachments/attachments.controller";
import { templatesRouter } from "./modules/templates/templates.controller";
import { equipmentCategoriesRouter } from "./modules/equipment-categories/equipment-categories.controller";
import { softwareRouter } from "./modules/software/software.controller";
import { inventoryRouter } from "./modules/inventory/inventory.controller";
import { adminRouter } from "./modules/admin/admin.controller";

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
// adminRouter must be mounted BEFORE the catch-all `/api` routers (equipmentRouter
// and others apply `authMiddleware` to everything entering them, which would
// intercept /api/admin/verify and block the public password-check endpoint).
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api", equipmentRouter);
app.use("/api/action-types", actionTypesRouter);
app.use("/api/maintenances", maintenancesRouter);
app.use("/api", attachmentsRouter);
app.use("/api", templatesRouter);
app.use("/api/equipment-categories", equipmentCategoriesRouter);
app.use("/api", softwareRouter);
app.use("/api", inventoryRouter);

// ─── Error handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────
async function start() {
  try {
    bootGuard();
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
