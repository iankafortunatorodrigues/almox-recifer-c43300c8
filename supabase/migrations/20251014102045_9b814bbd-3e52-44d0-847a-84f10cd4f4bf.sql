-- =====================================================
-- MIGRATION: Adicionar validações e constraints de segurança
-- =====================================================

-- 1. Adicionar constraints de validação na tabela materials
ALTER TABLE public.materials
ADD CONSTRAINT codigo_length CHECK (char_length(codigo) > 0 AND char_length(codigo) <= 50),
ADD CONSTRAINT descricao_length CHECK (char_length(descricao) > 0 AND char_length(descricao) <= 200),
ADD CONSTRAINT localizacao_length CHECK (char_length(localizacao) > 0 AND char_length(localizacao) <= 100),
ADD CONSTRAINT categoria_length CHECK (categoria IS NULL OR (char_length(categoria) > 0 AND char_length(categoria) <= 50)),
ADD CONSTRAINT positive_quantidade CHECK (quantidade_atual >= 0),
ADD CONSTRAINT positive_estoque_min CHECK (estoque_minimo >= 0),
ADD CONSTRAINT positive_estoque_max CHECK (estoque_maximo IS NULL OR estoque_maximo >= 0),
ADD CONSTRAINT positive_valor CHECK (valor_unitario IS NULL OR valor_unitario >= 0),
ADD CONSTRAINT valid_estoque_range CHECK (estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo),
ADD CONSTRAINT valid_tipo CHECK (tipo IN ('estoque', 'emprestimo'));

-- 2. Adicionar constraints de validação na tabela movimentacoes
ALTER TABLE public.movimentacoes
ADD CONSTRAINT positive_quantity CHECK (quantidade > 0),
ADD CONSTRAINT valid_tipo CHECK (tipo IN ('entrada', 'saida', 'emprestimo', 'devolucao')),
ADD CONSTRAINT responsavel_length CHECK (char_length(responsavel) > 0 AND char_length(responsavel) <= 100),
ADD CONSTRAINT observacao_length CHECK (observacao IS NULL OR char_length(observacao) <= 500);

-- 3. Criar função para validar movimentações e atualizar estoque atomicamente
CREATE OR REPLACE FUNCTION public.validate_and_process_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  stock_change INTEGER;
BEGIN
  -- Obter estoque atual com bloqueio (previne race conditions)
  SELECT quantidade_atual INTO current_stock
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
  IF stock_change < 0 AND (current_stock + stock_change) < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantidade;
  END IF;

  -- Atualizar estoque do material
  UPDATE materials
  SET 
    quantidade_atual = quantidade_atual + stock_change,
    updated_at = NOW()
  WHERE id = NEW.material_id AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- 4. Criar trigger para validar movimentações
DROP TRIGGER IF EXISTS validate_movement_trigger ON public.movimentacoes;
CREATE TRIGGER validate_movement_trigger
  BEFORE INSERT ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_process_movement();

-- 5. Criar função para reverter movimentação ao deletar
CREATE OR REPLACE FUNCTION public.reverse_movement_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stock_change INTEGER;
BEGIN
  -- Calcular reversão da mudança no estoque
  CASE OLD.tipo
    WHEN 'entrada', 'devolucao' THEN
      stock_change := -OLD.quantidade;
    WHEN 'saida', 'emprestimo' THEN
      stock_change := OLD.quantidade;
    ELSE
      stock_change := 0;
  END CASE;

  -- Atualizar estoque do material (reverter a movimentação)
  UPDATE materials
  SET 
    quantidade_atual = quantidade_atual + stock_change,
    updated_at = NOW()
  WHERE id = OLD.material_id AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

-- 6. Criar trigger para reverter ao deletar movimentação
DROP TRIGGER IF EXISTS reverse_movement_trigger ON public.movimentacoes;
CREATE TRIGGER reverse_movement_trigger
  BEFORE DELETE ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_movement_on_delete();

-- 7. Criar função para validar atualização de movimentação
CREATE OR REPLACE FUNCTION public.validate_movement_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  old_stock_change INTEGER;
  new_stock_change INTEGER;
  net_change INTEGER;
BEGIN
  -- Obter estoque atual com bloqueio
  SELECT quantidade_atual INTO current_stock
  FROM materials
  WHERE id = NEW.material_id AND user_id = NEW.user_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Material não encontrado ou sem permissão';
  END IF;

  -- Calcular mudança antiga no estoque
  CASE OLD.tipo
    WHEN 'entrada', 'devolucao' THEN
      old_stock_change := OLD.quantidade;
    WHEN 'saida', 'emprestimo' THEN
      old_stock_change := -OLD.quantidade;
  END CASE;

  -- Calcular nova mudança no estoque
  CASE NEW.tipo
    WHEN 'entrada', 'devolucao' THEN
      new_stock_change := NEW.quantidade;
    WHEN 'saida', 'emprestimo' THEN
      new_stock_change := -NEW.quantidade;
  END CASE;

  -- Calcular mudança líquida
  net_change := new_stock_change - old_stock_change;

  -- Validar se há estoque suficiente
  IF (current_stock + net_change) < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para esta alteração. Disponível: %, Mudança: %', current_stock, net_change;
  END IF;

  -- Atualizar estoque
  UPDATE materials
  SET 
    quantidade_atual = quantidade_atual + net_change,
    updated_at = NOW()
  WHERE id = NEW.material_id AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- 8. Criar trigger para validar atualizações
DROP TRIGGER IF EXISTS validate_movement_update_trigger ON public.movimentacoes;
CREATE TRIGGER validate_movement_update_trigger
  BEFORE UPDATE ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_movement_update();