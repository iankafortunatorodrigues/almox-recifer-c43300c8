-- Criar função para verificar se é almoxarife
CREATE OR REPLACE FUNCTION public.is_almoxarife(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'almoxarife')
$function$;

-- Criar função para verificar se é compras
CREATE OR REPLACE FUNCTION public.is_compras(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'compras')
$function$;