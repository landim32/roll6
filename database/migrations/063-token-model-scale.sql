-- Roll6 — token 3D model size (063), to apply after 061-remove-roll6-clips.sql (i.e. after 20261014182056_RemoveRoll6Clips).
-- tokens.model_scale: size of the token's 3D model in the 3D view, percent of its automatic height (25–400, steps of 5); existing tokens get 100 (as before).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/063-token-model-scale.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014182056_RemoveRoll6Clips 20261014220053_AddTokenModelScale --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014220053_AddTokenModelScale') THEN
    ALTER TABLE tokens ADD model_scale integer NOT NULL DEFAULT 100;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014220053_AddTokenModelScale') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014220053_AddTokenModelScale', '9.0.20');
    END IF;
END $EF$;
COMMIT;

