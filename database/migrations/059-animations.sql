-- Roll6 — animation library (059), to apply after 058-token-model-down-clip.sql (i.e. after 20261014124930_AddTokenModelDownClip).
-- animations: library animations (roll6-animation JSON files in the bucket, {guid}.json) — name, owner, type 1–7 (Parado, Andando, Correndo, Agachado, Derrotado, Atacando, Defendendo), duration and loop read from the file. Tokens choose them as "animation:{id}" in model_idle_clip/model_walk_clip/model_down_clip (no change on tokens).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/059-animations.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261014124930_AddTokenModelDownClip 20261014154414_AddAnimations --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014154414_AddAnimations') THEN
    CREATE TABLE animations (
        animation_id bigint GENERATED ALWAYS AS IDENTITY,
        user_id bigint NOT NULL,
        name character varying(100) NOT NULL,
        animation_type integer NOT NULL,
        file_name character varying(260) NOT NULL,
        duration double precision NOT NULL,
        loop boolean NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT animations_pkey PRIMARY KEY (animation_id),
        CONSTRAINT fk_animation_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014154414_AddAnimations') THEN
    CREATE INDEX ix_animations_type ON animations (animation_type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014154414_AddAnimations') THEN
    CREATE INDEX ix_animations_user ON animations (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014154414_AddAnimations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014154414_AddAnimations', '9.0.20');
    END IF;
END $EF$;
COMMIT;

