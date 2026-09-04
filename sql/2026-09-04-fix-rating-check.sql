-- ============================================================================
-- 리뷰 평점 제약 수정 (2026-09-04)
-- Supabase SQL Editor에서 실행할 것.
--
-- 문제: 앱은 10점 만점으로 바뀌었는데 DB의 CHECK 제약은 5점 만점 그대로였다.
--       리뷰 작성 폼의 기본 평점이 7이라 사실상 모든 리뷰 등록이 실패해 왔다.
--       (reviews 테이블이 0건인 이유)
--
--   실제 에러: 23514 new row for relation "reviews"
--              violates check constraint "reviews_rating_check"
--   확인 결과: rating 1~5는 통과, 6 이상은 거부
--
-- 이 SQL은 코드 배포와 무관하게 언제 실행해도 안전하다.
-- ============================================================================

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 10);


-- ----------------------------------------------------------------------------
-- 확인용 — 아래 결과에 (rating >= 1) AND (rating <= 10) 이 보여야 정상
-- ----------------------------------------------------------------------------
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.reviews'::regclass AND contype = 'c';
