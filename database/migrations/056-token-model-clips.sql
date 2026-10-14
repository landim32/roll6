-- Roll6 — token 3D model animations (056), to apply after 055-token-model.sql (i.e. after 20261014022830_AddTokenModelFile).
-- tokens.model_idle_clip / model_walk_clip: the animation chosen for each state of the token's 3D model — null = automatic, "roll6", "none" or "clip:{name}".
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/056-token-model-clips.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014022830_AddTokenModelFile 20261014082757_AddTokenModelClips --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014082757_AddTokenModelClips') THEN
    ALTER TABLE tokens ADD model_idle_clip character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014082757_AddTokenModelClips') THEN
    ALTER TABLE tokens ADD model_walk_clip character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014082757_AddTokenModelClips') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014082757_AddTokenModelClips', '9.0.20');
    END IF;
END $EF$;
COMMIT;

