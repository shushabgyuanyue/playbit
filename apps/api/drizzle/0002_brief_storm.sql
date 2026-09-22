ALTER TABLE "coupons" ADD COLUMN "session_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "issuer_user_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_session_id_bet_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."bet_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_issuer_user_id_users_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
