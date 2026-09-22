WITH ranked_coupons AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "session_id"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS "row_number"
  FROM "coupons"
)
DELETE FROM "coupons"
USING ranked_coupons
WHERE "coupons"."id" = ranked_coupons."id"
  AND ranked_coupons."row_number" > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_session_id_unique" ON "coupons" USING btree ("session_id");
