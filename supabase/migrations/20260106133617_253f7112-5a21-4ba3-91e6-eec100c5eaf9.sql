
-- Função para auto-atribuir admin ao email específico
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o email for ianka_caroline@hotmail.com, atribuir role admin
  IF NEW.email = 'ianka_caroline@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para auto-atribuir admin ao criar perfil
DROP TRIGGER IF EXISTS on_profile_created_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_created_assign_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_role();

-- Atribuir admin se o usuário já existir
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'ianka_caroline@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
