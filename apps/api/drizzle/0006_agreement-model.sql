CREATE TYPE "public"."agreement_source" AS ENUM('custom', 'card');--> statement-breakpoint
CREATE TYPE "public"."agreement_status" AS ENUM('pending_signature', 'active', 'result_recorded', 'fulfilled');--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"title" text NOT NULL,
	"source" "agreement_source" NOT NULL,
	"participants" jsonb NOT NULL,
	"boosts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"challenge" text NOT NULL,
	"stake" jsonb NOT NULL,
	"card_id" text,
	"status" "agreement_status" NOT NULL,
	"winner_id" text,
	"loser_id" text,
	"result_recorder_user_id" text,
	"share_code" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agreements_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
ALTER TABLE "bet_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "bet_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "coupons" CASCADE;--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"agreement_id" text NOT NULL,
	"issuer_user_id" text,
	"holder_user_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"issuer_nickname" text NOT NULL,
	"holder_nickname" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_result_recorder_user_id_users_id_fk" FOREIGN KEY ("result_recorder_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_issuer_user_id_users_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_agreement_id_unique" ON "coupons" USING btree ("agreement_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "auth_level";--> statement-breakpoint
DROP TYPE "public"."auth_level";--> statement-breakpoint
DROP TYPE "public"."session_source";--> statement-breakpoint
DROP TYPE "public"."session_status";
