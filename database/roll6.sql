-- Roll6 — full database schema (PostgreSQL), generated from the EF Core migrations.
-- Idempotent: runs on an empty database or on one already partly migrated (it applies only the missing
-- migrations and records them in "__EFMigrationsHistory", so the API's startup migrations stay in sync).
--
-- Usage:   psql -h <host> -U <user> -d <database> -f database/roll6.sql
-- Regenerate after adding a migration (from backend/):
--   dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql
-- (then put this header back)

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025140_InitialUsers') THEN
    CREATE TABLE users (
        user_id bigint GENERATED ALWAYS AS IDENTITY,
        name character varying(260) NOT NULL,
        email character varying(260) NOT NULL,
        password_hash character varying(500) NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT users_pkey PRIMARY KEY (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025140_InitialUsers') THEN
    CREATE UNIQUE INDEX ix_users_email ON users (email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025140_InitialUsers') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025140_InitialUsers', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025335_AddMapModels') THEN
    CREATE TABLE map_models (
        map_model_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        description character varying(2000),
        image character varying(260),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        changed_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT map_models_pkey PRIMARY KEY (map_model_id),
        CONSTRAINT fk_user_map_model FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025335_AddMapModels') THEN
    CREATE INDEX "IX_map_models_user_id" ON map_models (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025335_AddMapModels') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025335_AddMapModels', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE TABLE campaigns (
        campaign_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id),
        CONSTRAINT fk_user_campaign FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE TABLE maps (
        map_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        map_model_id bigint NOT NULL,
        user_id bigint NOT NULL,
        sequence integer NOT NULL,
        name character varying(260) NOT NULL,
        status integer NOT NULL DEFAULT 1,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT maps_pkey PRIMARY KEY (map_id),
        CONSTRAINT fk_campaign_map FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_map_model_map FOREIGN KEY (map_model_id) REFERENCES map_models (map_model_id),
        CONSTRAINT fk_user_map FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE INDEX "IX_campaigns_user_id" ON campaigns (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE UNIQUE INDEX ix_maps_campaign_model_sequence ON maps (campaign_id, map_model_id, sequence);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE INDEX "IX_maps_map_model_id" ON maps (map_model_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    CREATE INDEX "IX_maps_user_id" ON maps (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025537_AddCampaignsAndMaps') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025537_AddCampaignsAndMaps', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025635_AddTokens') THEN
    CREATE TABLE tokens (
        token_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        description character varying(2000),
        up_space integer NOT NULL DEFAULT 1,
        down_space integer NOT NULL DEFAULT 2,
        up_image character varying(260),
        down_image character varying(260),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT tokens_pkey PRIMARY KEY (token_id),
        CONSTRAINT fk_user_token FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025635_AddTokens') THEN
    CREATE INDEX "IX_tokens_user_id" ON tokens (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025635_AddTokens') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025635_AddTokens', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025749_AddMapTokens') THEN
    CREATE TABLE map_tokens (
        map_token_id bigint GENERATED ALWAYS AS IDENTITY,
        map_id bigint NOT NULL,
        token_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        token_type integer NOT NULL,
        sheet character varying(20000),
        life integer NOT NULL,
        energy integer NOT NULL,
        status character varying(260),
        move integer NOT NULL,
        q integer NOT NULL,
        r integer NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT map_tokens_pkey PRIMARY KEY (map_token_id),
        CONSTRAINT fk_map_map_token FOREIGN KEY (map_id) REFERENCES maps (map_id),
        CONSTRAINT fk_token_map_token FOREIGN KEY (token_id) REFERENCES tokens (token_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025749_AddMapTokens') THEN
    CREATE INDEX "IX_map_tokens_map_id" ON map_tokens (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025749_AddMapTokens') THEN
    CREATE INDEX "IX_map_tokens_token_id" ON map_tokens (token_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025749_AddMapTokens') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025749_AddMapTokens', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025835_AddCharacters') THEN
    CREATE TABLE characters (
        character_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        sheet character varying(20000),
        life integer NOT NULL,
        energy integer NOT NULL,
        status character varying(260),
        move integer NOT NULL,
        image character varying(260),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT characters_pkey PRIMARY KEY (character_id),
        CONSTRAINT fk_user_character FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025835_AddCharacters') THEN
    CREATE INDEX "IX_characters_user_id" ON characters (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925025835_AddCharacters') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925025835_AddCharacters', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD grid_height integer NOT NULL DEFAULT 20;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD grid_width integer NOT NULL DEFAULT 20;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD image_height integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD image_left integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD image_top integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    ALTER TABLE map_models ADD image_width integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925133410_AddMapModelGridLayout') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925133410_AddMapModelGridLayout', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925135025_MakeTokenDownSpaceOptional') THEN
    ALTER TABLE tokens ALTER COLUMN down_space DROP NOT NULL;
    ALTER TABLE tokens ALTER COLUMN down_space DROP DEFAULT;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925135025_MakeTokenDownSpaceOptional') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925135025_MakeTokenDownSpaceOptional', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141423_MapTokenPositionXY') THEN
    ALTER TABLE map_tokens RENAME COLUMN r TO y;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141423_MapTokenPositionXY') THEN
    ALTER TABLE map_tokens RENAME COLUMN q TO x;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141423_MapTokenPositionXY') THEN
    UPDATE map_tokens SET y = y + (x - (x & 1)) / 2;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141423_MapTokenPositionXY') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925141423_MapTokenPositionXY', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141514_AddMapTokenLook') THEN
    ALTER TABLE map_tokens ADD look integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925141514_AddMapTokenLook') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925141514_AddMapTokenLook', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925150753_AddCampaignOpenAndCharacters') THEN
    ALTER TABLE campaigns ADD open boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925150753_AddCampaignOpenAndCharacters') THEN
    CREATE TABLE campaign_characters (
        campaign_character_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        character_id bigint NOT NULL,
        status integer NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT campaign_characters_pkey PRIMARY KEY (campaign_character_id),
        CONSTRAINT fk_campaign_campaign_character FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_character_campaign_character FOREIGN KEY (character_id) REFERENCES characters (character_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925150753_AddCampaignOpenAndCharacters') THEN
    CREATE UNIQUE INDEX ix_campaign_characters_campaign_character ON campaign_characters (campaign_id, character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925150753_AddCampaignOpenAndCharacters') THEN
    CREATE INDEX "IX_campaign_characters_character_id" ON campaign_characters (character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925150753_AddCampaignOpenAndCharacters') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925150753_AddCampaignOpenAndCharacters', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925212828_AddCampaignCharacterVitals') THEN
    ALTER TABLE campaign_characters ADD current_energy integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925212828_AddCampaignCharacterVitals') THEN
    ALTER TABLE campaign_characters ADD current_life integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925212828_AddCampaignCharacterVitals') THEN
    UPDATE campaign_characters cc SET current_life = c.life, current_energy = c.energy FROM characters c WHERE c.character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925212828_AddCampaignCharacterVitals') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925212828_AddCampaignCharacterVitals', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925232419_MoveCharacterStatusToCampaign') THEN
    ALTER TABLE campaign_characters ADD character_status character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925232419_MoveCharacterStatusToCampaign') THEN
    ALTER TABLE campaign_characters ADD sheet character varying(20000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925232419_MoveCharacterStatusToCampaign') THEN
    UPDATE campaign_characters cc SET character_status = c.status, sheet = c.sheet FROM characters c WHERE c.character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925232419_MoveCharacterStatusToCampaign') THEN
    ALTER TABLE characters DROP COLUMN status;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260925232419_MoveCharacterStatusToCampaign') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260925232419_MoveCharacterStatusToCampaign', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    DROP INDEX "IX_map_tokens_map_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    ALTER TABLE map_tokens ADD campaign_character_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    ALTER TABLE characters ADD token_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    CREATE INDEX "IX_map_tokens_campaign_character_id" ON map_tokens (campaign_character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    CREATE UNIQUE INDEX ix_map_tokens_map_campaign_character ON map_tokens (map_id, campaign_character_id) WHERE campaign_character_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    CREATE INDEX "IX_characters_token_id" ON characters (token_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    ALTER TABLE characters ADD CONSTRAINT fk_token_character FOREIGN KEY (token_id) REFERENCES tokens (token_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    ALTER TABLE map_tokens ADD CONSTRAINT fk_campaign_character_map_token FOREIGN KEY (campaign_character_id) REFERENCES campaign_characters (campaign_character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926001813_AddCharacterTokenAndMapTokenParticipation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926001813_AddCharacterTokenAndMapTokenParticipation', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    ALTER TABLE map_tokens ADD map_npc_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE TABLE npcs (
        npc_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        token_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        life integer NOT NULL,
        energy integer NOT NULL,
        move integer NOT NULL,
        sheet character varying(20000),
        image character varying(260),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT npcs_pkey PRIMARY KEY (npc_id),
        CONSTRAINT fk_token_npc FOREIGN KEY (token_id) REFERENCES tokens (token_id),
        CONSTRAINT fk_user_npc FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE TABLE campaign_npcs (
        campaign_npc_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        npc_id bigint NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT campaign_npcs_pkey PRIMARY KEY (campaign_npc_id),
        CONSTRAINT fk_campaign_campaign_npc FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_npc_campaign_npc FOREIGN KEY (npc_id) REFERENCES npcs (npc_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE TABLE map_npcs (
        map_npc_id bigint GENERATED ALWAYS AS IDENTITY,
        map_id bigint NOT NULL,
        npc_id bigint NOT NULL,
        name character varying(260) NOT NULL,
        life integer NOT NULL,
        energy integer NOT NULL,
        status character varying(260),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT map_npcs_pkey PRIMARY KEY (map_npc_id),
        CONSTRAINT fk_map_map_npc FOREIGN KEY (map_id) REFERENCES maps (map_id),
        CONSTRAINT fk_npc_map_npc FOREIGN KEY (npc_id) REFERENCES npcs (npc_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE UNIQUE INDEX ix_map_tokens_map_npc ON map_tokens (map_npc_id) WHERE map_npc_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE UNIQUE INDEX ix_campaign_npcs_campaign_npc ON campaign_npcs (campaign_id, npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE INDEX "IX_campaign_npcs_npc_id" ON campaign_npcs (npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE INDEX "IX_map_npcs_map_id" ON map_npcs (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE INDEX "IX_map_npcs_npc_id" ON map_npcs (npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE INDEX "IX_npcs_token_id" ON npcs (token_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    CREATE INDEX "IX_npcs_user_id" ON npcs (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    ALTER TABLE map_tokens ADD CONSTRAINT fk_map_npc_map_token FOREIGN KEY (map_npc_id) REFERENCES map_npcs (map_npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926095159_AddNpcs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926095159_AddNpcs', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926104643_MapTokenTypesToObject') THEN
    UPDATE map_tokens SET token_type = 4 WHERE token_type = 3 OR (token_type = 2 AND map_npc_id IS NULL);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926104643_MapTokenTypesToObject') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926104643_MapTokenTypesToObject', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    ALTER TABLE campaigns ADD current_turn integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE TABLE turns (
        turn_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        map_id bigint,
        character_id bigint,
        npc_id bigint,
        map_npc_id bigint,
        turn_no integer NOT NULL,
        turn_type integer NOT NULL,
        before_x integer,
        before_y integer,
        before_look integer,
        x integer,
        y integer,
        look integer,
        description character varying(2000),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT turns_pkey PRIMARY KEY (turn_id),
        CONSTRAINT fk_campaign_turn FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id),
        CONSTRAINT fk_character_turn FOREIGN KEY (character_id) REFERENCES characters (character_id),
        CONSTRAINT fk_map_npc_turn FOREIGN KEY (map_npc_id) REFERENCES map_npcs (map_npc_id),
        CONSTRAINT fk_map_turn FOREIGN KEY (map_id) REFERENCES maps (map_id),
        CONSTRAINT fk_npc_turn FOREIGN KEY (npc_id) REFERENCES npcs (npc_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE INDEX ix_turns_campaign_turn ON turns (campaign_id, turn_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE INDEX "IX_turns_character_id" ON turns (character_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE INDEX "IX_turns_map_id" ON turns (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE INDEX "IX_turns_map_npc_id" ON turns (map_npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    CREATE INDEX "IX_turns_npc_id" ON turns (npc_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926142535_AddTurns') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926142535_AddTurns', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926180013_AddCampaignCurrentMap') THEN
    ALTER TABLE campaigns ADD current_map_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926180013_AddCampaignCurrentMap') THEN
    CREATE INDEX "IX_campaigns_current_map_id" ON campaigns (current_map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926180013_AddCampaignCurrentMap') THEN
    ALTER TABLE campaigns ADD CONSTRAINT fk_map_campaign_current FOREIGN KEY (current_map_id) REFERENCES maps (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926180013_AddCampaignCurrentMap') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926180013_AddCampaignCurrentMap', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926203403_AddCampaignPlans') THEN
    CREATE TABLE campaign_plans (
        campaign_plan_id bigint GENERATED ALWAYS AS IDENTITY,
        campaign_id bigint NOT NULL,
        title character varying(260) NOT NULL,
        description character varying(50000),
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        changed_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT campaign_plans_pkey PRIMARY KEY (campaign_plan_id),
        CONSTRAINT fk_campaign_plan FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926203403_AddCampaignPlans') THEN
    CREATE INDEX ix_campaign_plans_campaign ON campaign_plans (campaign_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926203403_AddCampaignPlans') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926203403_AddCampaignPlans', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926211638_AddApiKeys') THEN
    CREATE TABLE api_keys (
        api_key_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(100) NOT NULL,
        key_prefix character varying(20) NOT NULL,
        key_hash character varying(64) NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        expires_at timestamp without time zone,
        last_used_at timestamp without time zone,
        revoked_at timestamp without time zone,
        CONSTRAINT api_keys_pkey PRIMARY KEY (api_key_id),
        CONSTRAINT fk_user_api_key FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926211638_AddApiKeys') THEN
    CREATE UNIQUE INDEX ix_api_keys_hash ON api_keys (key_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926211638_AddApiKeys') THEN
    CREATE INDEX ix_api_keys_user ON api_keys (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260926211638_AddApiKeys') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260926211638_AddApiKeys', '9.0.20');
    END IF;
END $EF$;
COMMIT;

