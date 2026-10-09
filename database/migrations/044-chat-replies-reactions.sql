-- Roll6 — chat replies, reactions and cancelled actions (044), to apply after 043-web-push.sql (i.e. after 20261009143549_AddWebPush).
-- turns: cancelled_at (an action replaced, reset or deleted: "Acao cancelada", out of every turn rule) and reply_to_turn_id (fk_turn_reply);
-- chat_reactions: Curtir (1) / Amei (2), one per user and entry.
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/044-chat-replies-reactions.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261009143549_AddWebPush 20261009185308_AddChatRepliesReactions --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    ALTER TABLE turns ADD cancelled_at timestamp without time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    ALTER TABLE turns ADD reply_to_turn_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    CREATE TABLE chat_reactions (
        chat_reaction_id bigint GENERATED ALWAYS AS IDENTITY,
        turn_id bigint NOT NULL,
        user_id bigint NOT NULL,
        kind smallint NOT NULL,
        created_at timestamp without time zone NOT NULL,
        CONSTRAINT chat_reactions_pkey PRIMARY KEY (chat_reaction_id),
        CONSTRAINT fk_turn_chat_reaction FOREIGN KEY (turn_id) REFERENCES turns (turn_id),
        CONSTRAINT fk_user_chat_reaction FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    CREATE INDEX ix_turns_reply_to ON turns (reply_to_turn_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    CREATE UNIQUE INDEX ix_chat_reactions_turn_user ON chat_reactions (turn_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    CREATE INDEX "IX_chat_reactions_user_id" ON chat_reactions (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    ALTER TABLE turns ADD CONSTRAINT fk_turn_reply FOREIGN KEY (reply_to_turn_id) REFERENCES turns (turn_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009185308_AddChatRepliesReactions') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009185308_AddChatRepliesReactions', '9.0.20');
    END IF;
END $EF$;
COMMIT;

