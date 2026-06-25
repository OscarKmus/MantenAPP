import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { CreateTemplateInput, UpdateTemplateInput } from "./templates.schema";

export async function listTemplates(clientId: string) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  return prisma.template.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { equipment: true },
      },
    },
  });
}

export async function getTemplate(id: string) {
  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { equipment: true },
      },
    },
  });

  if (!template) {
    throw createError(404, "Template not found");
  }

  return template;
}

export async function createTemplate(clientId: string, input: CreateTemplateInput) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  // Check name uniqueness per client
  const existing = await prisma.template.findUnique({
    where: { clientId_name: { clientId, name: input.name } },
  });
  if (existing) {
    throw createError(409, "Template with this name already exists for this client");
  }

  // Verify all equipment IDs belong to this client
  const equipment = await prisma.equipment.findMany({
    where: { id: { in: input.equipmentIds }, clientId },
    select: { id: true },
  });
  if (equipment.length !== input.equipmentIds.length) {
    throw createError(400, "One or more equipment items not found for this client");
  }

  return prisma.template.create({
    data: {
      clientId,
      name: input.name,
      description: input.description ?? null,
      items: {
        create: input.equipmentIds.map((equipmentId, index) => ({
          equipmentId,
          sortOrder: index,
        })),
      },
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { equipment: true },
      },
    },
  });
}

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const existing = await prisma.template.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    throw createError(404, "Template not found");
  }

  // Check name uniqueness if name is changing
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.template.findUnique({
      where: { clientId_name: { clientId: existing.clientId, name: input.name } },
    });
    if (duplicate) {
      throw createError(409, "Template with this name already exists for this client");
    }
  }

  // If equipmentIds provided, verify they belong to the same client
  if (input.equipmentIds) {
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: input.equipmentIds }, clientId: existing.clientId },
      select: { id: true },
    });
    if (equipment.length !== input.equipmentIds.length) {
      throw createError(400, "One or more equipment items not found for this client");
    }
  }

  return prisma.$transaction(async (tx) => {
    // Update template metadata
    await tx.template.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });

    // Replace items if equipmentIds provided
    if (input.equipmentIds) {
      await tx.templateItem.deleteMany({ where: { templateId: id } });
      await tx.templateItem.createMany({
        data: input.equipmentIds.map((equipmentId, index) => ({
          templateId: id,
          equipmentId,
          sortOrder: index,
        })),
      });
    }

    return tx.template.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { equipment: true },
        },
      },
    });
  });
}

export async function deleteTemplate(id: string) {
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Template not found");
  }

  await prisma.template.delete({ where: { id } });
}

export async function useTemplate(id: string) {
  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: { equipmentId: true },
      },
    },
  });

  if (!template) {
    throw createError(404, "Template not found");
  }

  return {
    templateId: template.id,
    templateName: template.name,
    equipmentIds: template.items.map((item) => item.equipmentId),
  };
}
