-- Roll6 — chat time of the turns (050), to apply after 047-chat-whispers.sql (i.e. after 20261010003326_AddChatWhispers).
-- turns.chat_at: the place of an entry in the chat — its creation time, or the last vote of a poll, so that a poll answered
-- by everyone stays where it was pinned. Backfilled from created_at; index ix_turns_campaign_chat for the chat pages.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/050-turn-chat-at.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261010003326_AddChatWhispers 20261011044452_AddTurnChatAt --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011044452_AddTurnChatAt') THEN
    ALTER TABLE turns ADD chat_at timestamp without time zone NOT NULL DEFAULT (now());
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011044452_AddTurnChatAt') THEN
    UPDATE turns SET chat_at = created_at;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011044452_AddTurnChatAt') THEN
    CREATE INDEX ix_turns_campaign_chat ON turns (campaign_id, chat_at, turn_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261011044452_AddTurnChatAt') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261011044452_AddTurnChatAt', '9.0.20');
    END IF;
END $EF$;
COMMIT;

