-- Roll6 — token 3D model front (106), to apply after 099-repeated-action.sql (i.e. after 20261021184235_AddRepeatedAction).
-- tokens.model_front: which side of a model file without a skeleton is its front (0 = +Z, 90 = +X, 180 = -Z, 270 = -X); existing tokens get 0 (as before).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/106-token-model-front.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261021184235_AddRepeatedAction 20261031011119_AddTokenModelFront --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261031011119_AddTokenModelFront') THEN
    ALTER TABLE tokens ADD model_front integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261031011119_AddTokenModelFront') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261031011119_AddTokenModelFront', '9.0.20');
    END IF;
END $EF$;
COMMIT;

