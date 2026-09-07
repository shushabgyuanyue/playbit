CREATE TYPE "public"."session_source" AS ENUM('custom', 'card');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'pending_confirmation', 'active', 'settling', 'fulfilled', 'finished');--> statement-breakpoint
CREATE TYPE "public"."stake_type" AS ENUM('point', 'coupon', 'custom');--> statement-breakpoint
CREATE TABLE "bet_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source" "session_source" NOT NULL,
	"participants" jsonb NOT NULL,
	"challenge" text NOT NULL,
	"judgment_rule" text NOT NULL,
	"stake" jsonb NOT NULL,
	"card_id" text,
	"status" "session_status" NOT NULL,
	"winner_id" text,
	"loser_id" text,
	"share_code" text NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bet_sessions_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"issuer_nickname" text NOT NULL,
	"holder_nickname" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
