-- Criar enum para status de pedido de compra
CREATE TYPE public.purchase_status AS ENUM ('pedido', 'cotacao', 'aprovacao', 'comprado', 'cancelado');

-- Criar enum para urgência
CREATE TYPE public.purchase_urgency AS ENUM ('baixa', 'normal', 'alta', 'critica');

-- Tabela principal de pedidos de compra
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aprovador_id UUID REFERENCES auth.users(id),
  status purchase_status NOT NULL DEFAULT 'pedido',
  urgencia purchase_urgency NOT NULL DEFAULT 'normal',
  centro_custo TEXT NOT NULL,
  observacao TEXT,
  justificativa TEXT,
  data_necessidade DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'UN',
  valor_estimado NUMERIC(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cotações
CREATE TABLE public.purchase_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  arquivo_url TEXT,
  observacao TEXT,
  selecionada BOOLEAN DEFAULT FALSE,
  validade DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de ações
CREATE TABLE public.purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- Função para verificar se é diretor
CREATE OR REPLACE FUNCTION public.is_diretor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'diretor')
$$;

-- Políticas para purchase_orders
CREATE POLICY "Usuários podem ver seus próprios pedidos"
ON public.purchase_orders FOR SELECT
USING (auth.uid() = solicitante_id);

CREATE POLICY "Compras podem ver todos os pedidos"
ON public.purchase_orders FOR SELECT
USING (is_compras(auth.uid()));

CREATE POLICY "Diretores podem ver todos os pedidos"
ON public.purchase_orders FOR SELECT
USING (is_diretor(auth.uid()));

CREATE POLICY "Admins podem ver todos os pedidos"
ON public.purchase_orders FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Usuários autenticados podem criar pedidos"
ON public.purchase_orders FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Compras podem atualizar pedidos"
ON public.purchase_orders FOR UPDATE
USING (is_compras(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Diretores podem aprovar pedidos"
ON public.purchase_orders FOR UPDATE
USING (is_diretor(auth.uid()) AND status = 'aprovacao');

CREATE POLICY "Solicitantes podem cancelar seus pedidos"
ON public.purchase_orders FOR UPDATE
USING (auth.uid() = solicitante_id AND status = 'pedido');

-- Políticas para purchase_items
CREATE POLICY "Usuários podem ver itens dos seus pedidos"
ON public.purchase_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = pedido_id 
    AND (po.solicitante_id = auth.uid() OR is_compras(auth.uid()) OR is_diretor(auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Usuários podem criar itens nos seus pedidos"
ON public.purchase_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = pedido_id AND po.solicitante_id = auth.uid()
  )
);

CREATE POLICY "Compras podem gerenciar itens"
ON public.purchase_items FOR ALL
USING (is_compras(auth.uid()) OR is_admin(auth.uid()));

-- Políticas para purchase_quotations
CREATE POLICY "Usuários podem ver cotações dos seus pedidos"
ON public.purchase_quotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = pedido_id 
    AND (po.solicitante_id = auth.uid() OR is_compras(auth.uid()) OR is_diretor(auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Compras podem gerenciar cotações"
ON public.purchase_quotations FOR ALL
USING (is_compras(auth.uid()) OR is_admin(auth.uid()));

-- Políticas para purchase_history
CREATE POLICY "Usuários podem ver histórico dos seus pedidos"
ON public.purchase_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = pedido_id 
    AND (po.solicitante_id = auth.uid() OR is_compras(auth.uid()) OR is_diretor(auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Sistema pode criar histórico"
ON public.purchase_history FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.purchase_orders
  WHERE numero_pedido LIKE year_prefix || '-%';
  
  NEW.numero_pedido := year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$;

-- Trigger para gerar número automaticamente
CREATE TRIGGER generate_purchase_number_trigger
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.numero_pedido IS NULL OR NEW.numero_pedido = '')
EXECUTE FUNCTION public.generate_purchase_number();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para anexos de cotações
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase-attachments', 'purchase-attachments', false);

-- Políticas de storage
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'purchase-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Compras podem deletar anexos"
ON storage.objects FOR DELETE
USING (bucket_id = 'purchase-attachments' AND (is_compras(auth.uid()) OR is_admin(auth.uid())));