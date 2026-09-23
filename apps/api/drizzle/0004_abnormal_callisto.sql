ALTER TABLE "bet_sessions" ADD COLUMN "boosts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_data_url" text;