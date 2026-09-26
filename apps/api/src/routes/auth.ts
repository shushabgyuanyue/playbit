import { AuthAccountNotFound, type AuthRepository } from "../authRepository.js";
import { getCurrentUser } from "../http/auth.js";
import { loginSchema, registerSchema, updateProfileSchema } from "@playbit/shared";
import type { Hono } from "hono";

export function registerAuthRoutes(app: Hono, auth: AuthRepository) {
  app.post("/auth/register", async (context) => {
    const payload = registerSchema.parse(await context.req.json());

    try {
      const result = await auth.register(payload);
      return context.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        return context.json({ message: "Email already registered" }, 409);
      }
      throw error;
    }
  });

  app.post("/auth/login", async (context) => {
    const payload = loginSchema.parse(await context.req.json());
    let result: Awaited<ReturnType<AuthRepository["login"]>>;
    try {
      result = await auth.login(payload);
    } catch (error) {
      if (error instanceof AuthAccountNotFound) {
        return context.json({ code: "ACCOUNT_NOT_FOUND", message: "Account not found" }, 404);
      }
      throw error;
    }
    if (!result) {
      return context.json({ message: "Invalid email or password" }, 401);
    }
    return context.json(result);
  });

  app.get("/auth/me", async (context) => {
    const user = await getCurrentUser(context, auth);
    if (!user) {
      return context.json({ user: null });
    }
    return context.json({ user });
  });

  app.patch("/auth/me", async (context) => {
    const currentUser = await getCurrentUser(context, auth);
    if (!currentUser) {
      return context.json({ message: "Authentication required" }, 401);
    }
    const payload = updateProfileSchema.parse(await context.req.json());
    const user = await auth.updateNickname(currentUser.id, payload.nickname);
    if (!user) {
      return context.json({ message: "User not found" }, 404);
    }
    return context.json({ user });
  });
}
