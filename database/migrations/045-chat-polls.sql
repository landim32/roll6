-- Roll6 — chat polls (045), to apply after 045-user-notifications.sql (i.e. after 20261009194709_AddUserNotifications).
-- chat_poll_options: the 2-12 answers of a poll (turn_type 12, question in turns.description), by position;
-- chat_poll_votes: one vote per character per poll (ix_chat_poll_votes_character) and one for the master, without a character (ix_chat_poll_votes_master).
-- The laugh reaction (Gargalhada, chat_reactions.kind = 3) needs no schema change.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/045-chat-polls.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009194709_AddUserNotifications 20261009225546_AddChatPolls --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE TABLE chat_poll_options (
        chat_poll_option_id bigint GENERATED ALWAYS AS IDENTITY,
        turn_id bigint NOT NULL,
        position integer NOT NULL,
        text character varying(100) NOT NULL,
        CONSTRAINT chat_poll_options_pkey PRIMARY KEY (chat_poll_option_id),
        CONSTRAINT fk_turn_chat_poll_option FOREIGN KEY (turn_id) REFERENCES turns (turn_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE TABLE chat_poll_votes (
        chat_poll_vote_id bigint GENERATED ALWAYS AS IDENTITY,
        turn_id bigint NOT NULL,
        chat_poll_option_id bigint NOT NULL,
        user_id bigint NOT NULL,
        character_id bigint,
        created_at timestamp without time zone NOT NULL,
        CONSTRAINT chat_poll_votes_pkey PRIMARY KEY (chat_poll_vote_id),
        CONSTRAINT fk_character_chat_poll_vote FOREIGN KEY (character_id) REFERENCES characters (character_id),
        CONSTRAINT fk_chat_poll_option_vote FOREIGN KEY (chat_poll_option_id) REFERENCES chat_poll_options (chat_poll_option_id),
        CONSTRAINT fk_turn_chat_poll_vote FOREIGN KEY (turn_id) REFERENCES turns (turn_id),
        CONSTRAINT fk_user_chat_poll_vote FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE UNIQUE INDEX ix_chat_poll_options_turn_position ON chat_poll_options (turn_id, position);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE UNIQUE INDEX ix_chat_poll_votes_character ON chat_poll_votes (turn_id, character_id) WHERE character_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE INDEX "IX_chat_poll_votes_character_id" ON chat_poll_votes (character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE UNIQUE INDEX ix_chat_poll_votes_master ON chat_poll_votes (turn_id) WHERE character_id IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE INDEX ix_chat_poll_votes_option ON chat_poll_votes (chat_poll_option_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    CREATE INDEX "IX_chat_poll_votes_user_id" ON chat_poll_votes (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009225546_AddChatPolls') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009225546_AddChatPolls', '9.0.20');
    END IF;
END $EF$;
COMMIT;

