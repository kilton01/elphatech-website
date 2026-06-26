CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'replied', 'converted');--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "status" "contact_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "notes" text;