-- Roll6 — changes of 026-fix-npc-piece-vitals, to apply after 025-npc-status.sql (i.e. after 20260928130000_AddNpcStatus).
-- map_npcs.life/energy renamed to current_life/current_energy (current values of each occurrence; totals are the NPC's).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/026-npc-current-vitals.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260928130000_AddNpcStatus 20260928173235_RenameMapNpcCurrentVitals --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    ALTER TABLE map_npcs RENAME COLUMN life TO current_life;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    ALTER TABLE map_npcs RENAME COLUMN energy TO current_energy;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928173235_RenameMapNpcCurrentVitals', '9.0.20');
    END IF;
END $EF$;
COMMIT;

