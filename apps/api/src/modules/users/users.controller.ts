import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { validate } from "../../middleware/validate";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { createUserSchema, updateUserRoleSchema } from "./users.schema";
import { listUsers, createUser, updateUserRole, deleteUser, getUserById } from "./users.service";

export const usersRouter: IRouter = Router();

// All routes require auth
usersRouter.use(authMiddleware);

// GET /api/users — ADMIN only
usersRouter.get("/", requireRole("ADMIN"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id — self or ADMIN
usersRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getUserById(id, req.user!);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// POST /api/users — ADMIN only
usersRouter.post("/", requireRole("ADMIN"), validate(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/role — ADMIN only
usersRouter.patch("/:id/role", requireRole("ADMIN"), validate(updateUserRoleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await updateUserRole(id, req.body.role, req.user!.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id — ADMIN only
usersRouter.delete("/:id", requireRole("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteUser(id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
