-- Roll6 — changes of 034-raycast-3d-view, to apply after 033-story-map.sql (i.e. after 20261004174459_AddStoryMap).
-- map_models: drops kind and walls, renames sky_image to background_image (the 033 sky becomes the 3D background, data kept) and adds mask_image (varchar(260), nullable); tokens: adds front_image (varchar(260), nullable).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/034-raycast-view.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261004174459_AddStoryMap 20261004212901_ReplaceStoryMapWithRaycast --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models DROP COLUMN kind;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models DROP COLUMN walls;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models RENAME COLUMN sky_image TO background_image;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models ADD mask_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE tokens ADD front_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004212901_ReplaceStoryMapWithRaycast', '9.0.20');
    END IF;
END $EF$;
COMMIT;


