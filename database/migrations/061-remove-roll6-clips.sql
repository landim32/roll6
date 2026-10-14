-- Roll6 — Roll6's own animations removed (061), to apply after 059-animations.sql (i.e. after 20261014154414_AddAnimations).
-- tokens: model_idle_clip/model_walk_clip/model_down_clip that chose "roll6" or "roll6-guard" go back to automatic (NULL); no schema change.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/061-remove-roll6-clips.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014154414_AddAnimations 20261014182056_RemoveRoll6Clips --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014182056_RemoveRoll6Clips') THEN
    UPDATE tokens SET model_idle_clip = NULL WHERE model_idle_clip IN ('roll6', 'roll6-guard');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014182056_RemoveRoll6Clips') THEN
    UPDATE tokens SET model_walk_clip = NULL WHERE model_walk_clip IN ('roll6', 'roll6-guard');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014182056_RemoveRoll6Clips') THEN
    UPDATE tokens SET model_down_clip = NULL WHERE model_down_clip IN ('roll6', 'roll6-guard');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014182056_RemoveRoll6Clips') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014182056_RemoveRoll6Clips', '9.0.20');
    END IF;
END $EF$;
COMMIT;

