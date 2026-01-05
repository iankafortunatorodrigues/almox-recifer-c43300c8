-- Drop and recreate the trigger function with better logic
CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.purchase_orders
  WHERE numero_pedido ~ ('^' || year_prefix || '-[0-9]+$');
  
  NEW.numero_pedido := year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$;

-- Make numero_pedido have a default value for the insert to work
ALTER TABLE public.purchase_orders ALTER COLUMN numero_pedido SET DEFAULT '';