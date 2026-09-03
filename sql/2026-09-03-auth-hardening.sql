-- ============================================================================
-- 인증 하드닝 마이그레이션 (2026-09-03)
-- Supabase SQL Editor에서 실행할 것.
--
-- 전제: 이 SQL을 실행하기 전에 아래 두 환경변수가 Vercel과 .env.local에 등록되어
--       있고, 서버 Route Handler(app/api/*)가 배포된 상태여야 한다.
--         - SUPABASE_SERVICE_ROLE_KEY
--         - SESSION_SECRET
--       순서를 지키지 않으면 로그인이 일시적으로 동작하지 않는다.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) 비밀번호 해시 노출 차단
--    지금까지 anon 롤이 users.password_hash를 읽을 수 있었기 때문에,
--    로그인하지 않은 사람도 REST API 한 번으로 전 회원의 bcrypt 해시를 받아갈 수 있었다.
--
--    주의: `REVOKE SELECT (password_hash) ...` 는 동작하지 않는다.
--    PostgreSQL은 테이블 단위 SELECT 권한이 있으면 컬럼 단위 REVOKE를 무시한다
--    (테이블 권한이 모든 컬럼을 덮기 때문). Supabase는 기본적으로 anon/authenticated에
--    테이블 단위 권한을 부여하므로, 테이블 SELECT를 먼저 회수하고 허용할 컬럼만 다시 줘야 한다.
--
--    컬럼 목록은 스키마에서 직접 읽어 password_hash만 제외한다.
--    → 나중에 컬럼을 추가하면 anon이 못 읽으므로 이 블록을 다시 실행할 것.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'users'
     AND column_name <> 'password_hash';

  IF cols IS NULL THEN
    RAISE EXCEPTION 'public.users 테이블을 찾을 수 없습니다';
  END IF;

  EXECUTE 'REVOKE SELECT ON public.users FROM anon, authenticated';
  -- 이전에 컬럼 단위로 부여된 권한이 남아 있을 수 있으므로 명시적으로 한 번 더 회수
  EXECUTE 'REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.users TO anon, authenticated', cols);

  RAISE NOTICE '허용된 컬럼: %', cols;
END $$;


-- ----------------------------------------------------------------------------
-- 2) 회원 정보 쓰기 권한 회수
--    브라우저 콘솔에서 supabase.from("users").update({is_admin:true}) 를 직접
--    호출해 스스로 관리자가 되는 것을 막는다.
--    회원가입·프로필 수정·권한 변경·탈퇴는 모두 service_role을 쓰는 서버 라우트로 이동했다.
--
--    주의: 최근 접속 시각(last_seen_at) 갱신도 이 REVOKE에 걸린다.
--    AppSidebar가 브라우저에서 직접 update 하던 것을 /api/account/heartbeat 로 옮겼으므로,
--    반드시 그 코드가 배포된 뒤에 이 SQL을 실행할 것. 순서가 바뀌면 최근 접속일이 갱신되지 않는다.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.users FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3) 회원 탈퇴를 한 트랜잭션으로 처리하는 함수
--    기존에는 클라이언트가 테이블별로 개별 delete를 날리고 Promise.allSettled로
--    결과를 무시했기 때문에, 중간에 실패하면 리뷰·지식글만 사라지고 계정은 남는
--    반쪽 삭제가 발생했다. 함수 안에서 처리하면 전부 성공하거나 전부 롤백된다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 이 유저가 등록한 위스키에 달린 리뷰(작성자 무관)와 그 하위 데이터
  DELETE FROM review_likes WHERE review_id IN (
    SELECT id FROM reviews WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = p_user_id)
  );
  DELETE FROM review_comments WHERE review_id IN (
    SELECT id FROM reviews WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = p_user_id)
  );
  DELETE FROM reviews        WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = p_user_id);
  DELETE FROM user_collection WHERE whiskey_id IN (SELECT id FROM whiskeys WHERE created_by = p_user_id);

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
  DELETE FROM notifications     WHERE user_id = p_user_id;
  DELETE FROM inquiries         WHERE user_id = p_user_id;

  -- 유저가 소유한 콘텐츠
  DELETE FROM reviews       WHERE user_id    = p_user_id;
  DELETE FROM articles      WHERE author_id  = p_user_id;
  DELETE FROM bars          WHERE user_id    = p_user_id;
  DELETE FROM schedules     WHERE created_by = p_user_id;
  DELETE FROM whiskeys      WHERE created_by = p_user_id;
  DELETE FROM announcements WHERE author_id  = p_user_id;

  -- 계정
  DELETE FROM users WHERE id = p_user_id;
END;
$$;

-- 이 함수는 서버(service_role)에서만 호출할 수 있어야 한다.
REVOKE ALL ON FUNCTION public.delete_user_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO service_role;


-- ----------------------------------------------------------------------------
-- 4) 아바타 스토리지 쓰기 권한 회수 (선택)
--    아바타 업로드도 서버 라우트로 옮겨서 경로를 세션 userId로 강제하므로,
--    브라우저가 avatars 버킷에 직접 쓸 수 있는 정책이 있다면 제거한다.
--    아래는 Storage > Policies 화면에서 확인 후 실제 정책 이름으로 바꿔 실행할 것.
--
--    DROP POLICY "<브라우저 업로드를 허용하던 정책 이름>" ON storage.objects;
--
--    읽기(SELECT) 정책은 공개 프로필 이미지 표시에 필요하므로 남겨둔다.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 확인용 쿼리 — 1)이 제대로 적용됐는지 검증
--   password_hash 행이 결과에 없어야 정상.
-- ----------------------------------------------------------------------------
-- SELECT grantee, privilege_type, column_name
-- FROM information_schema.column_privileges
-- WHERE table_name = 'users' AND column_name = 'password_hash';
