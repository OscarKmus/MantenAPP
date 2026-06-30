import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // ─── Default dev user ────────────────────────────────────
  // Username: admin · Password: admin123 — DEV ONLY. Change in production.
  const defaultPasswordHash = await argon2.hash("admin123");
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: defaultPasswordHash,
      fullName: "Admin Técnico",
      role: "ADMIN",
    },
  });

  // ─── Default action types ────────────────────────────────
  const defaultActionTypes = [
    { name: "Mantención preventiva", color: "#3b82f6", icon: "shield-check", isDefault: true },
    { name: "Corrección", color: "#f59e0b", icon: "wrench", isDefault: true },
    { name: "Reemplazo", color: "#ef4444", icon: "refresh-cw", isDefault: true },
    { name: "Instalación", color: "#10b981", icon: "plus-circle", isDefault: true },
    { name: "Otro", color: "#6b7280", icon: "more-horizontal", isDefault: true },
  ];

  for (const actionType of defaultActionTypes) {
    await prisma.actionType.upsert({
      where: { name: actionType.name },
      update: {},
      create: actionType,
    });
  }

  // ─── Default equipment categories ────────────────────────
  const defaultCategories = [
    { name: "PC Desktop", icon: "monitor", isDefault: true, isComputer: true, sortOrder: 0 },
    { name: "Notebook", icon: "laptop", isDefault: true, isComputer: true, sortOrder: 1 },
    { name: "Impresora", icon: "printer", isDefault: true, isComputer: false, sortOrder: 2 },
    { name: "Monitor", icon: "monitor", isDefault: true, isComputer: false, sortOrder: 3 },
    { name: "Router", icon: "router", isDefault: true, isComputer: false, sortOrder: 4 },
    { name: "Switch", icon: "network", isDefault: true, isComputer: false, sortOrder: 5 },
    { name: "Servidor", icon: "server", isDefault: true, isComputer: true, sortOrder: 6 },
  ];

  for (const category of defaultCategories) {
    await prisma.equipmentCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log("Seed completed: default action types and equipment categories created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
