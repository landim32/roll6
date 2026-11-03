-- Roll6 — map paint (107), to apply after 106-token-model-front.sql (i.e. after 20261031011119_AddTokenModelFront).
-- map_hex_marks: one painted hex per row of a campaign map (kind 1 Wall … 7 Mark, text only for Mark), unique map + x + y.
-- map_drawings: rectangles, circles, pencil strokes, lines and arrows of a campaign map (points jsonb in map px).
-- Idempotent: skipped when the migration is already in "__EFMigrationsHistory" (the API also applies it on startup).
-- Usage: psql -h <host> -U <user> -d <database> -f database/migrations/107-map-paint.sql
-- Regenerate (from backend/): dotnet ef migrations script 20261031011119_AddTokenModelFront 20261103033731_AddMapPaint --idempotent --project Roll6.Infra --startup-project Roll6.API
START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE TABLE map_drawings (
        map_drawing_id bigint GENERATED ALWAYS AS IDENTITY,
        map_id bigint NOT NULL,
        kind integer NOT NULL,
        points jsonb NOT NULL,
        color character varying(7) NOT NULL,
        width integer NOT NULL,
        opacity real NOT NULL,
        user_id bigint NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT map_drawings_pkey PRIMARY KEY (map_drawing_id),
        CONSTRAINT fk_map_drawing FOREIGN KEY (map_id) REFERENCES maps (map_id),
        CONSTRAINT fk_user_map_drawing FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE TABLE map_hex_marks (
        map_hex_mark_id bigint GENERATED ALWAYS AS IDENTITY,
        map_id bigint NOT NULL,
        x integer NOT NULL,
        y integer NOT NULL,
        kind integer NOT NULL,
        text character varying(100),
        user_id bigint NOT NULL,
        created_at timestamp without time zone NOT NULL DEFAULT (now()),
        updated_at timestamp without time zone NOT NULL DEFAULT (now()),
        CONSTRAINT map_hex_marks_pkey PRIMARY KEY (map_hex_mark_id),
        CONSTRAINT fk_map_hex_mark FOREIGN KEY (map_id) REFERENCES maps (map_id),
        CONSTRAINT fk_user_map_hex_mark FOREIGN KEY (user_id) REFERENCES users (user_id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE INDEX ix_map_drawings_map ON map_drawings (map_id, map_drawing_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE INDEX "IX_map_drawings_user_id" ON map_drawings (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE UNIQUE INDEX ix_map_hex_marks_map_hex ON map_hex_marks (map_id, x, y);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    CREATE INDEX "IX_map_hex_marks_user_id" ON map_hex_marks (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261103033731_AddMapPaint') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261103033731_AddMapPaint', '9.0.20');
    END IF;
END $EF$;
COMMIT;

