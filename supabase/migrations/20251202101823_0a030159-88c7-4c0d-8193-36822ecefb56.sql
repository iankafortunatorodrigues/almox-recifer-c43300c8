-- Garantir que apenas materiais de estoque podem ter status_compra
-- Atualizar materiais existentes que não são estoque para remover status_compra
UPDATE materials 
SET status_compra = NULL 
WHERE tipo != 'estoque';

-- Criar função para validar que apenas estoque pode ter status_compra
CREATE OR REPLACE FUNCTION validate_status_compra_only_for_estoque()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não for estoque e tiver status_compra, remover o status
  IF NEW.tipo != 'estoque' AND NEW.status_compra IS NOT NULL THEN
    NEW.status_compra := NULL;
  END IF;
  
  -- Se for estoque e não tiver status_compra, definir como pendente
  IF NEW.tipo = 'estoque' AND NEW.status_compra IS NULL THEN
    NEW.status_compra := 'pendente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar status_compra em INSERT e UPDATE
DROP TRIGGER IF EXISTS validate_status_compra_trigger ON materials;
CREATE TRIGGER validate_status_compra_trigger
  BEFORE INSERT OR UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_compra_only_for_estoque();

-- Garantir que ianka_caroline@hotmail.com seja admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles
WHERE email = 'ianka_caroline@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir que suprimentos@recifer.com tenha role de compras
INSERT INTO user_roles (user_id, role)
SELECT id, 'compras'::app_role
FROM profiles
WHERE email = 'suprimentos@recifer.com'
ON CONFLICT (user_id, role) DO NOTHING;