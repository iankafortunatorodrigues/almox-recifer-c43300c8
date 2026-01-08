-- Criar tabela para registrar alterações de senha
CREATE TABLE public.password_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_nome TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_changes ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os registros
CREATE POLICY "Admins podem ver alterações de senha"
ON public.password_changes
FOR SELECT
USING (is_admin(auth.uid()));

-- Usuários podem inserir seus próprios registros
CREATE POLICY "Usuários podem registrar alteração de senha"
ON public.password_changes
FOR INSERT
WITH CHECK (auth.uid() = user_id);