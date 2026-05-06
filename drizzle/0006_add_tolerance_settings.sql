ALTER TABLE "attendance" ADD COLUMN "required_work_minutes" integer;
ALTER TABLE "attendance" ADD COLUMN "checkout_grace_minutes" integer;
ALTER TABLE "shift" ADD COLUMN "required_work_minutes" integer DEFAULT 480 NOT NULL;
ALTER TABLE "shift" ADD COLUMN "checkout_grace_minutes" integer DEFAULT 15 NOT NULL;
