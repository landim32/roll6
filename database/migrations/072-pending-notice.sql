-- Roll6 — pending notice over the chat (072), to apply after 071-npc-category.sql (i.e. after 20261015181236_AddCampaignNpcCategory).
-- campaigns.pending_notice: the blinking pictures of who still owes a play this turn are shown (true, the default for every campaign) or hidden by the master.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/072-pending-notice.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261015181236_AddCampaignNpcCategory 20261015202650_AddCampaignPendingNotice --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015202650_AddCampaignPendingNotice') THEN
    ALTER TABLE campaigns ADD pending_notice boolean NOT NULL DEFAULT TRUE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015202650_AddCampaignPendingNotice') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261015202650_AddCampaignPendingNotice', '9.0.20');
    END IF;
END $EF$;
COMMIT;

