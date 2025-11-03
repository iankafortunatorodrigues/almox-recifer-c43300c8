-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'compras', 'diretor');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Policies para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar todas as roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Adicionar campo de status de compra aos materiais
ALTER TABLE public.materials
ADD COLUMN status_compra TEXT DEFAULT 'pendente' CHECK (status_compra IN ('pendente', 'comprado'));

-- Adicionar campo de foto_url às movimentações
ALTER TABLE public.movimentacoes
ADD COLUMN foto_url TEXT;

-- Atualizar trigger para copiar foto_url do material para movimentação
CREATE OR REPLACE FUNCTION public.copy_material_photo_to_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Copiar foto_url do material para a movimentação
  SELECT foto_url INTO NEW.foto_url
  FROM materials
  WHERE id = NEW.material_id AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER copy_photo_before_movement_insert
BEFORE INSERT ON public.movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.copy_material_photo_to_movement();