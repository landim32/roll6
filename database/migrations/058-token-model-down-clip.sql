-- Roll6 — token 3D model death animation (058), to apply after 056-token-model-clips.sql (i.e. after 20261014082757_AddTokenModelClips).
-- tokens.model_down_clip: the animation a piece of the token plays once when it is down or out of combat (it rests on its last frame) — null = automatic, "roll6" (Roll6's death), "none" or "clip:{name}".
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/058-token-model-down-clip.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014082757_AddTokenModelClips 20261014124930_AddTokenModelDownClip --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014124930_AddTokenModelDownClip') THEN
    ALTER TABLE tokens ADD model_down_clip character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014124930_AddTokenModelDownClip') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014124930_AddTokenModelDownClip', '9.0.20');
    END IF;
END $EF$;
COMMIT;
