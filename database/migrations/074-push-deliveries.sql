-- Roll6 — durable push outbox (074), to apply after 072-pending-notice.sql (i.e. after 20261015202650_AddCampaignPendingNotice).
-- push_deliveries: one row per push still to deliver to one device (sent, gone, expired or out of attempts = deleted); push_subscriptions.failure_count: failed deliveries in a row (5 = the device is skipped); campaigns.majority_notified_turn dropped ("Falta…" now goes on every first action after the majority).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/074-push-deliveries.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261015202650_AddCampaignPendingNotice 20261015212235_AddPushDeliveries --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    ALTER TABLE campaigns DROP COLUMN majority_notified_turn;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    ALTER TABLE push_subscriptions ADD failure_count integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    CREATE TABLE push_deliveries (
        push_delivery_id bigint GENERATED ALWAYS AS IDENTITY,
        push_subscription_id bigint NOT NULL,
        payload character varying(4000) NOT NULL,
        topic character varying(32) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        next_attempt_at timestamp without time zone NOT NULL,
        created_at timestamp without time zone NOT NULL,
        CONSTRAINT push_deliveries_pkey PRIMARY KEY (push_delivery_id),
        CONSTRAINT fk_push_delivery_subscription FOREIGN KEY (push_subscription_id) REFERENCES push_subscriptions (push_subscription_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    CREATE INDEX ix_push_deliveries_due ON push_deliveries (next_attempt_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    CREATE INDEX ix_push_deliveries_subscription ON push_deliveries (push_subscription_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261015212235_AddPushDeliveries') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261015212235_AddPushDeliveries', '9.0.20');
    END IF;
END $EF$;
COMMIT;

