import { Router, type Request, type Response, type NextFunction, type IRouter } from "express";
import { loginSchema } from "./auth.schema";
import { login, getMe, refresh } from "./auth.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const authRouter: IRouter = Router();

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/auth/refresh",
};

// POST /api/auth/login
authRouter.post("/login", validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = await login(username, password);

    res
      .cookie("accessToken", result.accessToken, ACCESS_COOKIE_OPTIONS)
      .cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS)
      .status(200)
      .json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
authRouter.post("/logout", authMiddleware, (_req: Request, res: Response) => {
  res
    .clearCookie("accessToken", { path: "/" })
    .clearCookie("refreshToken", { path: "/api/auth/refresh" })
    .status(204)
    .send();
});

// GET /api/auth/me
authRouter.get("/me", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMe(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }

    const result = refresh(refreshToken);

    res
      .cookie("accessToken", result.accessToken, ACCESS_COOKIE_OPTIONS)
      .status(200)
      .json({ message: "Token refreshed" });
  } catch (error) {
    res
      .clearCookie("accessToken", { path: "/" })
      .clearCookie("refreshToken", { path: "/api/auth/refresh" });
    next(error);
  }
});
