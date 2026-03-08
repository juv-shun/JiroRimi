-- matches.status から waiting を廃止し、
-- チーム編成確定と試合開始を単一トランザクションで実行する

UPDATE public.matches
SET status = 'in_progress'
WHERE status = 'waiting';

ALTER TABLE public.matches
  ALTER COLUMN status SET DEFAULT 'in_progress';

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_status_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('in_progress', 'confirmed'));

COMMENT ON COLUMN public.matches.status IS 'マッチステータス: in_progress, confirmed';

CREATE OR REPLACE FUNCTION public.create_round_matches_and_start(
  p_event_id uuid,
  p_matches jsonb
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_event_status text;
  v_next_round int;
  v_existing_match_count int;
  v_match jsonb;
  v_team_a_profile_ids uuid[];
  v_team_b_profile_ids uuid[];
  v_request_profile_ids uuid[] := '{}'::uuid[];
  v_checked_in_profile_ids uuid[];
  v_inserted_match_id uuid;
BEGIN
  IF p_matches IS NULL
     OR jsonb_typeof(p_matches) <> 'array'
     OR jsonb_array_length(p_matches) = 0 THEN
    RAISE EXCEPTION 'リクエスト形式が不正です';
  END IF;

  SELECT status
  INTO v_event_status
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'イベントが見つかりません';
  END IF;

  IF v_event_status <> 'in_progress' THEN
    RAISE EXCEPTION 'イベントが進行中ではありません';
  END IF;

  SELECT COALESCE(MAX(round_number), 0) + 1
  INTO v_next_round
  FROM public.matches
  WHERE event_id = p_event_id;

  SELECT COUNT(*)
  INTO v_existing_match_count
  FROM public.matches
  WHERE event_id = p_event_id
    AND round_number = v_next_round;

  IF v_existing_match_count > 0 THEN
    RAISE EXCEPTION 'このラウンドは既に編成済みです';
  END IF;

  FOR v_match IN
    SELECT value
    FROM jsonb_array_elements(p_matches)
  LOOP
    IF jsonb_typeof(v_match) <> 'object' THEN
      RAISE EXCEPTION 'リクエスト形式が不正です';
    END IF;

    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinality), '{}'::uuid[])
    INTO v_team_a_profile_ids
    FROM jsonb_array_elements_text(v_match->'team_a_profile_ids') WITH ORDINALITY;

    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinality), '{}'::uuid[])
    INTO v_team_b_profile_ids
    FROM jsonb_array_elements_text(v_match->'team_b_profile_ids') WITH ORDINALITY;

    IF array_length(v_team_a_profile_ids, 1) <> 5
       OR array_length(v_team_b_profile_ids, 1) <> 5 THEN
      RAISE EXCEPTION 'リクエスト形式が不正です';
    END IF;

    v_request_profile_ids :=
      v_request_profile_ids || v_team_a_profile_ids || v_team_b_profile_ids;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_request_profile_ids) AS pid
    GROUP BY pid
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION '参加者の重複があります';
  END IF;

  SELECT COALESCE(array_agg(profile_id ORDER BY profile_id), '{}'::uuid[])
  INTO v_checked_in_profile_ids
  FROM public.entries
  WHERE event_id = p_event_id
    AND checked_in_at IS NOT NULL;

  IF cardinality(v_checked_in_profile_ids) <> cardinality(v_request_profile_ids) THEN
    RAISE EXCEPTION '参加者リストが一致しません';
  END IF;

  IF EXISTS (
    (SELECT DISTINCT pid FROM unnest(v_request_profile_ids) AS pid)
    EXCEPT
    (SELECT pid FROM unnest(v_checked_in_profile_ids) AS pid)
  ) OR EXISTS (
    (SELECT DISTINCT pid FROM unnest(v_checked_in_profile_ids) AS pid)
    EXCEPT
    (SELECT pid FROM unnest(v_request_profile_ids) AS pid)
  ) THEN
    RAISE EXCEPTION '参加者リストが一致しません';
  END IF;

  FOR v_match IN
    SELECT value
    FROM jsonb_array_elements(p_matches)
  LOOP
    SELECT array_agg(value::uuid ORDER BY ordinality)
    INTO v_team_a_profile_ids
    FROM jsonb_array_elements_text(v_match->'team_a_profile_ids') WITH ORDINALITY;

    SELECT array_agg(value::uuid ORDER BY ordinality)
    INTO v_team_b_profile_ids
    FROM jsonb_array_elements_text(v_match->'team_b_profile_ids') WITH ORDINALITY;

    INSERT INTO public.matches (event_id, round_number, status)
    VALUES (p_event_id, v_next_round, 'in_progress')
    RETURNING id INTO v_inserted_match_id;

    INSERT INTO public.match_participants (match_id, profile_id, team)
    SELECT v_inserted_match_id, profile_id, 'team_a'
    FROM unnest(v_team_a_profile_ids) AS profile_id;

    INSERT INTO public.match_participants (match_id, profile_id, team)
    SELECT v_inserted_match_id, profile_id, 'team_b'
    FROM unnest(v_team_b_profile_ids) AS profile_id;
  END LOOP;

  RETURN v_next_round;
END;
$$;
