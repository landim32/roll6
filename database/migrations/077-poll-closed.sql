-- Roll6 — closing chat polls (077), to apply after 074-push-deliveries.sql (i.e. after 20261015212235_AddPushDeliveries).
-- turns.poll_closed_at: when the master closed a poll (null = open); a closed poll takes no votes and is never pinned.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/077-poll-closed.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261015212235_AddPushDeliveries 20261016113812_AddPollClosedAt --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016113812_AddPollClosedAt') THEN
    ALTER TABLE turns ADD poll_closed_at timestamp without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261016113812_AddPollClosedAt') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261016113812_AddPollClosedAt', '9.0.20');
    END IF;
END $EF$;
COMMIT;

