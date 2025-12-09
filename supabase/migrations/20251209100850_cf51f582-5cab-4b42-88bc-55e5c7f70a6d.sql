-- Atualizar política para compras ver apenas materiais críticos (estoque abaixo do mínimo)
DROP POLICY IF EXISTS "Compras podem ver materiais de estoque " ON public.materials;

CREATE POLICY "Compras podem ver materiais críticos"
ON public.materials
FOR SELECT
TO authenticated
USING (
  tipo = 'estoque' 
  AND is_compras(auth.uid()) 
  AND quantidade_atual < estoque_minimo
  AND (obsoleto IS NULL OR obsoleto = false)
);