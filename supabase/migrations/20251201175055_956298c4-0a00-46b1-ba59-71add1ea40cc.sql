-- Habilitar realtime para a tabela movimentacoes
ALTER TABLE movimentacoes REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes;