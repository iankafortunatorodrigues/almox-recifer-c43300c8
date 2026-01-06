-- Add estoque_seguranca column to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS estoque_seguranca integer DEFAULT NULL;