-- ============================================================================
-- 고아 알림 정리 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 배경: notifications.user_id 가 uuid가 아니라 text라서 users에 대한 FK 제약이
--       없다. 과거 회원 탈퇴 시 클라이언트가 notifications를 지우지 않아
--       삭제된 유저의 알림이 그대로 남아 있다.
--
--   검사 결과(2026-09-04): 존재하지 않는 유저 1명분의 알림 7건 잔존.
--   inquiries / announcements / whiskeys 는 고아 없음.
--
-- 지금은 delete_user_cascade가 알림까지 지우므로 새로 생기지는 않는다.
-- 이 SQL은 과거에 쌓인 것만 정리한다.
-- ============================================================================

-- 삭제 전 확인 — 몇 건인지 먼저 보고 싶다면 이것부터 실행
-- SELECT count(*) AS orphan_count
-- FROM public.notifications n
-- WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = n.user_id);

DELETE FROM public.notifications n
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id::text = n.user_id
);

-- 실행 후 0이어야 정상
-- SELECT count(*) FROM public.notifications n
-- WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = n.user_id);
