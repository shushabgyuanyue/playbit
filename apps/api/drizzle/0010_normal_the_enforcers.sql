ALTER TYPE "public"."agreement_status" ADD VALUE 'pending_confirmation' BEFORE 'active';--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "game_card" jsonb;