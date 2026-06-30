import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { validate } from "../../middleware/validate";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { createUserSchema, updateUserRoleSchema } from "./users.schema";
import { listUsers, createUser, updateUserRole, deleteUser } from "./users.service";

export const usersRouter: IRouter = Router();

// All routes require auth + ADMIN
usersRouter.use(authMiddleware);
usersRouter.use(requireRole("ADMIN"));

// GET /api/users
usersRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
usersRouter.post("/", validate(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/role
usersRouter.patch("/:id/role", validate(updateUserRoleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await updateUserRole(req.params.id, req.body.role, req.user!.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
usersRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteUser(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
