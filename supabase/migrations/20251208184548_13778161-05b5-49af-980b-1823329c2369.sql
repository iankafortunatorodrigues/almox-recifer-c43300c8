-- Corrigir a view removendo SECURITY DEFINER (usar SECURITY INVOKER que é o padrão)
DROP VIEW IF EXISTS public.user_profile_view;

CREATE VIEW public.user_profile_view 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.nome,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.id = auth.uid();