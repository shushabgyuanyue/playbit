ALTER TABLE "coupons" ADD COLUMN "source_label" text DEFAULT '手动签发' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "signature_data_url" text;