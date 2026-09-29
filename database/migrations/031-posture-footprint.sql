-- Roll6 — changes of 031-token-posture-footprint, to apply after 029-slugs.sql (i.e. after 20260929114755_AddSlugs).
-- campaign_characters.posture and map_npcs.posture (integer, default 1 = standing); token sizes outside 1, 2, 3, 7, 10 normalized (standing → 1, down → 2).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/031-posture-footprint.sql
-- Regenerate (from backend/): dotnet ef migrations script 20260929114755_AddSlugs 20260929215843_AddPostureAndTokenSpaces --idempotent --project Roll6.Infra --startup-project Roll6.API

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    ALTER TABLE map_npcs ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    ALTER TABLE campaign_characters ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    UPDATE tokens SET up_space = 1 WHERE up_space NOT IN (1, 2, 3, 7, 10);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    UPDATE tokens SET down_space = 2 WHERE down_space IS NOT NULL AND down_space NOT IN (1, 2, 3, 7, 10);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260929215843_AddPostureAndTokenSpaces', '9.0.20');
    END IF;
END $EF$;
COMMIT;

