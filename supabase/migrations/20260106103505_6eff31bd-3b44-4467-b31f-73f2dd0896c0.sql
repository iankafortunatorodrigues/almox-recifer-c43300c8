-- Criar tabela de fornecedores
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  categoria TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Compras e Admin podem gerenciar fornecedores
CREATE POLICY "Compras e Admin podem ver fornecedores"
ON public.suppliers
FOR SELECT
USING (is_compras(auth.uid()) OR is_admin(auth.uid()) OR is_diretor(auth.uid()));

CREATE POLICY "Compras e Admin podem criar fornecedores"
ON public.suppliers
FOR INSERT
WITH CHECK (is_compras(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Compras e Admin podem atualizar fornecedores"
ON public.suppliers
FOR UPDATE
USING (is_compras(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Compras e Admin podem deletar fornecedores"
ON public.suppliers
FOR DELETE
USING (is_compras(auth.uid()) OR is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna supplier_id na tabela purchase_quotations para referência
ALTER TABLE public.purchase_quotations 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);