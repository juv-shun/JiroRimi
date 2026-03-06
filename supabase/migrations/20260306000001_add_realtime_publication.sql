-- matches と match_participants を Supabase Realtime の publication に追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
  END IF;
END $$;
