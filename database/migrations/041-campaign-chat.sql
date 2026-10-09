-- Roll6 — campaign chat (041, issue #32), to apply after 037-campaign-move.sql (i.e. after 20261008215633_AddCampaignCharacterMove).
-- turns: the turn log becomes the campaign chat — adds display_name, display_image, image, audio, audio_seconds, deleted_at and the index ix_turns_campaign_created; new turn_type values 6 Text, 7 Image, 8 Audio, 9 TurnFinished; every turn that already ended gets its "Turno N finalizado" divider (type 9) right after its last entry.
-- chat_reads: where each user stopped reading each campaign's chat.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/041-campaign-chat.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261008215633_AddCampaignCharacterMove 20261009031324_AddCampaignChat --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD audio character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD audio_seconds integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD deleted_at timestamp without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD display_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD display_name character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    ALTER TABLE turns ADD image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    CREATE TABLE chat_reads (
        chat_read_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        user_id bigint NOT NULL,
        last_read_at timestamp without time zone NOT NULL,
        CONSTRAINT chat_reads_pkey PRIMARY KEY (chat_read_id),
        CONSTRAINT fk_campaign_chat_read FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_user_chat_read FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    CREATE INDEX ix_turns_campaign_created ON turns (campaign_id, created_at, turn_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    CREATE UNIQUE INDEX ix_chat_reads_campaign_user ON chat_reads (campaign_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    CREATE INDEX "IX_chat_reads_user_id" ON chat_reads (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN

    INSERT INTO turns (campaign_id, map_id, turn_no, turn_type, user_id, created_at)
    SELECT t.campaign_id, NULL, t.turn_no, 9, c.user_id, MAX(t.created_at) + INTERVAL '1 millisecond'
    FROM turns t
    JOIN campaigns c ON c.campaign_id = t.campaign_id
    WHERE t.turn_no < c.current_turn AND t.turn_type <> 9
    GROUP BY t.campaign_id, t.turn_no, c.user_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009031324_AddCampaignChat') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009031324_AddCampaignChat', '9.0.20');
    END IF;
END $EF$;
COMMIT;

