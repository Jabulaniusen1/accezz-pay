CREATE OR REPLACE FUNCTION public.adjust_ticket_inventory(
    p_ticket_type_id UUID,
    p_quantity_delta INTEGER
)
RETURNS ticket_types AS $$
DECLARE
    updated_ticket ticket_types;
BEGIN
    UPDATE public.ticket_types
    SET
        quantity_available = quantity_available - p_quantity_delta,
        updated_at = NOW()
    WHERE id = p_ticket_type_id
      AND (p_quantity_delta <= 0 OR quantity_available >= p_quantity_delta)
    RETURNING * INTO updated_ticket;

    IF updated_ticket IS NULL THEN
        RAISE EXCEPTION 'Not enough inventory for ticket type %', p_ticket_type_id USING ERRCODE = 'P0001';
    END IF;

    RETURN updated_ticket;
END;
$$ LANGUAGE plpgsql VOLATILE;

