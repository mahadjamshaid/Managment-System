ALTER TABLE "attendance" DROP CONSTRAINT "attendance_employee_date_idx";--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "attendance_date" varchar(50);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "shift_start_time" varchar(20);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "grace_minutes" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "break_minutes" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_status" varchar(50);--> statement-breakpoint
CREATE INDEX "employee_id_check_out_idx" ON "attendance" USING btree ("employee_id","check_out_time");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_date_idx" UNIQUE("employee_id","attendance_date");