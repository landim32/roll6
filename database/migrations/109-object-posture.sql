-- Roll6 — posture of Object pieces (109), to apply after 108-character-single-map.sql (i.e. after 20261103235214_RemoveCurrentMap).
-- Adds map_tokens.posture (1 standing, 2 down, 3 out of combat; default 1), read only for Object pieces.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/109-object-posture.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261103235214_RemoveCurrentMap 20261107180235_AddObjectPosture --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261107180235_AddObjectPosture') THEN
    ALTER TABLE map_tokens ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261107180235_AddObjectPosture') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261107180235_AddObjectPosture', '9.0.20');
    END IF;
END $EF$;
COMMIT;

