-- bracket_matches を Supabase Realtime の publication に追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bracket_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bracket_matches;
  END IF;
END $$;
