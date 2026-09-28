-- Roll6 — only the changes since the last production release (main = up to 20260928092117_ClearCopiedCampaignNotes).
-- 024-npc-status: npcs.status (free-text condition of a library NPC, copied to each new map occurrence).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/024-npc-status.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928092117_ClearCopiedCampaignNotes 20260928130000_AddNpcStatus --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928130000_AddNpcStatus') THEN
    ALTER TABLE npcs ADD status character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928130000_AddNpcStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928130000_AddNpcStatus', '9.0.20');
    END IF;
END $EF$;
COMMIT;
