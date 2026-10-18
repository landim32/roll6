-- Roll6 — library images (090), to apply after 086-animation-conversations.sql (i.e. after 20261018181722_AddAnimationConversations).
-- campaigns.image: the campaign's picture on the library cards, sent by the master (stored image name, null = default figure).
-- weapons.thumbnail_image, animations.thumbnail_image: the PNG of the library card, rendered by the site (null = drawn live).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/090-library-images.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261018181722_AddAnimationConversations 20261018225650_AddLibraryImages --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018225650_AddLibraryImages') THEN
    ALTER TABLE weapons ADD thumbnail_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018225650_AddLibraryImages') THEN
    ALTER TABLE campaigns ADD image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018225650_AddLibraryImages') THEN
    ALTER TABLE animations ADD thumbnail_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018225650_AddLibraryImages') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261018225650_AddLibraryImages', '9.0.20');
    END IF;
END $EF$;
COMMIT;

