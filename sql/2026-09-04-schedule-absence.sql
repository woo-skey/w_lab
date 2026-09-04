-- ============================================================================
-- 일정 참여 불가 표시 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 배경: 지금은 "아직 투표 안 함"과 "참석 못 함"이 구분되지 않는다.
--       투표 현황이 "3명 완료 / 전체 8명"이면 나머지 5명을 계속 기다려야 하는지,
--       이미 못 온다고 한 사람인지 알 수 없다.
--
-- 이 SQL은 코드 배포 전에 실행해도 안전하다 (새 테이블이라 기존 기능에 영향 없음).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_absences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, user_id)
);

CREATE INDEX IF NOT EXISTS schedule_absences_schedule_id_idx
  ON public.schedule_absences (schedule_id);

-- 읽기는 브라우저에서 직접 (투표 현황 표시에 필요)
GRANT SELECT ON public.schedule_absences TO anon, authenticated;

-- 쓰기는 서버 라우트(/api/schedule/absence)만 — 남의 참석 여부를 조작할 수 없게 한다
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES
  ON public.schedule_absences FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 확인용 — 아래가 0행이어야 정상
-- ----------------------------------------------------------------------------
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'schedule_absences'
--   AND grantee IN ('anon','authenticated')
--   AND privilege_type IN ('INSERT','UPDATE','DELETE');

-- 회원 탈퇴(delete_user_cascade)와 일정 삭제는 위 ON DELETE CASCADE로 자동 정리되므로
-- 기존 함수를 수정할 필요는 없다.
