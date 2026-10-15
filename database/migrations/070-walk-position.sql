-- Roll6 — exact walk position (070), to apply after 063-token-model-scale.sql (i.e. after 20261014220053_AddTokenModelScale).
-- map_tokens.walk_x / walk_y / walk_yaw: where the 3D free-mode walk left the figure inside its hex (map pixels) and the direction it faces (radians); null = the middle of the hex.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/070-walk-position.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014220053_AddTokenModelScale 20261015172704_AddMapTokenWalkPosition --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015172704_AddMapTokenWalkPosition') THEN
    ALTER TABLE map_tokens ADD walk_x double precision;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015172704_AddMapTokenWalkPosition') THEN
    ALTER TABLE map_tokens ADD walk_y double precision;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015172704_AddMapTokenWalkPosition') THEN
    ALTER TABLE map_tokens ADD walk_yaw double precision;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015172704_AddMapTokenWalkPosition') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261015172704_AddMapTokenWalkPosition', '9.0.20');
    END IF;
END $EF$;
COMMIT;

