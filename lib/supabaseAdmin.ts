import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// service_role 키를 쓰는 서버 전용 클라이언트. RLS와 컬럼 권한을 우회하므로
// 절대 클라이언트 컴포넌트에서 import 하지 말 것 (NEXT_PUBLIC_ 접두사 없음 = 번들에 포함 안 됨).
// 모듈 로드 시점에 throw 하면 빌드가 깨지므로 최초 호출 시점에 지연 초기화한다.
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다");
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
