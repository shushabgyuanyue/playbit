import type { AuthRepository } from "../authRepository.js";
import type { Agreement, User } from "@playbit/shared";
import type { Context } from "hono";

export async function getCurrentUser(context: Context, auth: AuthRepository): Promise<User | null> {
  const header = context.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  return token ? auth.findUserByToken(token) : null;
}

export async function requireCurrentUser(
  context: Context,
  auth: AuthRepository
): Promise<User | Response> {
  const currentUser = await getCurrentUser(context, auth);
  if (!currentUser) {
    return context.json({ message: "Authentication required" }, 401);
  }
  return currentUser;
}

export function isParticipant(
  agreement: { participants: Array<{ userId: string | null }> },
  userId: string
): boolean {
  return agreement.participants.some((participant) => participant.userId === userId);
}

export function agreementParticipantIds(agreement: { participants: Array<{ id: string }> }): string[] {
  return agreement.participants.map((participant) => participant.id);
}

export function canViewAgreement(agreement: Agreement, userId: string | null): boolean {
  if (agreement.status === "pending_signature") {
    return true;
  }
  return userId !== null && isParticipant(agreement, userId);
}

export function requireAgreementParticipant(
  context: Context,
  agreement: Agreement,
  user: User
): Response | null {
  return isParticipant(agreement, user.id) ? null : context.json({ message: "Forbidden" }, 403);
}
