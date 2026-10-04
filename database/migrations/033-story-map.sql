-- Roll6 — changes of 033-story-map-2-5d, to apply after 032-campaign-sheet.sql (i.e. after 20261001001517_AddCampaignSheetFile).
-- map_models.kind (integer, default 1 = 2D), map_models.walls (jsonb [[x, y], …], nullable), map_models.sky_image (varchar(260), nullable). No backfill: existing maps stay 2D.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/033-story-map.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261001001517_AddCampaignSheetFile 20261004174459_AddStoryMap --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD kind integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD sky_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD walls jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004174459_AddStoryMap', '9.0.20');
    END IF;
END $EF$;
COMMIT;


