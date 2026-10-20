-- Roll6 — GM mode (096), to apply after 093-chat-ask.sql (i.e. after 20261019021709_AddChatAsk).
-- campaigns.gm_mode: the master's console closes the turn by itself when every approved character has acted (false, the default for every campaign).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/096-gm-mode.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261019021709_AddChatAsk 20261020031658_AddCampaignGmMode --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261020031658_AddCampaignGmMode') THEN
    ALTER TABLE campaigns ADD gm_mode boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261020031658_AddCampaignGmMode') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261020031658_AddCampaignGmMode', '9.0.20');
    END IF;
END $EF$;
COMMIT;

