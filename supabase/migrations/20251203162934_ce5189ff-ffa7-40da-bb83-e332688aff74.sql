-- Recriar políticas como PERMISSIVAS para compras

-- Remover políticas antigas
DROP POLICY IF EXISTS "Compras podem ver materiais de estoque" ON public.materials;
DROP POLICY IF EXISTS "Compras podem atualizar status de compra" ON public.materials;

-- Criar políticas PERMISSIVAS para compras
CREATE POLICY "Compras podem ver materiais de estoque" 
ON public.materials 
FOR SELECT 
TO authenticated
USING ((tipo = 'estoque') AND is_compras(auth.uid()));

CREATE POLICY "Compras podem atualizar status de compra" 
ON public.materials 
FOR UPDATE 
TO authenticated
USING ((tipo = 'estoque') AND is_compras(auth.uid()))
WITH CHECK ((tipo = 'estoque') AND is_compras(auth.uid()));