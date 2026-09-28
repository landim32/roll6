-- Roll6 — changes of 027-turn-ai-processing, to apply after 026-npc-current-vitals.sql (i.e. after 20260928173235_RenameMapNpcCurrentVitals).
-- turns.description grows to 10000 characters for the turn narration (TurnType 5, written by POST /api/campaign/{id}/turn/process).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/027-turn-narration.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928173235_RenameMapNpcCurrentVitals 20260928184156_TurnNarration --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928184156_TurnNarration') THEN
    ALTER TABLE turns ALTER COLUMN description TYPE character varying(10000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928184156_TurnNarration') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928184156_TurnNarration', '9.0.20');
    END IF;
END $EF$;
COMMIT;

