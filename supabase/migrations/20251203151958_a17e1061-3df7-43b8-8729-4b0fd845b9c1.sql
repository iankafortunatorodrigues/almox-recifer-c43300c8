-- Adicionar função para verificar se é compras
CREATE OR REPLACE FUNCTION public.is_compras(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'compras')
$$;

-- Política para compras ver TODOS os materiais de estoque
CREATE POLICY "Compras podem ver materiais de estoque"
ON public.materials
FOR SELECT
TO authenticated
USING (
  tipo = 'estoque' AND public.is_compras(auth.uid())
);

-- Política para compras atualizar apenas status_compra de materiais de estoque
CREATE POLICY "Compras podem atualizar status de compra"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  tipo = 'estoque' AND public.is_compras(auth.uid())
)
WITH CHECK (
  tipo = 'estoque' AND public.is_compras(auth.uid())
);