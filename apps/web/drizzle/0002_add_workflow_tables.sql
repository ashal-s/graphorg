CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_organization_id_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "workflows_trigger_type_check" CHECK ("workflows"."trigger_type" in ('manual', 'entity_created', 'entity_updated', 'scheduled')),
	CONSTRAINT "workflows_status_check" CHECK ("workflows"."status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"kind" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_steps_kind_check" CHECK ("workflow_steps"."kind" in ('condition', 'action'))
);
--> statement-breakpoint
CREATE TABLE "workflow_people" (
	"workflow_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "workflow_people_workflow_id_person_id_role_pk" PRIMARY KEY("workflow_id","person_id","role"),
	CONSTRAINT "workflow_people_role_check" CHECK ("workflow_people"."role" in ('owner', 'creator', 'worker'))
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_people" ADD CONSTRAINT "workflow_people_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_people" ADD CONSTRAINT "workflow_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflows_organization_id_idx" ON "workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_id_idx" ON "workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_people_person_id_idx" ON "workflow_people" USING btree ("person_id");