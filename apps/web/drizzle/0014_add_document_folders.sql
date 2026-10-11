CREATE TABLE "document_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "owner_person_id" uuid;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parent_id_document_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."document_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_folders_organization_id_idx" ON "document_folders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "document_folders_parent_id_idx" ON "document_folders" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_person_id_people_id_fk" FOREIGN KEY ("owner_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_folder_id_idx" ON "documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "documents_owner_person_id_idx" ON "documents" USING btree ("owner_person_id");