
-- Atualizar trigger para ignorar validação de estoque para consumíveis
CREATE OR REPLACE FUNCTION public.validate_and_process_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_stock INTEGER;
  stock_change INTEGER;
  material_type TEXT;
BEGIN
  -- Obter estoque atual e tipo do material com bloqueio (previne race conditions)
  SELECT quantidade_atual, tipo INTO current_stock, material_type
  FROM materials
  WHERE id = NEW.material_id AND user_id = NEW.user_id
  FOR UPDATE;

  -- Se material não encontrado
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Material não encontrado ou sem permissão';
  END IF;

  -- Calcular mudança no estoque baseado no tipo de movimentação
  CASE NEW.tipo
    WHEN 'entrada', 'devolucao' THEN
      stock_change := NEW.quantidade;
    WHEN 'saida', 'emprestimo' THEN
      stock_change := -NEW.quantidade;
    ELSE
      RAISE EXCEPTION 'Tipo de movimentação inválido';
  END CASE;

  -- Validar se há estoque suficiente para saídas/empréstimos
  -- IGNORAR validação para materiais consumíveis (quantidade infinita)
  IF material_type != 'consumivel' AND stock_change < 0 AND (current_stock + stock_change) < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantidade;
  END IF;

  -- Atualizar estoque do material (para consumíveis, permite ficar negativo)
  UPDATE materials
  SET 
    quantidade_atual = quantidade_atual + stock_change,
    updated_at = NOW()
  WHERE id = NEW.material_id AND user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;
