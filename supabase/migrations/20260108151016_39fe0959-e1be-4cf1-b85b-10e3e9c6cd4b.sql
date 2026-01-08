-- Remover política que permite diretores verem dados de contato de fornecedores
DROP POLICY IF EXISTS "Compras e Admin podem ver fornecedores" ON public.suppliers;

-- Criar nova política mais restritiva: apenas Compras e Admin podem ver fornecedores
CREATE POLICY "Compras e Admin podem ver fornecedores"
  ON public.suppliers FOR SELECT
  USING (is_compras(auth.uid()) OR is_admin(auth.uid()));