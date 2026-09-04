-- ============================================================================
-- delete_user_cascade 타입 불일치 수정 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 문제: 회원 탈퇴 시 42883 "operator does not exist: text = uuid" 발생.
--       아래 4개 컬럼이 uuid가 아니라 text로 만들어져 있어서,
--       uuid 파라미터와 직접 비교할 수 없었다.
--
--         whiskeys.created_by      text
--         notifications.user_id    text
--         inquiries.user_id        text
--         announcements.author_id  text
--
--       나머지 테이블(reviews, articles, bars, schedules, 각종 댓글·좋아요)은
--       모두 uuid라 정상이었다.
--
-- 해결: 해당 비교에만 p_user_id::text 캐스팅을 적용한다.
--       (컬럼 타입 자체를 uuid로 바꾸는 것은 데이터 마이그레이션이라 별도 작업)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- text로 선언된 컬럼과 비교할 때 사용
  v_uid_text text := p_user_id::text;
BEGIN
  -- 이 유저가 등록한 위스키에 달린 리뷰(작성자 무관)와 그 하위 데이터
  -- whiskeys.created_by 는 text
  DELETE FROM review_likes WHERE review_id IN (
    SELECT id FROM reviews WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = v_uid_text)
  );
  DELETE FROM review_comments WHERE review_id IN (
    SELECT id FROM reviews WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = v_uid_text)
  );
  DELETE FROM reviews         WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = v_uid_text);
  DELETE FROM user_collection WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = v_uid_text);

  -- 이 유저가 쓴 리뷰의 하위 데이터
  DELETE FROM review_likes    WHERE review_id IN (SELECT id FROM reviews WHERE user_id = p_user_id);
  DELETE FROM review_comments WHERE review_id IN (SELECT id FROM reviews WHERE user_id = p_user_id);

  -- 이 유저가 쓴 지식글의 하위 데이터
  DELETE FROM article_likes WHERE article_id IN (SELECT id FROM articles WHERE author_id = p_user_id);
  DELETE FROM comments      WHERE article_id IN (SELECT id FROM articles WHERE author_id = p_user_id);

  -- 이 유저가 등록한 Bar의 하위 데이터
  DELETE FROM bar_comments  WHERE bar_id IN (SELECT id FROM bars WHERE user_id = p_user_id);
  DELETE FROM bar_favorites WHERE bar_id IN (SELECT id FROM bars WHERE user_id = p_user_id);

  -- 이 유저가 만든 일정의 하위 데이터
  DELETE FROM user_availability WHERE schedule_date_id IN (
    SELECT id FROM schedule_dates WHERE schedule_id IN (SELECT id FROM schedules WHERE created_by = p_user_id)
  );
  DELETE FROM schedule_dates WHERE schedule_id IN (SELECT id FROM schedules WHERE created_by = p_user_id);

  -- 유저 본인이 다른 곳에 남긴 흔적
  DELETE FROM review_likes      WHERE user_id = p_user_id;
  DELETE FROM article_likes     WHERE user_id = p_user_id;
  DELETE FROM bar_favorites     WHERE user_id = p_user_id;
  DELETE FROM review_comments   WHERE user_id = p_user_id;
  DELETE FROM bar_comments      WHERE user_id = p_user_id;
  DELETE FROM comments          WHERE user_id = p_user_id;
  DELETE FROM user_availability WHERE user_id = p_user_id;
  DELETE FROM user_collection   WHERE user_id = p_user_id;
  DELETE FROM notifications     WHERE user_id = v_uid_text;   -- text
  DELETE FROM inquiries         WHERE user_id = v_uid_text;   -- text

  -- 유저가 소유한 콘텐츠
  DELETE FROM reviews       WHERE user_id    = p_user_id;
  DELETE FROM articles      WHERE author_id  = p_user_id;
  DELETE FROM bars          WHERE user_id    = p_user_id;
  DELETE FROM schedules     WHERE created_by = p_user_id;
  DELETE FROM whiskeys      WHERE created_by = v_uid_text;    -- text
  DELETE FROM announcements WHERE author_id  = v_uid_text;    -- text

  -- 계정
  DELETE FROM users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO service_role;


-- ----------------------------------------------------------------------------
-- 참고: 위 4개 컬럼이 text인 것은 근본적으로 스키마 문제다.
--   - users를 참조하는 FK 제약이 걸려 있지 않을 가능성이 높다
--     (= 유저가 사라져도 고아 행이 남을 수 있다)
--   - 조인 시 매번 캐스팅이 필요하다
-- 나중에 uuid로 정리하려면 아래 형태가 되지만, 기존 값 검증이 먼저 필요하므로
-- 이번 수정과 분리해서 진행할 것.
--
--   ALTER TABLE public.notifications
--     ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
-- ----------------------------------------------------------------------------
