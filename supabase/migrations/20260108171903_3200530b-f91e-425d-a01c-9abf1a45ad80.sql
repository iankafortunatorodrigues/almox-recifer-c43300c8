-- Tornar o bucket notas-fiscais público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'notas-fiscais';