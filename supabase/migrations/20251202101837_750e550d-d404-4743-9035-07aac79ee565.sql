-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION validate_status_compra_only_for_estoque()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;