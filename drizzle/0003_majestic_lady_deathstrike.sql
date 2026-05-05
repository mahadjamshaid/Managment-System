ALTER TABLE "attendance" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "work_minutes" integer;