-- ============================================================================
-- schedule_absences 읽기 정책 추가 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 문제: 참여불가 버튼을 누르면 서버는 200 OK를 반환하고 DB에도 행이 정상
--       생성되는데, 화면에는 아무 변화가 없었다.
--
--   원인: 이 테이블에 RLS가 켜져 있는데 SELECT 정책이 하나도 없다.
--         GRANT SELECT는 줬지만 RLS가 우선이라 anon 조회 결과가 항상 빈 배열.
--         쓰기는 service_role(RLS 우회)로 하니 성공, 읽기는 anon이라 실패 →
--         에러 없이 조용히 아무것도 안 보이는 형태로 나타났다.
--
--   확인 방법: 같은 행을 service_role로 읽으면 나오고 anon으로 읽으면 [] 이면 RLS.
--
-- 해결: 전체 읽기 허용 정책만 추가한다.
--       쓰기 정책은 만들지 않으므로 브라우저에서 직접 쓰는 것은 계속 차단되고,
--       서버 라우트(service_role)는 RLS를 우회하므로 그대로 동작한다.
-- ============================================================================

ALTER TABLE public.schedule_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_absences_select_all ON public.schedule_absences;

CREATE POLICY schedule_absences_select_all
  ON public.schedule_absences
  FOR SELECT
  USING (true);


-- ----------------------------------------------------------------------------
-- 확인 — 아래가 1행 이상이면 정책이 걸린 것
-- ----------------------------------------------------------------------------
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'schedule_absences';
