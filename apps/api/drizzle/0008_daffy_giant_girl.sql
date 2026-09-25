CREATE TYPE "public"."coupon_status" AS ENUM('available', 'reserved', 'used', 'waived');--> statement-breakpoint
CREATE TYPE "public"."flip_status" AS ENUM('pending_acceptance', 'active', 'declined', 'settled');--> statement-breakpoint
CREATE TYPE "public"."grace_ticket_status" AS ENUM('available', 'reserved', 'used');--> statement-breakpoint
CREATE TYPE "public"."grace_waiver_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."agreement_status" ADD VALUE 'waived';--> statement-breakpoint
CREATE TABLE "flips" (
	"id" text PRIMARY KEY NOT NULL,
	"agreement_id" text NOT NULL,
	"coupon_id" text NOT NULL,
	"applicant_user_id" text NOT NULL,
	"invitee_user_id" text NOT NULL,
	"card" jsonb NOT NULL,
	"status" "flip_status" NOT NULL,
	"winner_user_id" text,
	"result_recorder_user_id" text,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grace_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"earned_at_fulfillment_count" integer NOT NULL,
	"status" "grace_ticket_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grace_waivers" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"coupon_id" text NOT NULL,
	"agreement_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"status" "grace_waiver_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "coupons_agreement_id_unique";--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "fulfillment_recorder_user_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "source_flip_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "status" "coupon_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "waived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "flips" ADD CONSTRAINT "flips_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flips" ADD CONSTRAINT "flips_applicant_user_id_users_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flips" ADD CONSTRAINT "flips_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flips" ADD CONSTRAINT "flips_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flips" ADD CONSTRAINT "flips_result_recorder_user_id_users_id_fk" FOREIGN KEY ("result_recorder_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_tickets" ADD CONSTRAINT "grace_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_waivers" ADD CONSTRAINT "grace_waivers_ticket_id_grace_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."grace_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_waivers" ADD CONSTRAINT "grace_waivers_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_waivers" ADD CONSTRAINT "grace_waivers_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_waivers" ADD CONSTRAINT "grace_waivers_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flips_agreement_id_idx" ON "flips" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "flips_coupon_id_idx" ON "flips" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grace_tickets_user_milestone_unique" ON "grace_tickets" USING btree ("user_id","earned_at_fulfillment_count");--> statement-breakpoint
CREATE INDEX "grace_waivers_ticket_id_idx" ON "grace_waivers" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "grace_waivers_agreement_id_idx" ON "grace_waivers" USING btree ("agreement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grace_waivers_pending_coupon_unique" ON "grace_waivers" USING btree ("coupon_id") WHERE "grace_waivers"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_fulfillment_recorder_user_id_users_id_fk" FOREIGN KEY ("fulfillment_recorder_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupons_agreement_id_idx" ON "coupons" USING btree ("agreement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_source_flip_id_unique" ON "coupons" USING btree ("source_flip_id") WHERE "coupons"."source_flip_id" is not null;--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "used";