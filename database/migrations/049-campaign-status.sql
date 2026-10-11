-- Roll6 — campaign status (049), to apply after 047-chat-whispers.sql (i.e. after 20261010003326_AddChatWhispers).
-- campaigns.status: 1 Preparando, 2 Ativa, 3 Pausada, 4 Finalizada; existing campaigns become 2 (Ativa) through the default.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/049-campaign-status.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261010003326_AddChatWhispers 20261011032007_AddCampaignStatus --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011032007_AddCampaignStatus') THEN
    ALTER TABLE campaigns ADD status integer NOT NULL DEFAULT 2;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011032007_AddCampaignStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261011032007_AddCampaignStatus', '9.0.20');
    END IF;
END $EF$;
COMMIT;

