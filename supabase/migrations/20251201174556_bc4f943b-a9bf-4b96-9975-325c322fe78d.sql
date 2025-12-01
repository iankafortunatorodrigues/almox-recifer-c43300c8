-- Remove a constraint antiga que não inclui consumivel
ALTER TABLE materials DROP CONSTRAINT IF EXISTS valid_tipo;