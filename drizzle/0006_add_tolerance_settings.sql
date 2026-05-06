ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "required_work_minutes" integer;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "checkout_grace_minutes" integer;
ALTER TABLE "shift" ADD COLUMN IF NOT EXISTS "required_work_minutes" integer DEFAULT 480 NOT NULL;
ALTER TABLE "shift" ADD COLUMN IF NOT EXISTS "checkout_grace_minutes" integer DEFAULT 15 NOT NULL;
