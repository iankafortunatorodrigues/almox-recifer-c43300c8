-- Create helper function for financeiro role
CREATE OR REPLACE FUNCTION public.is_financeiro(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'financeiro')
$$;

-- Update RLS policies for recebimentos to allow financeiro full access
DROP POLICY IF EXISTS "Users can view own recebimentos" ON public.recebimentos;
DROP POLICY IF EXISTS "Users can insert own recebimentos" ON public.recebimentos;
DROP POLICY IF EXISTS "Users can update own recebimentos" ON public.recebimentos;
DROP POLICY IF EXISTS "Users can delete own recebimentos" ON public.recebimentos;

-- Financeiro and admin can do everything on recebimentos
CREATE POLICY "Users can view recebimentos" ON public.recebimentos
FOR SELECT USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid()) 
  OR public.is_financeiro(auth.uid())
  OR public.is_almoxarife(auth.uid())
);

CREATE POLICY "Users can insert recebimentos" ON public.recebimentos
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid()) 
  OR public.is_financeiro(auth.uid())
  OR public.is_almoxarife(auth.uid())
);

CREATE POLICY "Users can update recebimentos" ON public.recebimentos
FOR UPDATE USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid()) 
  OR public.is_financeiro(auth.uid())
);

CREATE POLICY "Users can delete recebimentos" ON public.recebimentos
FOR DELETE USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid()) 
  OR public.is_financeiro(auth.uid())
);

-- Same for recebimento_itens
DROP POLICY IF EXISTS "Users can view own recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can insert own recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can update own recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can delete own recebimento_itens" ON public.recebimento_itens;

CREATE POLICY "Users can view recebimento_itens" ON public.recebimento_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos r 
    WHERE r.id = recebimento_itens.recebimento_id 
    AND (r.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()) OR public.is_almoxarife(auth.uid()))
  )
);

CREATE POLICY "Users can insert recebimento_itens" ON public.recebimento_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recebimentos r 
    WHERE r.id = recebimento_itens.recebimento_id 
    AND (r.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()) OR public.is_almoxarife(auth.uid()))
  )
);

CREATE POLICY "Users can update recebimento_itens" ON public.recebimento_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos r 
    WHERE r.id = recebimento_itens.recebimento_id 
    AND (r.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()))
  )
);

CREATE POLICY "Users can delete recebimento_itens" ON public.recebimento_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos r 
    WHERE r.id = recebimento_itens.recebimento_id 
    AND (r.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()))
  )
);