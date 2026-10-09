-- Roll6 — notification inbox (the bell lists every notice exactly as the Web Push sent it), to apply after 044-chat-replies-reactions.sql (i.e. after 20261009185308_AddChatRepliesReactions).
-- user_notifications: user, campaign, kind, title, body, url, created_at, read_at.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/045-user-notifications.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009185308_AddChatRepliesReactions 20261009194709_AddUserNotifications --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009194709_AddUserNotifications') THEN
    CREATE TABLE user_notifications (
        user_notification_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        campaign_id bigint,
        kind character varying(30) NOT NULL,
        title character varying(300) NOT NULL,
        body character varying(500) NOT NULL,
        url character varying(500),
        created_at timestamp without time zone NOT NULL,
        read_at timestamp without time zone,
        CONSTRAINT user_notifications_pkey PRIMARY KEY (user_notification_id),
        CONSTRAINT fk_campaign_user_notification FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_user_user_notification FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009194709_AddUserNotifications') THEN
    CREATE INDEX "IX_user_notifications_campaign_id" ON user_notifications (campaign_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009194709_AddUserNotifications') THEN
    CREATE INDEX ix_user_notifications_user_created ON user_notifications (user_id, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009194709_AddUserNotifications') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009194709_AddUserNotifications', '9.0.20');
    END IF;
END $EF$;
COMMIT;

