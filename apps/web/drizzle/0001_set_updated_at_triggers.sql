-- Every table with an updated_at column gets it maintained at the database
-- level, not just by the ORM, so it stays correct regardless of write path.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON "organizations"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON "teams"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON "people"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER technologies_set_updated_at BEFORE UPDATE ON "technologies"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER tools_set_updated_at BEFORE UPDATE ON "tools"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER systems_set_updated_at BEFORE UPDATE ON "systems"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER repositories_set_updated_at BEFORE UPDATE ON "repositories"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON "services"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON "documents"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
