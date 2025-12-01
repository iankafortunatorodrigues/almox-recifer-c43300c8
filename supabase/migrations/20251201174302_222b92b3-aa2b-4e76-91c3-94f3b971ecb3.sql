-- Drop the old constraint that doesn't include consumivel
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_tipo_check;

-- Add new constraint that includes all three types
ALTER TABLE materials ADD CONSTRAINT materials_tipo_check 
CHECK (tipo = ANY (ARRAY['estoque'::text, 'emprestimo'::text, 'consumivel'::text]));