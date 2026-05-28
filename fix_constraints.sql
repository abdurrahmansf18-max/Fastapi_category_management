-- Fix content body min length constraint: 120 → 10 in all schemas
-- Also fix DDL.sql CHECK constraint for new tenant provisioning

DO $$
DECLARE
  schemaname text;
BEGIN
  FOR schemaname IN
    SELECT nspname FROM pg_namespace
    WHERE nspname = 'public' OR nspname LIKE 'tenant_%'
    ORDER BY nspname
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I.content DROP CONSTRAINT IF EXISTS content_body_min_len_ck', schemaname);
      EXECUTE format('ALTER TABLE %I.content ADD CONSTRAINT content_body_min_len_ck CHECK (char_length(btrim(body)) >= 10)', schemaname);
      RAISE NOTICE 'Fixed constraint in schema: %', schemaname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error in schema %: %', schemaname, SQLERRM;
    END;
  END LOOP;
END;
$$;
