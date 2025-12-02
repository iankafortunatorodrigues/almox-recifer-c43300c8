-- Drop política existente
DROP POLICY IF EXISTS "Usuários podem criar solicitações" ON public.access_requests;

-- Criar nova política que permite qualquer um criar solicitações
-- (necessário para que usuários sem acesso possam solicitar)
CREATE POLICY "Qualquer um pode criar solicitações" 
ON public.access_requests 
FOR INSERT 
WITH CHECK (true);

-- Garantir que apenas o próprio usuário possa ver suas solicitações
DROP POLICY IF EXISTS "Usuários podem ver suas solicitações" ON public.access_requests;

CREATE POLICY "Usuários podem ver suas próprias solicitações" 
ON public.access_requests 
FOR SELECT 
USING (user_email = auth.jwt()->>'email' OR is_admin(auth.uid()));