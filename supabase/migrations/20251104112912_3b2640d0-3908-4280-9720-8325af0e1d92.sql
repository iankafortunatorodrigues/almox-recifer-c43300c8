-- Adicionar campo obsoleto aos materiais
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS obsoleto BOOLEAN DEFAULT false;

-- Atualizar constraint de status_compra para incluir "em_cotacao"
ALTER TABLE public.materials
DROP CONSTRAINT IF EXISTS materials_status_compra_check;

ALTER TABLE public.materials
ADD CONSTRAINT materials_status_compra_check
CHECK (status_compra IN ('pendente', 'em_cotacao', 'comprado'));