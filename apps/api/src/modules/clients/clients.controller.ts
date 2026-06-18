import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createClientSchema, updateClientSchema, clientQuerySchema } from "./clients.schema";
import { listClients, getClient, createClient, updateClient, deleteClient } from "./clients.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const clientsRouter: IRouter = Router();

// All routes require auth
clientsRouter.use(authMiddleware);

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

// GET /api/clients/:id
clientsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getClient(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/clients/:id
clientsRouter.patch("/:id", validate(updateClientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const client = await updateClient(id, req.body);
    res.json({ client });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id
clientsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteClient(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
