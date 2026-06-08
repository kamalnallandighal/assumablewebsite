-- Required extensions.
--   postgis  : spatial queries for the map bbox filter
--   pgcrypto : gen_random_uuid() for primary keys

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
