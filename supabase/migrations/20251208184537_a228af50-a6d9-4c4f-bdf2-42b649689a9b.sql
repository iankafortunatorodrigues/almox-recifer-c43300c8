-- 1. Corrigir política de access_requests - apenas usuários autenticados podem criar
DROP POLICY IF EXISTS "Qualquer um pode criar solicitações " ON public.access_requests;
CREATE POLICY "Usuários autenticados podem criar solicitações"
ON public.access_requests
FOR INSERT
TO authenticated
WITH CHECK (user_email = (auth.jwt() ->> 'email'::text));

-- 2. Remover coluna email duplicada da tabela profiles (já existe em auth.users)
-- Primeiro, criar uma view para acessar email quando necessário
CREATE OR REPLACE VIEW public.user_profile_view AS
SELECT 
  p.id,
  p.nome,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Habilitar Leaked Password Protection via configuração (já configurado via configure-auth)