CREATE TYPE "public"."certificate_kind" AS ENUM('winner', 'ranking', 'completion');--> statement-breakpoint
CREATE TYPE "public"."game_result_kind" AS ENUM('winner', 'ranking', 'completed');--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"game_result_id" text,
	"kind" "certificate_kind" NOT NULL,
	"title" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_results" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_key" text NOT NULL,
	"card_id" text NOT NULL,
	"kind" "game_result_kind" NOT NULL,
	"winner_label" text,
	"ranking" jsonb,
	"note" text,
	"recorder_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "agreement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "game_result_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "certificate_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "claim_token" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "transfer_note" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_game_result_id_game_results_id_fk" FOREIGN KEY ("game_result_id") REFERENCES "public"."game_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_recorder_user_id_users_id_fk" FOREIGN KEY ("recorder_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_game_result_id_game_results_id_fk" FOREIGN KEY ("game_result_id") REFERENCES "public"."game_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_claim_token_unique" UNIQUE("claim_token");