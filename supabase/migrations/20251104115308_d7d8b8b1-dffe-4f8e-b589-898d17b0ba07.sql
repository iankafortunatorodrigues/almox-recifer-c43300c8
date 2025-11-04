-- Criar tabela de solicitações de acesso
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  requested_role app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as solicitações
CREATE POLICY "Admins podem ver todas as solicitações"
ON public.access_requests
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins podem atualizar solicitações
CREATE POLICY "Admins podem atualizar solicitações"
ON public.access_requests
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Qualquer usuário autenticado pode criar solicitação
CREATE POLICY "Usuários podem criar solicitações"
ON public.access_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);