-- Roll6 — dice rolls in the chat, to apply after 041-campaign-chat.sql (i.e. after 20261009031324_AddCampaignChat).
-- turns: new column dice (the three faces of a roll, "5,3,6"); new turn_type value 10 Roll (conversation).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/042-chat-dice-roll.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009031324_AddCampaignChat 20261009044306_AddChatDiceRoll --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009044306_AddChatDiceRoll') THEN
    ALTER TABLE turns ADD dice character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009044306_AddChatDiceRoll') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009044306_AddChatDiceRoll', '9.0.20');
    END IF;
END $EF$;
COMMIT;

