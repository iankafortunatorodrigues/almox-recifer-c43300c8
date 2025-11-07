-- Adicionar role almoxarife ao enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'almoxarife' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'almoxarife';
  END IF;
END $$;

-- Adicionar campos de compra na tabela materials
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS data_compra timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_entrega timestamp with time zone;