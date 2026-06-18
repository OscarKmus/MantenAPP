import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  console.log("Seed completed: default action types created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
