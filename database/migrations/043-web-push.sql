-- Roll6 — Web Push notifications (043, issue #39), to apply after 042-chat-dice-roll.sql (i.e. after 20261009044306_AddChatDiceRoll).
-- push_subscriptions: one row per device/browser endpoint (unique); campaign_notification_prefs: muted campaigns per user;
-- campaigns.majority_notified_turn: the turn whose "Falta apenas voce" was already sent; turn_type 11 Poke (chat line).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/043-web-push.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009044306_AddChatDiceRoll 20261009143549_AddWebPush --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    ALTER TABLE campaigns ADD majority_notified_turn integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE TABLE campaign_notification_prefs (
        campaign_notification_pref_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        campaign_id bigint NOT NULL,
        muted boolean NOT NULL,
        CONSTRAINT campaign_notification_prefs_pkey PRIMARY KEY (campaign_notification_pref_id),
        CONSTRAINT fk_campaign_notification_pref FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_user_notification_pref FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE TABLE push_subscriptions (
        push_subscription_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        endpoint character varying(1000) NOT NULL,
        p256dh character varying(200) NOT NULL,
        auth character varying(100) NOT NULL,
        user_agent character varying(500),
        created_at timestamp without time zone NOT NULL,
        last_used_at timestamp without time zone,
        CONSTRAINT push_subscriptions_pkey PRIMARY KEY (push_subscription_id),
        CONSTRAINT fk_user_push_subscription FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE INDEX "IX_campaign_notification_prefs_campaign_id" ON campaign_notification_prefs (campaign_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE UNIQUE INDEX ix_campaign_notification_prefs_user_campaign ON campaign_notification_prefs (user_id, campaign_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE UNIQUE INDEX ix_push_subscriptions_endpoint ON push_subscriptions (endpoint);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    CREATE INDEX ix_push_subscriptions_user ON push_subscriptions (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009143549_AddWebPush') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009143549_AddWebPush', '9.0.20');
    END IF;
END $EF$;
COMMIT;

