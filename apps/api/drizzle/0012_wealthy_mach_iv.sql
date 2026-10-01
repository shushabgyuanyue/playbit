CREATE TYPE "public"."coupon_claim_status" AS ENUM('available', 'used');--> statement-breakpoint
CREATE TABLE "coupon_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"holder_user_id" text NOT NULL,
	"holder_nickname" text NOT NULL,
	"status" "coupon_claim_status" DEFAULT 'available' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "claim_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "claimed_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "coupons" SET "claimed_count" = CASE WHEN "holder_user_id" IS NULL THEN 0 ELSE 1 END;--> statement-breakpoint
INSERT INTO "coupon_claims" ("id", "coupon_id", "holder_user_id", "holder_nickname", "status", "claimed_at", "used_at", "created_at")
SELECT 'legacy_claim_' || "id", "id", "holder_user_id", "holder_nickname",
  CASE WHEN "status" = 'used' THEN 'used'::"coupon_claim_status" ELSE 'available'::"coupon_claim_status" END,
  "created_at", "used_at", "created_at"
FROM "coupons"
WHERE "agreement_id" IS NULL AND "source_flip_id" IS NULL AND "holder_user_id" IS NOT NULL AND "claim_token" IS NULL;--> statement-breakpoint
UPDATE "coupons" SET "holder_user_id" = NULL, "holder_nickname" = '待领取'
WHERE "agreement_id" IS NULL AND "source_flip_id" IS NULL AND "claim_token" IS NULL AND "claimed_count" > 0;--> statement-breakpoint
ALTER TABLE "coupon_claims" ADD CONSTRAINT "coupon_claims_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_claims" ADD CONSTRAINT "coupon_claims_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_claims_coupon_id_created_at_idx" ON "coupon_claims" USING btree ("coupon_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_claims_coupon_holder_unique" ON "coupon_claims" USING btree ("coupon_id","holder_user_id");--> statement-breakpoint
CREATE INDEX "coupon_claims_holder_created_at_idx" ON "coupon_claims" USING btree ("holder_user_id","created_at");
