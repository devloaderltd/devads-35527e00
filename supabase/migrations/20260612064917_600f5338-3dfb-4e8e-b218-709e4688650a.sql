ALTER TABLE public.listings
  ADD CONSTRAINT listings_title_length_chk
    CHECK (char_length(btrim(title)) BETWEEN 3 AND 140) NOT VALID,
  ADD CONSTRAINT listings_description_length_chk
    CHECK (char_length(btrim(description)) BETWEEN 10 AND 8000) NOT VALID,
  ADD CONSTRAINT listings_item_age_chk
    CHECK (item_age ~ '^\d{2}$' AND item_age::int BETWEEN 18 AND 99) NOT VALID,
  ADD CONSTRAINT listings_phone_chk
    CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-]{7,32}$') NOT VALID,
  ADD CONSTRAINT listings_whatsapp_chk
    CHECK (whatsapp IS NULL OR whatsapp ~ '^\+?[0-9\s\-]{7,32}$') NOT VALID;