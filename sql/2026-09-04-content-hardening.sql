-- ============================================================================
-- 콘텐츠 쓰기 권한 회수 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 전제: app/api/content/[resource] 라우트가 배포된 뒤에 실행해야 한다.
--       먼저 실행하면 리뷰·지식글·Bar 작성이 즉시 막힌다.
--
-- 배경: 지금까지 anon 롤이 콘텐츠 테이블에 직접 INSERT/UPDATE/DELETE 할 수 있었다.
--       브라우저 콘솔에서 남의 리뷰를 지우거나, user_id를 바꿔치기해 다른 사람
--       이름으로 글을 쓰는 것이 가능했다.
--       이제 모든 쓰기가 서버 라우트를 거치며, 서버가 세션 쿠키로 소유자를 검증한다.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) 콘텐츠 테이블 쓰기 권한 회수
--    읽기(SELECT)는 그대로 둔다 — 목록·상세 조회는 계속 브라우저에서 직접 한다.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.reviews          FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.review_comments  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.articles         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.comments         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.bars             FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.bar_comments     FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.whiskeys         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.schedules        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.announcements    FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2) 확인용 쿼리
--    아래 결과가 0행이어야 정상. (SELECT는 남아 있어야 하므로 제외하고 조회)
-- ----------------------------------------------------------------------------
-- SELECT table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated')
--   AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
--   AND table_name IN ('reviews','review_comments','articles','comments','bars',
--                      'bar_comments','whiskeys','schedules','announcements')
-- ORDER BY table_name, grantee, privilege_type;


-- ----------------------------------------------------------------------------
-- 이번 범위에서 제외한 것 (의도적)
--   review_likes, article_likes, bar_favorites  — 좋아요·즐겨찾기
--   user_collection                             — 개인 컬렉션
--   user_availability, schedule_dates           — 일정 투표
--   notifications                               — 알림
--   encyclopedia                                — 모든 유저가 편집하는 공용 데이터
--
--   전부 자기 자신 범위이거나 되돌리기 쉬운 데이터라, 남의 콘텐츠를 파괴하거나
--   작성자를 위조하는 것과는 위험도가 다르다. 나중에 닫으려면 위와 같은 방식으로
--   REVOKE 하고 해당 쓰기를 서버 라우트로 옮기면 된다.
-- ----------------------------------------------------------------------------
