import { AuthAccountNotFound, type AuthRepository } from "../authRepository.js";
import { getCurrentUser } from "../http/auth.js";
import { loginSchema, registerSchema } from "@playbit/shared";
import type { Hono } from "hono";

export function registerAuthRoutes(app: Hono, auth: AuthRepository) {
  app.post("/auth/register", async (context) => {
    const currentUser = await getCurrentUser(context, auth);
    const payload = registerSchema.parse(await context.req.json());

    try {
      const result = await auth.register(payload, currentUser?.id ?? null);
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
}
