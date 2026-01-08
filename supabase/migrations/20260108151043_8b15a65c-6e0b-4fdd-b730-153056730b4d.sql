-- Remover política muito permissiva
DROP POLICY IF EXISTS "Qualquer um pode criar solicitações" ON public.access_requests;

-- A política "Usuários autenticados podem criar solicitações" já existe e é mais restritiva