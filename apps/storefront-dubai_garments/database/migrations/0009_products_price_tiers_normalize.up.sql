-- Normalize product price_tiers keys so pricing engine can read deterministic fields.
-- Adds canonical keys to each tier object while preserving original keys.
UPDATE products p
SET price_tiers = normalized.tiers
FROM (
  SELECT
    p2.id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem ||
            jsonb_build_object(
              'min_qty', COALESCE(elem->'min_qty', elem->'minQty'),
              'max_qty', COALESCE(elem->'max_qty', elem->'maxQty'),
              'unit_price', COALESCE(elem->'unit_price', elem->'unitPrice', elem->'unitPriceAED')
            )
          ELSE elem
        END
      ),
      '[]'::jsonb
    ) AS tiers
  FROM products p2
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(p2.price_tiers, '[]'::jsonb)) elem ON TRUE
  GROUP BY p2.id
) AS normalized
WHERE p.id = normalized.id;
