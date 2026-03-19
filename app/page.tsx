export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">w_lab</h1>
        <p className="text-lg text-gray-600 mb-8">
          Supabase + Vercel + Next.js 프로젝트
        </p>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">시작하기</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Next.js 15 설정 완료</li>
            <li>✓ Tailwind CSS 설정 완료</li>
            <li>✓ TypeScript 설정 완료</li>
            <li>→ Supabase 연결 대기 중</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
