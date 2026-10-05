-- Roll6 — initial posture of the library NPC (036), to apply after 036-wall-texture.sql (i.e. after 20261005145717_AddWallTextureImage).
-- npcs: adds posture (integer not null default 1 = standing) — the posture each new map occurrence of the NPC starts with (031: 1 standing, 2 down, 3 out of combat). Existing NPCs stay standing.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/036-npc-posture.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261005145717_AddWallTextureImage 20261005180820_AddNpcPosture --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005180820_AddNpcPosture') THEN
    ALTER TABLE npcs ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005180820_AddNpcPosture') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261005180820_AddNpcPosture', '9.0.20');
    END IF;
END $EF$;
COMMIT;

