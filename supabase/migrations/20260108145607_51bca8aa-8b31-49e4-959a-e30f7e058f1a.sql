
-- Tabela principal de recebimentos
CREATE TABLE public.recebimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  fornecedor TEXT NOT NULL,
  tipo_recebimento TEXT NOT NULL CHECK (tipo_recebimento IN ('consumiveis', 'materia_prima', 'vendas')),
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  foto_nota_url TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens do recebimento
CREATE TABLE public.recebimento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id UUID NOT NULL REFERENCES public.recebimentos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'UN',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para recebimentos
CREATE POLICY "Usuários podem ver seus próprios recebimentos"
  ON public.recebimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios recebimentos"
  ON public.recebimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios recebimentos"
  ON public.recebimentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios recebimentos"
  ON public.recebimentos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para itens de recebimento
CREATE POLICY "Usuários podem ver itens dos seus recebimentos"
  ON public.recebimento_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.recebimentos r
    WHERE r.id = recebimento_itens.recebimento_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir itens nos seus recebimentos"
  ON public.recebimento_itens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recebimentos r
    WHERE r.id = recebimento_itens.recebimento_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar itens dos seus recebimentos"
  ON public.recebimento_itens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.recebimentos r
    WHERE r.id = recebimento_itens.recebimento_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar itens dos seus recebimentos"
  ON public.recebimento_itens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.recebimentos r
    WHERE r.id = recebimento_itens.recebimento_id AND r.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_recebimentos_updated_at
  BEFORE UPDATE ON public.recebimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para fotos de notas fiscais
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notas-fiscais', 'notas-fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para notas fiscais
CREATE POLICY "Usuários podem ver suas próprias notas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem fazer upload de suas notas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar suas próprias notas"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);
