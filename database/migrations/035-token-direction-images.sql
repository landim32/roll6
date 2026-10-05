-- Roll6 — changes of 035-token-direction-views, to apply after 034-raycast-view.sql (i.e. after 20261004212901_ReplaceStoryMapWithRaycast).
-- tokens: adds right_image, left_image and back_image (varchar(260), nullable) — the "2.5D" side and back images the 3D view draws. No backfill: a token keeps only what it had.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/035-token-direction-images.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261004212901_ReplaceStoryMapWithRaycast 20261004234816_AddTokenDirectionImages --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD back_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD left_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD right_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004234816_AddTokenDirectionImages', '9.0.20');
    END IF;
END $EF$;
COMMIT;

