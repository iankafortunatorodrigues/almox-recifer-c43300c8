-- Habilitar realtime para a tabela materials
ALTER TABLE materials REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE materials;