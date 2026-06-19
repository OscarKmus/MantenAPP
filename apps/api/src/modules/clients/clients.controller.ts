import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createClientSchema, updateClientSchema, clientQuerySchema, bulkDeleteSchema, cascadePreviewSchema } from "./clients.schema";
import { listClients, getClient, createClient, updateClient, deleteClient, cascadePreviewClients, bulkDeleteClients } from "./clients.service";
import { listClientMaintenances } from "../maintenances/maintenances.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import { requireAdminToken } from "../admin/admin.middleware";

export const clientsRouter: IRouter = Router();

// All routes require auth
clientsRouter.use(authMiddleware);

// Helper to safely extract param
function getParam(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// GET /api/clients?q=
clientsRouter.get("/", validate(clientQuerySchema, "query"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string };
    const clients = await listClients(q);
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
clientsRouter.post("/", validate(createClientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/cascade-preview — preview cascade counts (user JWT only, no admin token)
clientsRouter.post("/cascade-preview", validate(cascadePreviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const counts = await cascadePreviewClients(ids);
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/bulk-delete — bulk delete with admin token (all-or-nothing)
clientsRouter.post("/bulk-delete", requireAdminToken, validate(bulkDeleteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const result = await bulkDeleteClients(ids);

    if (result.skipped && result.skipped.length > 0) {
      // Some ids didn't exist — return 207 with partial result
      res.status(207).json(result);
      return;
    }

    res.json({ deleted: result.deleted, ids: result.ids });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id/maintenances — list maintenances for a client
clientsRouter.get("/:id/maintenances", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listClientMaintenances(id, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id
clientsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    const result = await getClient(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/clients/:id
clientsRouter.patch("/:id", validate(updateClientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    const client = await updateClient(id, req.body);
    res.json({ client });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id
clientsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    await deleteClient(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
