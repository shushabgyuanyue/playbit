ALTER TABLE "bet_sessions" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bet_sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;