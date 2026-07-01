CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid,
	"author_id" uuid,
	"author_name" text,
	"type" text NOT NULL,
	"rating" integer,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tester_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid,
	"reporter_id" uuid,
	"reporter_name" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"converted_task_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "role" SET DEFAULT 'client';--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "can_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_converted_task_id_tasks_id_fk" FOREIGN KEY ("converted_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_project_idx" ON "feedback" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_file_idx" ON "feedback" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "tester_reports_project_idx" ON "tester_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tester_reports_status_idx" ON "tester_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions" USING btree ("status");