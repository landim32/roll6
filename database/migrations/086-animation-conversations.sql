-- Roll6 — animation editor conversations (086), to apply after 083-weapon-sockets.sql (i.e. after 20261018134011_AddWeaponSockets).
-- animation_conversations: one open conversation per animation with the local Claude (claude_session_id, started, closed_at; unique partial index on the open one).
-- animation_messages: the lines of a conversation (role 1 user / 2 Claude / 3 notice, text ≤ 20000, image_count).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/086-animation-conversations.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261018134011_AddWeaponSockets 20261018181722_AddAnimationConversations --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    CREATE TABLE animation_conversations (
        animation_conversation_id bigint GENERATED ALWAYS AS IDENTITY,
        animation_id bigint NOT NULL,
        user_id bigint NOT NULL,
        claude_session_id uuid NOT NULL,
        started boolean NOT NULL DEFAULT FALSE,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        closed_at timestamp without time zone,
        CONSTRAINT animation_conversations_pkey PRIMARY KEY (animation_conversation_id),
        CONSTRAINT fk_animation_animation_conversation FOREIGN KEY (animation_id) REFERENCES animations (animation_id),
        CONSTRAINT fk_user_animation_conversation FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    CREATE TABLE animation_messages (
        animation_message_id bigint GENERATED ALWAYS AS IDENTITY,
        animation_conversation_id bigint NOT NULL,
        role integer NOT NULL,
        text character varying(20000) NOT NULL,
        image_count integer NOT NULL DEFAULT 0,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT animation_messages_pkey PRIMARY KEY (animation_message_id),
        CONSTRAINT fk_animation_conversation_message FOREIGN KEY (animation_conversation_id) REFERENCES animation_conversations (animation_conversation_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    CREATE UNIQUE INDEX ix_animation_conversations_open ON animation_conversations (animation_id) WHERE closed_at IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    CREATE INDEX ix_animation_conversations_user ON animation_conversations (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    CREATE INDEX ix_animation_messages_conversation ON animation_messages (animation_conversation_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018181722_AddAnimationConversations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261018181722_AddAnimationConversations', '9.0.20');
    END IF;
END $EF$;
COMMIT;

