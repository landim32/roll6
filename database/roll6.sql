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

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928072746_AddCharacterSheetFile') THEN
    ALTER TABLE characters ADD sheet_file character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928072746_AddCharacterSheetFile') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928072746_AddCharacterSheetFile', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928092117_ClearCopiedCampaignNotes') THEN
    UPDATE campaign_characters AS cc
    SET sheet = NULL
    FROM characters AS c
    WHERE c.character_id = cc.character_id
      AND cc.sheet IS NOT NULL
      AND cc.sheet = c.sheet;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928092117_ClearCopiedCampaignNotes') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928092117_ClearCopiedCampaignNotes', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD changes jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD moved integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD user_id bigint;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    UPDATE turns AS t
    SET user_id = c.user_id
    FROM characters AS c
    WHERE t.user_id IS NULL
      AND t.character_id = c.character_id
      AND t.turn_type IN (1, 2);

    UPDATE turns AS t
    SET user_id = cp.user_id
    FROM campaigns AS cp
    WHERE t.user_id IS NULL
      AND t.campaign_id = cp.campaign_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    CREATE INDEX ix_turns_user ON turns (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    ALTER TABLE turns ADD CONSTRAINT fk_user_turn FOREIGN KEY (user_id) REFERENCES users (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928122310_AddTurnAuthorMovedChanges') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928122310_AddTurnAuthorMovedChanges', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928130000_AddNpcStatus') THEN
    ALTER TABLE npcs ADD status character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928130000_AddNpcStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928130000_AddNpcStatus', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    ALTER TABLE map_npcs RENAME COLUMN life TO current_life;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    ALTER TABLE map_npcs RENAME COLUMN energy TO current_energy;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928173235_RenameMapNpcCurrentVitals') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928173235_RenameMapNpcCurrentVitals', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928184156_TurnNarration') THEN
    ALTER TABLE turns ALTER COLUMN description TYPE character varying(10000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928184156_TurnNarration') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928184156_TurnNarration', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE campaigns ADD slug character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE maps ADD slug character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    UPDATE campaigns AS c
    SET slug = s.slug
    FROM (
        SELECT campaign_id,
               CASE WHEN n = 1 THEN base ELSE base || '-' || n::text END AS slug
        FROM (
            SELECT campaign_id,
                   base,
                   row_number() OVER (PARTITION BY base ORDER BY campaign_id) AS n
            FROM (
                SELECT campaign_id,
                       CASE WHEN base = '' THEN 'campanha' ELSE base END AS base
                FROM (
                    SELECT campaign_id,
                           rtrim(left(btrim(regexp_replace(lower(translate(name,
                               'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝý',
                               'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),
                               '[^a-z0-9]+', '-', 'g'), '-'), 80), '-') AS base
                    FROM campaigns
                ) raw
            ) normalized
        ) numbered
    ) s
    WHERE c.campaign_id = s.campaign_id;

    UPDATE campaigns AS c
    SET slug = c.slug || '-' || c.campaign_id::text
    WHERE c.campaign_id IN (
        SELECT campaign_id
        FROM (
            SELECT campaign_id,
                   row_number() OVER (PARTITION BY slug ORDER BY campaign_id) AS n
            FROM campaigns
        ) d
        WHERE d.n > 1
    );

    UPDATE maps AS m
    SET slug = s.slug
    FROM (
        SELECT map_id,
               CASE WHEN n = 1 THEN base ELSE base || '-' || n::text END AS slug
        FROM (
            SELECT map_id,
                   base,
                   row_number() OVER (PARTITION BY base ORDER BY map_id) AS n
            FROM (
                SELECT map_id,
                       CASE WHEN base = '' THEN 'mapa' ELSE base END AS base
                FROM (
                    SELECT map_id,
                           rtrim(left(btrim(regexp_replace(lower(translate(name,
                               'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝý',
                               'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),
                               '[^a-z0-9]+', '-', 'g'), '-'), 80), '-') AS base
                    FROM maps
                ) raw
            ) normalized
        ) numbered
    ) s
    WHERE m.map_id = s.map_id;

    UPDATE maps AS m
    SET slug = m.slug || '-' || m.map_id::text
    WHERE m.map_id IN (
        SELECT map_id
        FROM (
            SELECT map_id,
                   row_number() OVER (PARTITION BY slug ORDER BY map_id) AS n
            FROM maps
        ) d
        WHERE d.n > 1
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE campaigns ALTER COLUMN slug SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    ALTER TABLE maps ALTER COLUMN slug SET NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    CREATE UNIQUE INDEX ix_campaigns_slug ON campaigns (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    CREATE UNIQUE INDEX ix_maps_slug ON maps (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929114755_AddSlugs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260929114755_AddSlugs', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    ALTER TABLE map_npcs ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    ALTER TABLE campaign_characters ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    UPDATE tokens SET up_space = 1 WHERE up_space NOT IN (1, 2, 3, 7, 10);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    UPDATE tokens SET down_space = 2 WHERE down_space IS NOT NULL AND down_space NOT IN (1, 2, 3, 7, 10);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260929215843_AddPostureAndTokenSpaces') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260929215843_AddPostureAndTokenSpaces', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    ALTER TABLE campaign_characters ADD sheet_file character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    WITH prepared AS (
        SELECT cc.campaign_character_id,
               CASE WHEN cc.sheet IS NULL OR btrim(cc.sheet) = ''
                    THEN ''
                    ELSE E'\n\n## Anotações anteriores da campanha\n\n' || cc.sheet
               END AS suffix
        FROM campaign_characters AS cc
    )
    UPDATE campaign_characters AS cc
    SET sheet_file = c.sheet_file,
        sheet = left(
                  left(coalesce(c.sheet, ''), greatest(0, 20000 - length(p.suffix))) || p.suffix,
                  20000)
    FROM characters AS c, prepared AS p
    WHERE c.character_id = cc.character_id
      AND p.campaign_character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261001001517_AddCampaignSheetFile') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261001001517_AddCampaignSheetFile', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD kind integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD sky_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    ALTER TABLE map_models ADD walls jsonb;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004174459_AddStoryMap') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004174459_AddStoryMap', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models DROP COLUMN kind;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models DROP COLUMN walls;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models RENAME COLUMN sky_image TO background_image;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE map_models ADD mask_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    ALTER TABLE tokens ADD front_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004212901_ReplaceStoryMapWithRaycast') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004212901_ReplaceStoryMapWithRaycast', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD back_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD left_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    ALTER TABLE tokens ADD right_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261004234816_AddTokenDirectionImages') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261004234816_AddTokenDirectionImages', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005145717_AddWallTextureImage') THEN
    ALTER TABLE map_models ADD wall_texture_image character varying(260);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005145717_AddWallTextureImage') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261005145717_AddWallTextureImage', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005180820_AddNpcPosture') THEN
    ALTER TABLE npcs ADD posture integer NOT NULL DEFAULT 1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005180820_AddNpcPosture') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261005180820_AddNpcPosture', '9.0.20');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    ALTER TABLE campaign_characters ADD current_move integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261008215633_AddCampaignCharacterMove') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261008215633_AddCampaignCharacterMove', '9.0.20');
    END IF;
END $EF$;

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

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009044306_AddChatDiceRoll') THEN
    ALTER TABLE turns ADD dice character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261009044306_AddChatDiceRoll') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261009044306_AddChatDiceRoll', '9.0.20');
    END IF;
END $EF$;

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

