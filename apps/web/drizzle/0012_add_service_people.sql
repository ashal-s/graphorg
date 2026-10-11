CREATE TABLE "service_people" (
	"service_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "service_people_service_id_person_id_pk" PRIMARY KEY("service_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "service_people" ADD CONSTRAINT "service_people_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_people" ADD CONSTRAINT "service_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_people_person_id_idx" ON "service_people" USING btree ("person_id");