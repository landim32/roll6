-- Roll6 — token 3D model (055), to apply after 054-campaign-free-mode.sql (i.e. after 20261012190747_AddCampaignFreeMode).
-- tokens.model_file: stored name ({guid}.glb) of the token's glTF binary model, drawn by the 3D view instead of the 2.5D figure (null = none).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/055-token-model.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261012190747_AddCampaignFreeMode 20261014022830_AddTokenModelFile --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014022830_AddTokenModelFile') THEN
    ALTER TABLE tokens ADD model_file character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014022830_AddTokenModelFile') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014022830_AddTokenModelFile', '9.0.20');
    END IF;
END $EF$;
COMMIT;

